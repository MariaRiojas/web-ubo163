import {
  pgTable,
  uuid,
  text,
  date,
  decimal,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'

export const HOUR_TYPES = [
  'guardia_nocturna',
  'emergencia',
  'instruccion',
  'administrativo',
  'mantenimiento',
  'evento_institucional',
  'comision',
] as const
export type HourType = (typeof HOUR_TYPES)[number]

export const serviceHours = pgTable('service_hours', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  hours: decimal('hours', { precision: 4, scale: 2 }).notNull(),
  type: text('type').notNull(),
  description: text('description'),
  verifiedBy: uuid('verified_by').references(() => profiles.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  /** true cuando el registro proviene del módulo de guardia nocturna */
  autoRegistered: boolean('auto_registered').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const serviceHoursRelations = relations(serviceHours, ({ one }) => ({
  profile: one(profiles, {
    fields: [serviceHours.profileId],
    references: [profiles.id],
  }),
  verifiedByProfile: one(profiles, {
    fields: [serviceHours.verifiedBy],
    references: [profiles.id],
  }),
}))

export type ServiceHour = typeof serviceHours.$inferSelect
export type NewServiceHour = typeof serviceHours.$inferInsert
