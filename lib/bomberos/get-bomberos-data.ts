import 'server-only'
import { ddb, TABLE, ScanCommand, QueryCommand, GetCommand } from '@/lib/db/dynamodb'
import type { Profile } from '@/lib/db/schema/profiles'
import type { CgbvpAttendance } from '@/lib/db/schema/cgbvp'
import type { Emergency } from '@/lib/db/schema/emergencies'
import { GRADE_ABBR } from '@/lib/cgbvp/grades'
import { computeNdrEstado, trimestreDe, type NdrEstado } from '@/lib/cgbvp/ndr'

// ─────────────────────────────────────────────────────────────────────────
// Página /bomberos (directorio) y /bomberos/[id] (ficha individual)
//
// Reemplaza el acceso legacy vía Drizzle (db.query.profiles, cgbvpAttendance,
// cgbvpCompanyStatus, cgbvpShiftAttendance) por DynamoDB puro.
//
// Nota sobre "en turno": el viejo schema Drizzle tenía una tabla
// cgbvpShiftAttendance ligada a un snapshot cgbvpCompanyStatus con
// granularidad por bombero. Esa tabla nunca se migró a DynamoDB (ver
// data/seed-operativo.ts: "Tablas omitidas: cgbvpCompanyStatus"). El único
// dato aproximado disponible es el último item de TABLE.cgbvpStatus, que en
// la práctica puede no traer el arreglo de personal. Por eso la detección de
// "en turno" aquí es best-effort: si no hay datos, todos quedan como
// enTurno=false en vez de que la página falle.
// ─────────────────────────────────────────────────────────────────────────

export interface BomberoListEntry {
  id: string
  fullName: string
  grade: string
  gradeLabel: string
  codigoCgbvp: string | null
  dni: string | null
  status: string
  avatarUrl: string | null
  enTurno: boolean
  horas: number
  diasAsistidos: number
  guardias: number
  emergencias: number
  alMando: number
  // Cumplimiento NDR trimestral
  horasTrim: number
  guardiasTrim: number
  ndrEstado: NdrEstado
  ndrRequeridas: number
  ndrDelta: number       // + excedente / − faltante (horas)
}

export interface BomberosListData {
  bomberos: BomberoListEntry[]
  mes: number
  anio: number
  totalActivos: number
  totalEnTurno: number
  totalHoras: number
  totalEmergencias: number
  gradesOptions: string[]
  // Cumplimiento y asistencia del trimestre / mes
  trimestreLabel: string
  trimestreNumero: number
  cumplenNdr: number      // efectivos con requisito que cumplen o exceden
  faltanNdr: number       // efectivos con requisito por debajo del mínimo
  asistieron: number      // efectivos con actividad (horas > 0) en el mes
  porcentajeAsistencia: number
}

async function getEnTurnoProfileIds(): Promise<Set<string>> {
  try {
    const { Items = [] } = await ddb.send(new ScanCommand({ TableName: TABLE.cgbvpStatus }))
    if (Items.length === 0) return new Set()
    const sorted = [...Items].sort((a: any, b: any) =>
      (b.timestamp ?? b.createdAt ?? b.date ?? '').localeCompare(a.timestamp ?? a.createdAt ?? a.date ?? '')
    )
    const latest = sorted[0] as any
    const list: any[] = latest.personal ?? latest.efectivosEnTurno ?? []
    return new Set(
      list
        .filter((p: any) => p.profileId && p.esBombero !== false)
        .map((p: any) => p.profileId as string)
    )
  } catch {
    return new Set()
  }
}

