/**
 * Schema v2 de Guardia Nocturna.
 *
 * Reemplaza al modelo plano de `guard-shifts.ts` que solo tenía una lista
 * de camas con un campo `sector`.
 *
 * Nuevo modelo jerárquico:
 *
 *   dormitorios (masculino / femenino)
 *     └─ camarotes (2 camas por camarote, típicamente)
 *          └─ camas (numeradas, con estado)
 *                └─ reservas (por fecha, con prioridad de reservante)
 *
 * Diseño según `docs/ARQUITECTURA_MENU.md` §2.3 y §5.7.
 *
 * Configuración típica de UBO 163:
 *   - Dormitorio masculino: 6 camarotes, 12 camas
 *   - Dormitorio femenino: 3 camarotes, 6 camas
 *
 * La cantidad es editable desde la UI por el Jefe de Guardia correspondiente
 * y por la Jefatura.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  boolean,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

export const DORMITORY_GENDERS = ['masculino', 'femenino'] as const
export type DormitoryGender = (typeof DORMITORY_GENDERS)[number]

export const BED_STATUSES_V2 = [
  'disponible',          // Cama libre y lista para reservar
  'indisponible',        // Fuera de servicio (avería, limpieza, etc.)
  'reservada',           // Tiene una reserva para el día consultado
] as const
export type BedStatus = (typeof BED_STATUSES_V2)[number]

export const RESERVATION_STATUSES = [
  'activa',              // Reserva hecha, pendiente de cumplirse
  'cumplida',            // El efectivo asistió a la guardia
  'cancelada',           // Reserva cancelada antes del día
  'no_asistio',          // No asistió (puede afectar cumplimiento)
] as const
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

// ═══════════════════════════════════════════════════════════════════
// DORMITORIOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Habitación física donde se monta la guardia nocturna.
 * La UBO 163 tiene dos: uno masculino y uno femenino.
 * Otras compañías pueden tener más.
 */
export const guardDormitories = pgTable('guard_dormitories', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Nombre legible del dormitorio — ej. "Dormitorio Masculino", "Dormitorio A" */
  name: text('name').notNull(),
  /** Género que puede ocupar este dormitorio */
  gender: text('gender').notNull(),
  /** Descripción o notas de ubicación física ("Segundo piso, ala este") */
  notes: text('notes'),
  /** Si está activo o temporalmente fuera de servicio */
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const guardDormitoriesRelations = relations(guardDormitories, ({ many }) => ({
  bunks: many(guardBunks),
}))

// ═══════════════════════════════════════════════════════════════════
// CAMAROTES
// ═══════════════════════════════════════════════════════════════════

/**
 * Un camarote agrupa dos camas (superior e inferior, típicamente).
 * Es opcional — una cama puede existir sin camarote si son camas sueltas.
 */
export const guardBunks = pgTable('guard_bunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  dormitoryId: uuid('dormitory_id')
    .notNull()
    .references(() => guardDormitories.id, { onDelete: 'cascade' }),
  /** Identificador del camarote dentro del dormitorio ("A", "1", "I") */
  label: text('label').notNull(),
  /** Posición/orden para mostrar en pantalla */
  displayOrder: integer('display_order').notNull().default(0),
  notes: text('notes'),
})

export const guardBunksRelations = relations(guardBunks, ({ one, many }) => ({
  dormitory: one(guardDormitories, {
    fields: [guardBunks.dormitoryId],
    references: [guardDormitories.id],
  }),
  beds: many(guardBedsV2),
}))

// ═══════════════════════════════════════════════════════════════════
// CAMAS
// ═══════════════════════════════════════════════════════════════════

/**
 * Cama individual. Puede estar en un camarote o suelta en el dormitorio.
 * Tiene un número único dentro del dormitorio.
 */
export const guardBedsV2 = pgTable(
  'guard_beds_v2',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dormitoryId: uuid('dormitory_id')
      .notNull()
      .references(() => guardDormitories.id, { onDelete: 'cascade' }),
    bunkId: uuid('bunk_id').references(() => guardBunks.id, {
      onDelete: 'set null',
    }),
    /** Número de cama dentro del dormitorio (único por dormitorio) */
    number: integer('number').notNull(),
    /** Posición dentro del camarote: 'superior', 'inferior', null si no aplica */
    position: text('position'),
    /** Estado actual (puede sobreescribirse temporalmente) */
    status: text('status').notNull().default('disponible'),
    /** Motivo de indisponibilidad (si aplica) */
    unavailableReason: text('unavailable_reason'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    // Un número de cama solo puede existir una vez por dormitorio
    uniqueBedNumber: unique().on(t.dormitoryId, t.number),
  }),
)

export const guardBedsV2Relations = relations(guardBedsV2, ({ one, many }) => ({
  dormitory: one(guardDormitories, {
    fields: [guardBedsV2.dormitoryId],
    references: [guardDormitories.id],
  }),
  bunk: one(guardBunks, {
    fields: [guardBedsV2.bunkId],
    references: [guardBunks.id],
  }),
  reservations: many(guardReservations),
}))

// ═══════════════════════════════════════════════════════════════════
// RESERVAS
// ═══════════════════════════════════════════════════════════════════

/**
 * Reserva de cama para una fecha específica.
 * Una cama solo puede tener una reserva activa por fecha (constraint único).
 */
export const guardReservations = pgTable(
  'guard_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    bedId: uuid('bed_id')
      .notNull()
      .references(() => guardBedsV2.id, { onDelete: 'cascade' }),
    /** Fecha de inicio de la guardia (la noche comienza ese día) */
    date: date('date').notNull(),
    status: text('status').notNull().default('activa'),
    /** Momento de check-in (al llegar al cuartel) */
    checkInAt: timestamp('check_in_at', { withTimezone: true }),
    /** Momento de check-out (al retirarse al día siguiente) */
    checkOutAt: timestamp('check_out_at', { withTimezone: true }),
    /** Quién validó la reserva (Jefe de Guardia) */
    verifiedBy: uuid('verified_by').references(() => profiles.id),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    // Una cama solo puede estar reservada una vez por fecha
    uniqueBedDate: unique().on(t.bedId, t.date),
  }),
)

export const guardReservationsRelations = relations(guardReservations, ({ one }) => ({
  profile: one(profiles, {
    fields: [guardReservations.profileId],
    references: [profiles.id],
  }),
  bed: one(guardBedsV2, {
    fields: [guardReservations.bedId],
    references: [guardBedsV2.id],
  }),
  verifier: one(profiles, {
    fields: [guardReservations.verifiedBy],
    references: [profiles.id],
  }),
}))

// ═══════════════════════════════════════════════════════════════════
// TIPOS INFERIDOS
// ═══════════════════════════════════════════════════════════════════

export type GuardDormitory = typeof guardDormitories.$inferSelect
export type NewGuardDormitory = typeof guardDormitories.$inferInsert
export type GuardBunk = typeof guardBunks.$inferSelect
export type NewGuardBunk = typeof guardBunks.$inferInsert
export type GuardBedV2 = typeof guardBedsV2.$inferSelect
export type NewGuardBedV2 = typeof guardBedsV2.$inferInsert
export type GuardReservation = typeof guardReservations.$inferSelect
export type NewGuardReservation = typeof guardReservations.$inferInsert
