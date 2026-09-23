import 'server-only'
import { ddb, TABLE, ScanCommand } from '@/lib/db/dynamodb'
import type { Activity, ActivityView } from '@/lib/db/schema/activities'
import { SCHEDULE, limaDateStr } from '@/lib/instruccion/horario'

/* ────────────────────────────────────────────────────────────────────────────
 * Utilidades de fecha (todo en YYYY-MM-DD, hora de Lima)
 * ────────────────────────────────────────────────────────────────────────── */

function diasEntre(desde: string, hasta: string): string[] {
  const out: string[] = []
  const cur = new Date(desde + 'T12:00:00Z')
  const fin = new Date(hasta + 'T12:00:00Z')
  while (cur <= fin) {
    out.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Primer y último día del mes (1-12). */
export function rangoMes(anio: number, mes: number): { desde: string; hasta: string } {
  const p = (n: number) => String(n).padStart(2, '0')
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
  return { desde: `${anio}-${p(mes)}-01`, hasta: `${anio}-${p(mes)}-${p(ultimo)}` }
}

function pad(n: number) { return String(n).padStart(2, '0') }

/* ────────────────────────────────────────────────────────────────────────────
 * Fuentes derivadas — actividades que el sistema ya conoce
 * ────────────────────────────────────────────────────────────────────────── */

/** Cumpleaños del personal activo, a partir de birthDate. */
async function cumpleanos(desde: string, hasta: string): Promise<ActivityView[]> {
  const { Items } = await ddb.send(new ScanCommand({
    TableName: TABLE.profiles,
    ProjectionExpression: 'profileId, fullName, birthDate, grade, #s',
    ExpressionAttributeNames: { '#s': 'status' },
  }))

  const dias = new Set(diasEntre(desde, hasta).map(d => d.slice(5)))  // MM-DD
  const out: ActivityView[] = []

  for (const p of (Items ?? []) as any[]) {
    if (!p.birthDate || p.status === 'retirado') continue
    const md = String(p.birthDate).slice(5, 10)
    if (!dias.has(md)) continue

    // El año lo toma del rango consultado (soporta rangos que cruzan diciembre).
    for (const dia of diasEntre(desde, hasta)) {
      if (dia.slice(5) !== md) continue
      const nombre = String(p.fullName ?? '')
      const corto = nombre.includes(',')
        ? `${nombre.split(',')[1].trim()} ${nombre.split(',')[0].trim()}`
        : nombre
      out.push({
        id: `bday-${p.profileId}-${dia}`,
        title: `Cumpleaños de ${corto}`,
        type: 'cumpleanos',
        date: dia,
        status: 'programada',
        editable: false,
        origen: 'cumpleanos',
      })
    }
  }
  return out
}

/** Instrucción semanal: martes y jueves por la noche, domingo por la mañana. */
function instruccion(desde: string, hasta: string): ActivityView[] {
  const out: ActivityView[] = []
  for (const dia of diasEntre(desde, hasta)) {
    const wd = new Date(dia + 'T12:00:00Z').getUTCDay()
    const s = SCHEDULE[wd]
    if (!s) continue
    out.push({
      id: `instr-${dia}`,
      title: `Instrucción — ${s.label}`,
      type: 'instruccion',
      date: dia,
      startTime: `${pad(s.startHour)}:${pad(s.startMin)}`,
      endTime: `${pad(s.endHour)}:${pad(s.endMin)}`,
      location: 'Compañía',
      status: 'programada',
      editable: false,
      origen: 'instruccion',
    })
  }
  return out
}

/** Cierre de la convocatoria de admisión activa. */
async function convocatoria(desde: string, hasta: string): Promise<ActivityView[]> {
  const { Items } = await ddb.send(new ScanCommand({ TableName: TABLE.trainingCohorts }))
  const out: ActivityView[] = []
  for (const c of (Items ?? []) as any[]) {
    if (c.status !== 'activa' || !c.endDate) continue
    const dia = String(c.endDate).slice(0, 10)
    if (dia < desde || dia > hasta) continue
    out.push({
      id: `conv-${c.cohortId}`,
      title: `Cierre de convocatoria — ${c.name ?? 'Admisión'}`,
      type: 'otro',
      date: dia,
      status: 'programada',
      editable: false,
      origen: 'convocatoria',
    })
  }
  return out
}

/* ────────────────────────────────────────────────────────────────────────────
 * Consulta principal
 * ────────────────────────────────────────────────────────────────────────── */

function ordenar(a: ActivityView, b: ActivityView): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date)
  const ha = a.startTime ?? '00:00'
  const hb = b.startTime ?? '00:00'
  if (ha !== hb) return ha.localeCompare(hb)
  return a.title.localeCompare(b.title)
}