export async function getBomberosListData(mes?: number, anio?: number): Promise<BomberosListData> {
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const targetMes = mes ?? prevMonth.getMonth() + 1
  const targetAnio = anio ?? prevMonth.getFullYear()
  const dateKey = `${targetAnio}-${String(targetMes).padStart(2, '0')}`

  const [profilesRes, attendanceRes, emergenciesRes, enTurnoIds] = await Promise.all([
    ddb.send(new ScanCommand({
      TableName: TABLE.profiles,
      FilterExpression: '#s = :activo',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':activo': 'activo' },
    })),
    ddb.send(new ScanCommand({
      TableName: TABLE.cgbvpAttendance,
      FilterExpression: '#d = :dateKey',
      ExpressionAttributeNames: { '#d': 'date' },
      ExpressionAttributeValues: { ':dateKey': dateKey },
    })),
    ddb.send(new ScanCommand({
      TableName: TABLE.emergencies,
      FilterExpression: 'attribute_exists(alMandoId)',
      ProjectionExpression: 'alMandoId',
    })),
    getEnTurnoProfileIds(),
  ])

  const profiles = (profilesRes.Items ?? []) as Profile[]
  const attendanceItems = (attendanceRes.Items ?? []) as CgbvpAttendance[]
  const attendanceMap = new Map(attendanceItems.map((a) => [a.profileId, a]))

  // ── Acumulado del TRIMESTRE (para el cumplimiento NDR) ──
  const trim = trimestreDe(targetMes)
  const trimKeys = trim.meses.map((m) => `${targetAnio}-${String(m).padStart(2, '0')}`)
  const trimHoras = new Map<string, number>()
  const trimGuardias = new Map<string, number>()
  try {
    const trimRes = await ddb.send(new ScanCommand({
      TableName: TABLE.cgbvpAttendance,
      FilterExpression: '#d IN (:k0, :k1, :k2)',
      ExpressionAttributeNames: { '#d': 'date' },
      ExpressionAttributeValues: { ':k0': trimKeys[0], ':k1': trimKeys[1], ':k2': trimKeys[2] },
    }))
    for (const a of (trimRes.Items ?? []) as CgbvpAttendance[]) {
      trimHoras.set(a.profileId, (trimHoras.get(a.profileId) ?? 0) + (a.horasAcumuladas ?? 0))
      trimGuardias.set(a.profileId, (trimGuardias.get(a.profileId) ?? 0) + (a.diasGuardia ?? 0))
    }
  } catch (err) { console.error('[getBomberosListData] trimestre:', err) }

  const alMandoMap = new Map<string, number>()
  for (const e of (emergenciesRes.Items ?? []) as { alMandoId?: string }[]) {
    if (!e.alMandoId) continue
    alMandoMap.set(e.alMandoId, (alMandoMap.get(e.alMandoId) ?? 0) + 1)
  }

  const bomberos: BomberoListEntry[] = profiles.map((p) => {
    const att = attendanceMap.get(p.profileId)
    const horasTrim = trimHoras.get(p.profileId) ?? 0
    const guardiasTrim = trimGuardias.get(p.profileId) ?? 0
    const ndr = computeNdrEstado(p.grade, horasTrim, guardiasTrim)
    return {
      id: p.profileId,
      fullName: p.fullName,
      grade: p.grade,
      gradeLabel: GRADE_ABBR[p.grade] ?? p.grade,
      codigoCgbvp: p.codigoCgbvp ?? null,
      dni: p.dni ?? null,
      status: p.status,
      avatarUrl: p.avatarUrl ?? null,
      enTurno: enTurnoIds.has(p.profileId),
      horas: att?.horasAcumuladas ?? 0,
      diasAsistidos: att?.diasAsistidos ?? 0,
      guardias: att?.diasGuardia ?? 0,
      emergencias: att?.numEmergencias ?? 0,
      alMando: alMandoMap.get(p.profileId) ?? 0,
      horasTrim,
      guardiasTrim,
      ndrEstado: ndr.estado,
      ndrRequeridas: ndr.requeridas,
      ndrDelta: ndr.deltaHoras,
    }
  })

  const totalActivos = profiles.length
  const totalEnTurno = bomberos.filter((b) => b.enTurno).length
  const totalHoras = bomberos.reduce((s, b) => s + b.horas, 0)
  const totalEmergencias = bomberos.reduce((s, b) => s + b.emergencias, 0)
  const gradesOptions = [...new Set(profiles.map((p) => p.grade))]

  const conRequisito = bomberos.filter((b) => b.ndrEstado !== 'na')
  const cumplenNdr = conRequisito.filter((b) => b.ndrEstado !== 'falta').length
  const faltanNdr = conRequisito.filter((b) => b.ndrEstado === 'falta').length
  const asistieron = bomberos.filter((b) => b.horas > 0).length
  const porcentajeAsistencia = totalActivos > 0 ? Math.round((asistieron / totalActivos) * 100) : 0

  return {
    bomberos,
    mes: targetMes,
    anio: targetAnio,
    totalActivos,
    totalEnTurno,
    totalHoras,
    totalEmergencias,
    gradesOptions,
    trimestreLabel: trim.label,
    trimestreNumero: trim.numero,
    cumplenNdr,
    faltanNdr,
    asistieron,
    porcentajeAsistencia,
  }
}

export interface BomberoProfileEmergency {
  id: string
  numeroParte: string
  tipo: string | null
  estado: string | null
  fechaDespacho: string | null
  direccion: string | null
}

export interface BomberoProfileData {
  profile: Profile
  enTurno: boolean
  vecesAlMando: number
  partesAlMando: BomberoProfileEmergency[]
  attendance: CgbvpAttendance[]
  totalHoras: number
  totalEmergencias: number
}

export async function getBomberoProfileData(profileId: string): Promise<BomberoProfileData | null> {
  // The profile GET and the three aggregate lookups all key off the profileId
  // argument (none depend on the profile record) — issue them together.
  const [profileRes, attendanceRes, emergenciesRes, enTurnoIds] = await Promise.all([
    ddb.send(new GetCommand({
      TableName: TABLE.profiles,
      Key: { profileId },
    })),
    ddb.send(new QueryCommand({
      TableName: TABLE.cgbvpAttendance,
      KeyConditionExpression: 'profileId = :pid',
      ExpressionAttributeValues: { ':pid': profileId },
    })),
    ddb.send(new ScanCommand({
      TableName: TABLE.emergencies,
      FilterExpression: 'alMandoId = :pid',
      ExpressionAttributeValues: { ':pid': profileId },
    })),
    getEnTurnoProfileIds(),
  ])

  if (!profileRes.Item) return null
  const profile = profileRes.Item as Profile

  const attendance = ((attendanceRes.Items ?? []) as CgbvpAttendance[])
    .sort((a, b) => a.date.localeCompare(b.date))

  const emergAll = (emergenciesRes.Items ?? []) as Emergency[]
  emergAll.sort((a, b) => (b.fechaDespacho ?? '').localeCompare(a.fechaDespacho ?? ''))
  const partesAlMando: BomberoProfileEmergency[] = emergAll.map((e) => ({
    id: e.emergencyId,
    numeroParte: e.numeroParte,
    tipo: e.tipoEmergenciaDesc ?? e.tipo ?? null,
    estado: e.estado ?? null,
    fechaDespacho: e.fechaDespacho ?? null,
    direccion: e.direccion ?? null,
  }))

  const totalHoras = Math.round(attendance.reduce((s, a) => s + (a.horasAcumuladas ?? 0), 0) * 10) / 10
  const totalEmergencias = attendance.reduce((s, a) => s + (a.numEmergencias ?? 0), 0)

  return {
    profile,
    enTurno: enTurnoIds.has(profileId),
    vecesAlMando: partesAlMando.length,
    partesAlMando,
    attendance,
    totalHoras,
    totalEmergencias,
  }
}
