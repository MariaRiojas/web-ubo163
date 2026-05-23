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
  bloodType?: BloodType
  birthDate?: string             // YYYY-MM-DD
  joinDate?: string              // YYYY-MM-DD
  avatarUrl?: string
  specialties?: string[]
  esbasPromotion?: string        // Ej: "ESBAS-2024-II"
  emergencyContactName?: string
  emergencyContactPhone?: string
  createdAt: string              // ISO 8601
  updatedAt: string              // ISO 8601
}

export type NewProfile = Omit<Profile, 'createdAt' | 'updatedAt'>
