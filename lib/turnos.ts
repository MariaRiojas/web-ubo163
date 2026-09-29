/**
 * Turnos de servicio de la compañía (hora de Lima, UTC-5 fijo).
 *
 * Fuente única de verdad: la cadencia del checklist de unidades está
 * sincronizada con los turnos de pilotos (docs/ARQUITECTURA_MENU.md §3.2):
 * se hace un checklist completo al ingreso de cada turno.
 *
 * OJO con la hora: en Lambda el reloj del proceso es UTC, así que `getHours()`
 * devuelve la hora equivocada para Perú. Acá siempre se convierte a Lima antes
 * de decidir el turno.
 */

const LIMA_OFFSET_H = 5

export const TURNOS = ['manana', 'tarde', 'noche'] as const
export type TurnoKey = (typeof TURNOS)[number]

export const TURNO_LABEL: Record<TurnoKey, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  noche: 'Noche',
}

export const TURNO_RANGO: Record<TurnoKey, string> = {
  manana: '07:00 – 15:00',
  tarde: '15:00 – 23:00',
  noche: '23:00 – 07:00',
}

/** Hora de inicio de cada turno (hora de Lima). */
const INICIO: Record<TurnoKey, number> = { manana: 7, tarde: 15, noche: 23 }

export interface TurnoInfo {
  turno: TurnoKey
  /** Fecha (YYYY-MM-DD) en que ARRANCÓ el turno: el nocturno cruza medianoche. */
  fecha: string
  label: string
  rango: string
  /** Clave de la inspección: `${fecha}#${turno}`. */
  periodo: string
  /** Minutos que faltan para que termine el turno. */
  restanteMin: number
  restanteLabel: string
}

/** Clave compuesta de una inspección (unidad + este valor identifican el checklist). */
export function periodoKey(fecha: string, turno: TurnoKey): string {
  return `${fecha}#${turno}`
}

function limaDate(now: Date): Date {
  return new Date(now.getTime() - LIMA_OFFSET_H * 3600_000)
}

function fechaDe(lima: Date): string {
  return lima.toISOString().slice(0, 10)
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Turno vigente ahora mismo, en hora de Lima. */
export function detectarTurno(now: Date = new Date()): TurnoInfo {
  const lima = limaDate(now)
  const h = lima.getUTCHours()
  const hoy = fechaDe(lima)

  let turno: TurnoKey
  let fecha: string
  if (h >= 7 && h < 15) {
    turno = 'manana'; fecha = hoy
  } else if (h >= 15 && h < 23) {
    turno = 'tarde'; fecha = hoy
  } else {
    turno = 'noche'
    // De 00:00 a 06:59 seguimos en el turno que empezó AYER a las 23:00.
    fecha = h < 7 ? sumarDias(hoy, -1) : hoy
  }

  // Fin del turno, en ms UTC reales.
  const finHoraLima = turno === 'manana' ? 15 : turno === 'tarde' ? 23 : 7
  const finFecha = turno === 'noche' ? sumarDias(fecha, 1) : fecha
  const [y, m, d] = finFecha.split('-').map(Number)
  const finUtcMs = Date.UTC(y, m - 1, d, finHoraLima) + LIMA_OFFSET_H * 3600_000

  const restanteMin = Math.max(0, Math.round((finUtcMs - now.getTime()) / 60000))
  const hh = Math.floor(restanteMin / 60)
  const mm = restanteMin % 60

  return {
    turno,
    fecha,
    label: TURNO_LABEL[turno],
    rango: TURNO_RANGO[turno],
    periodo: periodoKey(fecha, turno),
    restanteMin,
    restanteLabel: `${hh} h ${String(mm).padStart(2, '0')} m`,
  }
}

/** Los tres turnos de una fecha, en orden, para mostrar el cumplimiento del día. */
export function turnosDeLaFecha(fecha: string): { turno: TurnoKey; periodo: string; label: string; rango: string }[] {
  return TURNOS.map(t => ({
    turno: t,
    periodo: periodoKey(fecha, t),
    label: TURNO_LABEL[t],
    rango: TURNO_RANGO[t],
  }))
}

/** ¿Ese turno ya empezó (o pasó) respecto de ahora? Sirve para no exigir turnos futuros. */
export function turnoYaEmpezo(fecha: string, turno: TurnoKey, now: Date = new Date()): boolean {
  const [y, m, d] = fecha.split('-').map(Number)
  const inicioUtcMs = Date.UTC(y, m - 1, d, INICIO[turno]) + LIMA_OFFSET_H * 3600_000
  return now.getTime() >= inicioUtcMs
}
