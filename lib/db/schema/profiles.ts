/**
 * Tabla DynamoDB: {PREFIX}-profiles
 * PK: profileId (String, UUID)
 * GSIs:
 *   userId-index       (userId → profileId)
 *   email-index        (email → profileId)
 *   dni-index          (dni → profileId)
 *   codigoCgbvp-index  (codigoCgbvp → profileId)
 */

export const GRADES = [
  'postulante',
  'aspirante',
  'seccionario',
  'subteniente',
  'teniente',
  'capitan',
  'teniente_brigadier',
  'brigadier',
  'brigadier_mayor',
  'brigadier_general',
] as const
export type Grade = (typeof GRADES)[number]

export const PROFILE_STATUSES = [
  'postulante',
  'aspirante_en_curso',
  'activo',
  'reserva',
  'licencia',
  'retirado',
] as const
export type ProfileStatus = (typeof PROFILE_STATUSES)[number]

export const GENDERS = ['masculino', 'femenino'] as const
export type Gender = (typeof GENDERS)[number]

/**
 * Situación en el ciclo de vida de formación (la maneja el área de Instrucción).
 * Es independiente del `grade`: un postulante o un aspirante pueden estar en
 * cualquiera de estas situaciones. Los efectivos ya activos (seccionario+) no
 * usan este campo.
 *   formacion → recibe instrucción interna (compañía)
 *   escuela   → enviado a la Escuela de Bomberos (ESBAS)
 *   licencia  → con licencia vigente
 *   baja      → dado de baja (justificado por normativa)
 *   graduado  → egresado de ESBAS (histórico)
 */
export const FORMACION_SITUACIONES = ['formacion', 'escuela', 'licencia', 'baja', 'graduado'] as const
export type FormacionSituacion = (typeof FORMACION_SITUACIONES)[number]

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const
export type BloodType = (typeof BLOOD_TYPES)[number]

export interface Profile {
  profileId: string              // PK
  userId?: string                // GSI: userId-index (vinculo con users)
  codigoCgbvp?: string          // GSI: codigoCgbvp-index
  fullName: string
  dni?: string                   // GSI: dni-index
  grade: Grade
  status: ProfileStatus
  gender?: Gender
  phone?: string
  email?: string                 // GSI: email-index
  profession?: string            // profesión/ocupación (de admisión)
  distrito?: string              // distrito de residencia (de admisión)
  residencia?: string            // dirección / residencia (de admisión)
  bloodType?: BloodType
  birthDate?: string             // YYYY-MM-DD
  joinDate?: string              // YYYY-MM-DD
  avatarUrl?: string
  specialties?: string[]
  esbasPromotion?: string        // Ej: "ESBAS-2024-II"

  // Ciclo de vida de formación (área de Instrucción) — grade y situacion son independientes
  situacion?: FormacionSituacion         // etapa actual en formación
  convocatoriaIngreso?: string           // cohortId de la convocatoria de INGRESO (ancla histórica)
  convocatoriaIngresoLabel?: string      // denormalizado para la UI (ej. "2024-II")
  ordenAntiguedad?: number               // orden de antigüedad para postulantes/aspirantes post-ERP
  emergencyContactName?: string
  emergencyContactPhone?: string
  createdAt: string              // ISO 8601
  updatedAt: string              // ISO 8601
}

export type NewProfile = Omit<Profile, 'createdAt' | 'updatedAt'>
