/**
 * Asistencia a la instrucción interna de la compañía (postulantes y aspirantes).
 *
 * Tabla `{PREFIX}-instruction-attendance`
 *   PK: profileId
 *   SK: date (YYYY-MM-DD, hora de Lima)  → un registro por persona por día
 *   GSI date-profileId-index: date (HASH) + profileId (RANGE) → asistencia de una sesión
 *
 * Los postulantes/aspirantes se auto-registran con su usuario. Días de instrucción
 * regular: martes y jueves por la noche, y domingo por la mañana. También pueden
 * registrar días de APOYO (asistencias voluntarias fuera del calendario obligatorio).
 * La tardanza se determina automáticamente contra la hora de inicio del día.
 */

export const ATTENDANCE_DAY_TYPES = ['obligatorio', 'apoyo'] as const
export type AttendanceDayType = (typeof ATTENDANCE_DAY_TYPES)[number]

export const ATTENDANCE_STATUSES = ['presente', 'tardanza'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export interface InstructionAttendance {
  profileId: string          // PK
  date: string               // SK — YYYY-MM-DD (fecha de Lima)
  dayType: AttendanceDayType
  sessionLabel: string       // "Martes", "Jueves", "Domingo" o "Apoyo"
  status: AttendanceStatus
  scheduledStart?: string    // ISO — inicio programado de la sesión (solo obligatorios)
  registeredAt: string       // ISO — momento real del registro
  lateMinutes?: number       // minutos de tardanza (si status = tardanza)
  comentario?: string        // obligatorio en tardanza (motivo)

  // Verificación anti-fraude
  lat?: number               // latitud capturada al registrar
  lng?: number               // longitud capturada
  accuracyM?: number         // precisión reportada por el GPS (m)
  distanceM?: number         // distancia calculada a la compañía (m)
  geoValidated?: boolean     // true si estaba dentro del geocerco
  selfieKey?: string         // S3 key de la foto de evidencia (selfie)

  createdAt: string
  updatedAt: string
}

export type NewInstructionAttendance = Omit<InstructionAttendance, 'createdAt' | 'updatedAt'>
