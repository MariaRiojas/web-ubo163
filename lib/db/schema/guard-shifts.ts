/**
 * Guardia Nocturna v1 (legacy) — tipos para compatibilidad con queries existentes.
 * Los nuevos desarrollos deben usar guard-nocturna.ts (v2).
 */

export const BED_STATUSES = ['disponible', 'ocupada', 'mantenimiento'] as const
export type BedStatusLegacy = (typeof BED_STATUSES)[number]

export const SHIFT_STATUSES = [
  'reservada', 'confirmada', 'completada', 'cancelada', 'no_show',
] as const
export type ShiftStatus = (typeof SHIFT_STATUSES)[number]

export interface GuardBed {
  bedId: string
  number: number
  sector?: string
  status?: BedStatusLegacy
  notes?: string
}

export interface GuardShift {
  shiftId: string
  profileId: string
  bedId: string
  date: string        // YYYY-MM-DD
  checkIn?: string    // ISO 8601
  checkOut?: string
  status?: ShiftStatus
  approvedBy?: string // profileId
  hoursCredited?: string // decimal
  createdAt: string
}

export type NewGuardBed = Omit<GuardBed, 'bedId'>
export type NewGuardShift = Omit<GuardShift, 'shiftId' | 'createdAt'>
