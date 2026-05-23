/**
 * Guardia Nocturna v2 — modelo jerárquico.
 *
 * Tablas DynamoDB:
 *   {PREFIX}-guard-dormitories  PK: dormId
 *   {PREFIX}-guard-bunks        PK: dormId, SK: bunkId
 *   {PREFIX}-guard-beds         PK: bunkId, SK: bedId  + GSI dormId-index
 *   {PREFIX}-guard-reservations PK: date, SK: profileId  + GSI profileId-index
 */

export const DORMITORY_GENDERS = ['masculino', 'femenino'] as const
export type DormitoryGender = (typeof DORMITORY_GENDERS)[number]

export const BED_STATUSES_V2 = ['disponible', 'indisponible', 'reservada'] as const
export type BedStatus = (typeof BED_STATUSES_V2)[number]

export const RESERVATION_STATUSES = [
  'activa',
  'cumplida',
  'cancelada',
  'no_asistio',
] as const
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

export interface GuardDormitory {
  dormId: string        // PK
  name: string
  gender: DormitoryGender
  notes?: string
  active: boolean
  createdAt: string     // ISO 8601
  updatedAt: string
}

export interface GuardBunk {
  dormId: string        // PK (también para GSI en guard-beds)
  bunkId: string        // SK
  label: string         // "A", "1", "I"
  displayOrder: number
  notes?: string
}

export interface GuardBed {
  bunkId: string        // PK
  bedId: string         // SK
  dormId: string        // GSI: dormId-index
  number: number        // único dentro del dormitorio
  position?: string     // 'superior' | 'inferior' | null
  status: BedStatus
  unavailableReason?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface GuardReservation {
  date: string          // PK (YYYY-MM-DD)
  profileId: string     // SK + GSI
  bedId: string
  bunkId: string
  dormId: string
  status: ReservationStatus
  checkInAt?: string    // ISO 8601
  checkOutAt?: string
  verifiedBy?: string   // profileId
  notes?: string
  createdAt: string
  updatedAt: string
}

export type NewGuardDormitory = Omit<GuardDormitory, 'createdAt' | 'updatedAt'>
export type NewGuardBunk = GuardBunk
export type NewGuardBedV2 = Omit<GuardBed, 'createdAt' | 'updatedAt'>
export type NewGuardReservation = Omit<GuardReservation, 'createdAt' | 'updatedAt'>
// Legacy alias (queries antiguas)
export type GuardBedV2 = GuardBed
