/**
 * Horario de instrucción interna de la compañía + lógica de tardanza.
 *
 * Funciones PURAS (sin dependencias de servidor) — la tardanza real la decide el
 * servidor con su reloj; el cliente solo las usa para mostrar el horario.
 *
 * Zona horaria: Perú (Lima) = UTC-5 fijo, sin horario de verano.
 */

const LIMA_OFFSET_H = 5 // UTC-5

/** Tolerancia de tardanza en minutos (configurable). Después de esto → tardanza. */
export const TOLERANCIA_MIN = 15

interface DaySchedule {
  label: string
  startHour: number
  startMin: number
  endHour: number
  endMin: number
}

/** Días de instrucción OBLIGATORIA por número de día de la semana (0=domingo). */
export const SCHEDULE: Record<number, DaySchedule> = {
  0: { label: 'Domingo', startHour: 7, startMin: 0, endHour: 14, endMin: 0 },  // 07:00 – 14:00
  2: { label: 'Martes', startHour: 19, startMin: 30, endHour: 22, endMin: 0 }, // 19:30 – 22:00
  4: { label: 'Jueves', startHour: 19, startMin: 30, endHour: 22, endMin: 0 }, // 19:30 – 22:00
}

/** ¿Cuántos días obligatorios tiene la semana (para el resumen)? */
export const DIAS_OBLIGATORIOS = Object.keys(SCHEDULE).length

/** Fecha (Y-M-D) en hora de Lima. */
export function limaDateStr(now: Date = new Date()): string {
  return new Date(now.getTime() - LIMA_OFFSET_H * 3600_000).toISOString().slice(0, 10)
}

/** Hora:min en hora de Lima, formateada. */
export function limaTimeStr(now: Date = new Date()): string {
  return new Date(now.getTime() - LIMA_OFFSET_H * 3600_000).toISOString().slice(11, 16)
}

export interface TodaySession {
  dateStr: string                 // YYYY-MM-DD (Lima)
  weekday: number                 // 0..6 (Lima)
  dayType: 'obligatorio' | 'apoyo'
  sessionLabel: string            // "Martes", "Jueves", "Domingo" o "Apoyo"
  hasScheduledSession: boolean    // true en martes/jueves/domingo
  scheduledStartISO?: string      // inicio programado (UTC ISO) — solo obligatorios
  scheduledLabel?: string         // "19:30 – 22:00"
  isLate: boolean                 // ya pasó el inicio + tolerancia
  lateMinutes: number             // minutos desde el inicio programado (si isLate)
}

/** Describe la sesión de HOY según el reloj indicado (por defecto, ahora). */
export function describeToday(now: Date = new Date()): TodaySession {
  const lima = new Date(now.getTime() - LIMA_OFFSET_H * 3600_000)
  const weekday = lima.getUTCDay()
  const dateStr = lima.toISOString().slice(0, 10)
  const sched = SCHEDULE[weekday]

  if (!sched) {
    return {
      dateStr, weekday, dayType: 'apoyo', sessionLabel: 'Apoyo',
      hasScheduledSession: false, isLate: false, lateMinutes: 0,
    }
  }

  // Inicio programado: hora de pared de Lima → UTC real (+5h).
  const startLimaWall = Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), lima.getUTCDate(), sched.startHour, sched.startMin)
  const startUtcMs = startLimaWall + LIMA_OFFSET_H * 3600_000
  const minutesSinceStart = Math.round((now.getTime() - startUtcMs) / 60000)
  const isLate = minutesSinceStart > TOLERANCIA_MIN
  const pad = (n: number) => String(n).padStart(2, '0')

  return {
    dateStr, weekday, dayType: 'obligatorio', sessionLabel: sched.label,
    hasScheduledSession: true,
    scheduledStartISO: new Date(startUtcMs).toISOString(),
    scheduledLabel: `${pad(sched.startHour)}:${pad(sched.startMin)} – ${pad(sched.endHour)}:${pad(sched.endMin)}`,
    isLate,
    lateMinutes: isLate ? minutesSinceStart : 0,
  }
}

/** ¿La fecha dada (YYYY-MM-DD) es un día obligatorio? */
export function isObligatorio(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00Z')
  return !!SCHEDULE[d.getUTCDay()]
}

/**
 * Cuenta cuántas sesiones obligatorias (martes/jueves/domingo) hay entre dos
 * fechas inclusive. Sirve como denominador de referencia del % de asistencia.
 */
export function contarObligatoriosEntre(desdeISO: string, hastaISO: string): number {
  const start = new Date(desdeISO.slice(0, 10) + 'T12:00:00Z')
  const end = new Date(hastaISO.slice(0, 10) + 'T12:00:00Z')
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    if (SCHEDULE[cur.getUTCDay()]) count++
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return count
}
