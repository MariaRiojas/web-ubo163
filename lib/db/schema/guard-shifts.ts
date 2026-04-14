import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  decimal,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'

export const BED_STATUSES = ['disponible', 'ocupada', 'mantenimiento'] as const
export const SHIFT_STATUSES = [
  'reservada',
  'confirmada',
  'completada',
  'cancelada',
  'no_show',
] as const

export const guardBeds = pgTable('guard_beds', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: integer('number').unique().notNull(),
  sector: text('sector'),
  status: text('status').default('disponible'),
  notes: text('notes'),
})

export const guardBedRelations = relations(guardBeds, ({ many }) => ({
  shifts: many(guardShifts),
}))

export const guardShifts = pgTable(
  'guard_shifts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    bedId: uuid('bed_id')
      .notNull()
      .references(() => guardBeds.id),
    date: date('date').notNull(),
    checkIn: timestamp('check_in', { withTimezone: true }),
    checkOut: timestamp('check_out', { withTimezone: true }),
    status: text('status').default('reservada'),
    approvedBy: uuid('approved_by').references(() => profiles.id),
    /** Horas acreditadas automáticamente al completar la guardia */
    hoursCredited: decimal('hours_credited', { precision: 4, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // Una cama solo puede tener una reserva por fecha
    uniqueBedDate: unique().on(table.bedId, table.date),
  })
)

export const guardShiftsRelations = relations(guardShifts, ({ one }) => ({
  profile: one(profiles, {
    fields: [guardShifts.profileId],
    references: [profiles.id],
  }),
  bed: one(guardBeds, {
    fields: [guardShifts.bedId],
    references: [guardBeds.id],
  }),
  approvedByProfile: one(profiles, {
    fields: [guardShifts.approvedBy],
    references: [profiles.id],
  }),
}))

export type GuardBed = typeof guardBeds.$inferSelect
export type NewGuardBed = typeof guardBeds.$inferInsert
export type GuardShift = typeof guardShifts.$inferSelect
export type NewGuardShift = typeof guardShifts.$inferInsert
