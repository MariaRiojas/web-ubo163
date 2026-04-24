import {
  pgTable,
  uuid,
  text,
  varchar,
  date,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { sectionRoles } from './section-roles'
import { guardShifts } from './guard-shifts'
import { serviceHours } from './service-hours'
import { incidents } from './incidents'
import { esbasProgress } from './esbas'
import { cgbvpAttendance, cgbvpStatusHistory } from './cgbvp'
import { emergencyCrewMembers } from './emergencies'

// Jerarquía de grados CGBVP (NDR Ascensos)
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
  'activo',
  'reserva',
  'licencia',
  'retirado',
  'aspirante_en_curso',
] as const
export type ProfileStatus = (typeof PROFILE_STATUSES)[number]

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** FK a NextAuth users.id */
  /** Código CGBVP del bombero (viene del scrapper) */
  codigoCgbvp: varchar('codigo_cgbvp', { length: 20 }).unique(),
  userId: text('user_id').unique(),
  fullName: text('full_name').notNull(),
  dni: varchar('dni', { length: 8 }).unique(),
  grade: text('grade').notNull().default('aspirante'),
  status: text('status').notNull().default('activo'),
  gender: text('gender'),                              // 'masculino' | 'femenino'
  phone: varchar('phone', { length: 20 }),
  email: text('email'),
  bloodType: varchar('blood_type', { length: 5 }),
  birthDate: date('birth_date'),
  joinDate: date('join_date'),
  avatarUrl: text('avatar_url'),
  specialties: text('specialties').array().default([]),
  esbasPromotion: text('esbas_promotion'),             // Ej: "ESBAS-2024-II"
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const profilesRelations = relations(profiles, ({ many }) => ({
  sectionRoles: many(sectionRoles),
  guardShifts: many(guardShifts),
  serviceHours: many(serviceHours),
  reportedIncidents: many(incidents, { relationName: 'reportedBy' }),
  assignedIncidents: many(incidents, { relationName: 'assignedTo' }),
  esbasProgress: many(esbasProgress),
  cgbvpAttendance: many(cgbvpAttendance),
  cgbvpStatusHistory: many(cgbvpStatusHistory),
  emergencyCrewMembers: many(emergencyCrewMembers),
}))

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
