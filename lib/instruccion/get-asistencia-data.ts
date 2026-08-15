import 'server-only'
import { ddb, TABLE, QueryCommand, ScanCommand } from '@/lib/db/dynamodb'
import type { InstructionAttendance } from '@/lib/db/schema/instruction-attendance'
import { describeToday, type TodaySession } from './horario'

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

function build(records: InstructionAttendance[], sesionesRealizadas: number): AsistenciaResumen {
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
  for (const r of all) if (r.dayType === 'obligatorio') sesionesObligatorias.add(r.date)
  const sesionesRealizadas = sesionesObligatorias.size

  const byProfile: Record<string, InstructionAttendance[]> = {}
  for (const r of all) (byProfile[r.profileId] ??= []).push(r)

  const map: Record<string, AsistenciaResumen> = {}
  for (const [pid, recs] of Object.entries(byProfile)) {
    map[pid] = build(recs, sesionesRealizadas)
  }
  return map
}
