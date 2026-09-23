import 'server-only'
import { ddb, TABLE, QueryCommand, ScanCommand } from '@/lib/db/dynamodb'
import type { InstructionAttendance } from '@/lib/db/schema/instruction-attendance'
import { describeToday, limaTimeStr, type TodaySession } from './horario'
import { GEOFENCE_RADIUS_M } from './geo'
import { GRADE_LABEL, type Grade } from '@/lib/cgbvp/grades'

export interface MiAsistenciaData {
  today: TodaySession
  yaRegistroHoy: boolean
  registroHoy: InstructionAttendance | null
  records: InstructionAttendance[]     // desc por fecha
  resumen: { obligatorios: number; tardanzas: number; apoyos: number; total: number }
}

/** Asistencia de un postulante/aspirante (su propio historial + estado de hoy). */
export async function getMiAsistencia(profileId: string): Promise<MiAsistenciaData> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE.instructionAttendance,
    KeyConditionExpression: 'profileId = :p',
    ExpressionAttributeValues: { ':p': profileId },
    ScanIndexForward: false,
  }))
  const records = (res.Items ?? []) as InstructionAttendance[]
  records.sort((a, b) => b.date.localeCompare(a.date))
  const today = describeToday()
  const registroHoy = records.find(r => r.date === today.dateStr) ?? null

  const obligatorios = records.filter(r => r.dayType === 'obligatorio').length
  const tardanzas = records.filter(r => r.status === 'tardanza').length
  const apoyos = records.filter(r => r.dayType === 'apoyo').length

  return {
    today,
    yaRegistroHoy: !!registroHoy,
    registroHoy,
    records,
    resumen: { obligatorios, tardanzas, apoyos, total: records.length },
  }
}

/** Resumen de asistencia por perfil (para el workspace de Instrucción). */
export interface AsistenciaResumen {
  obligatoriosAsistidos: number   // sesiones obligatorias a las que asistió
  tardanzas: number
  apoyos: number
  sesionesRealizadas: number       // sesiones obligatorias que ocurrieron (alguien registró)
  pct: number | null               // % de asistencia a obligatorios
  nota: number | null              // 0-20 derivado del %
}

/** Un registro observado por Instrucción no cuenta como asistencia. */
export function cuentaParaNota(r: InstructionAttendance): boolean {
  return r.reviewStatus !== 'observada'
}

function build(all: InstructionAttendance[], sesionesRealizadas: number): AsistenciaResumen {
  const records = all.filter(cuentaParaNota)
  const obligatorios = records.filter(r => r.dayType === 'obligatorio')
  const obligatoriosAsistidos = obligatorios.length
  const tardanzas = records.filter(r => r.status === 'tardanza').length
  const apoyos = records.filter(r => r.dayType === 'apoyo').length
  const pct = sesionesRealizadas > 0
    ? Math.min(100, Math.round((obligatoriosAsistidos / sesionesRealizadas) * 1000) / 10)
    : null
  const nota = pct === null ? null : Math.round((pct / 100) * 20 * 100) / 100
  return { obligatoriosAsistidos, tardanzas, apoyos, sesionesRealizadas, pct, nota }
}

/**
 * Mapa profileId → resumen de asistencia. Una sesión obligatoria "ocurrió" si al
 * menos un postulante/aspirante registró asistencia ese día — esto absorbe
 * automáticamente las sesiones canceladas o reprogramadas por el instructor.
 */
export async function getAsistenciaResumenMap(): Promise<Record<string, AsistenciaResumen>> {
  const res = await ddb.send(new ScanCommand({ TableName: TABLE.instructionAttendance }))
  const all = (res.Items ?? []) as InstructionAttendance[]

  // Fechas obligatorias distintas en las que hubo al menos un registro.
  const sesionesObligatorias = new Set<string>()
  for (const r of all) if (r.dayType === 'obligatorio' && cuentaParaNota(r)) sesionesObligatorias.add(r.date)
  const sesionesRealizadas = sesionesObligatorias.size

  const byProfile: Record<string, InstructionAttendance[]> = {}
  for (const r of all) (byProfile[r.profileId] ??= []).push(r)

  const map: Record<string, AsistenciaResumen> = {}
  for (const [pid, recs] of Object.entries(byProfile)) {
    map[pid] = build(recs, sesionesRealizadas)
  }
  return map
}

/* ────────────────────────────────────────────────────────────────────────────
 * Revisión de asistencias (área de Instrucción)
 * ────────────────────────────────────────────────────────────────────────── */

export interface RevisionRegistro extends InstructionAttendance {
  fullName: string
  grade: string
  gradeLabel: string
  /** Hora de registro en formato HH:MM (Lima). */
  horaRegistro: string
  review: 'pendiente' | 'validada' | 'observada'
}

export interface RevisionSesion {
  date: string                       // YYYY-MM-DD
  dayType: 'obligatorio' | 'apoyo'
  sessionLabel: string
  registros: RevisionRegistro[]
  pendientes: number
  observadas: number
  tardanzas: number
  sinEvidencia: number
  fueraDeRango: number
}

export interface RevisionAsistenciaData {
  sesiones: RevisionSesion[]         // desc por fecha
  totalRegistros: number
  totalPendientes: number
  totalObservadas: number
  radioM: number
}

/** Todas las asistencias agrupadas por sesión, con el nombre del efectivo. */
export async function getRevisionAsistencias(): Promise<RevisionAsistenciaData> {
  const [asisRes, profRes] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: TABLE.instructionAttendance })),
    ddb.send(new ScanCommand({
      TableName: TABLE.profiles,
      ProjectionExpression: 'profileId, fullName, grade',
    })),
  ])

  const perfil: Record<string, { fullName: string; grade: string }> = {}
  for (const p of (profRes.Items ?? []) as any[]) {
    perfil[p.profileId] = { fullName: p.fullName ?? '—', grade: p.grade ?? '' }
  }

  const registros = (asisRes.Items ?? []) as InstructionAttendance[]
  const byDate: Record<string, RevisionRegistro[]> = {}

  for (const r of registros) {
    const p = perfil[r.profileId]
    const enriched: RevisionRegistro = {
      ...r,
      fullName: p?.fullName ?? 'Perfil eliminado',
      grade: p?.grade ?? '',
      gradeLabel: GRADE_LABEL[(p?.grade ?? '') as Grade] ?? p?.grade ?? '',
      horaRegistro: limaTimeStr(new Date(r.registeredAt)),
      review: r.reviewStatus ?? 'pendiente',
    }
    ;(byDate[r.date] ??= []).push(enriched)
  }

  const sesiones: RevisionSesion[] = Object.entries(byDate)
    .map(([date, regs]) => {
      regs.sort((a, b) => a.registeredAt.localeCompare(b.registeredAt))
      const first = regs[0]
      return {
        date,
        dayType: first.dayType,
        sessionLabel: first.sessionLabel,
        registros: regs,
        pendientes: regs.filter(r => r.review === 'pendiente').length,
        observadas: regs.filter(r => r.review === 'observada').length,
        tardanzas: regs.filter(r => r.status === 'tardanza').length,
        sinEvidencia: regs.filter(r => !r.selfieKey).length,
        fueraDeRango: regs.filter(r => typeof r.distanceM === 'number' && r.distanceM > GEOFENCE_RADIUS_M).length,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  return {
    sesiones,
    totalRegistros: registros.length,
    totalPendientes: sesiones.reduce((n, s) => n + s.pendientes, 0),
    totalObservadas: sesiones.reduce((n, s) => n + s.observadas, 0),
    radioM: GEOFENCE_RADIUS_M,
  }
}