/** Actividades (guardadas + derivadas) dentro de un rango de fechas. */
export async function getActividadesRango(desde: string, hasta: string): Promise<ActivityView[]> {
  const [guardadasRes, cumples, conv] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: TABLE.activities })),
    cumpleanos(desde, hasta),
    convocatoria(desde, hasta),
  ])

  const nombres = await nombresDe(
    ((guardadasRes.Items ?? []) as Activity[])
      .map(a => a.representanteProfileId)
      .filter(Boolean) as string[],
  )

  const guardadas: ActivityView[] = ((guardadasRes.Items ?? []) as Activity[])
    .filter(a => {
      const fin = a.endDate ?? a.date
      return fin >= desde && a.date <= hasta     // solapa el rango
    })
    .map(a => ({
      id: a.activityId,
      title: a.title,
      type: a.type,
      date: a.date,
      endDate: a.endDate,
      startTime: a.startTime,
      endTime: a.endTime,
      entidad: a.entidad,
      location: a.location,
      description: a.description,
      requiereRepresentante: a.requiereRepresentante,
      requiereEscolta: a.requiereEscolta,
      escoltaCantidad: a.escoltaCantidad,
      representanteNombre: a.representanteProfileId ? nombres[a.representanteProfileId] : undefined,
      sectionId: a.sectionId,
      status: a.status,
      isPinned: a.isPinned,
      editable: true,
      origen: 'manual' as const,
    }))

  return [...guardadas, ...cumples, ...instruccion(desde, hasta), ...conv].sort(ordenar)
}

async function nombresDe(profileIds: string[]): Promise<Record<string, string>> {
  if (profileIds.length === 0) return {}
  const { Items } = await ddb.send(new ScanCommand({
    TableName: TABLE.profiles,
    ProjectionExpression: 'profileId, fullName',
  }))
  const map: Record<string, string> = {}
  for (const p of (Items ?? []) as any[]) map[p.profileId] = p.fullName
  return map
}

export interface ActividadesMes {
  anio: number
  mes: number
  actividades: ActivityView[]
  proximas: ActivityView[]
  hoy: string
}

/** Vista de un mes + las próximas dos semanas (lo que evita que se pasen). */
export async function getActividadesMes(anio: number, mes: number): Promise<ActividadesMes> {
  const hoy = limaDateStr()
  const { desde, hasta } = rangoMes(anio, mes)

  // El rango cubre el mes pedido y, si es el mes actual, las próximas 2 semanas
  // aunque caigan en el mes siguiente.
  const hastaAmpliado = hasta > sumarDias(hoy, 14) ? hasta : sumarDias(hoy, 14)
  const todas = await getActividadesRango(desde < hoy ? desde : desde, hastaAmpliado)

  return {
    anio,
    mes,
    actividades: todas.filter(a => a.date >= desde && a.date <= hasta),
    proximas: todas
      .filter(a => a.date >= hoy && a.date <= sumarDias(hoy, 14) && a.type !== 'cumpleanos')
      .slice(0, 12),
    hoy,
  }
}

/** Próximas actividades para el dashboard (incluye cumpleaños). */
export async function getProximasActividades(dias = 7): Promise<ActivityView[]> {
  const hoy = limaDateStr()
  const todas = await getActividadesRango(hoy, sumarDias(hoy, dias))
  return todas.filter(a => a.date >= hoy).slice(0, 8)
}
