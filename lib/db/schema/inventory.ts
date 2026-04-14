import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'
import { sections } from './sections'

export const INVENTORY_CATEGORIES = [
  'epp',            // Equipo de Protección Personal
  'herramienta',
  'vehiculo',
  'comunicacion',
  'medico',
  'rescate',
  'hazmat',
  'insumo',
  'mobiliario',
] as const

export const INVENTORY_CONDITIONS = [
  'operativo',
  'mantenimiento',
  'baja',
  'pendiente_revision',
] as const

export const inventory = pgTable('inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  sectionId: uuid('section_id').references(() => sections.id),
  serialNumber: text('serial_number'),
  quantity: integer('quantity').default(1),
  condition: text('condition').default('operativo'),
  location: text('location'),
  lastMaintenance: date('last_maintenance'),
  nextMaintenance: date('next_maintenance'),
  /** Asignación individual (para EPP) */
  assignedTo: uuid('assigned_to').references(() => profiles.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const inventoryRelations = relations(inventory, ({ one }) => ({
  section: one(sections, {
    fields: [inventory.sectionId],
    references: [sections.id],
  }),
  assignedToProfile: one(profiles, {
    fields: [inventory.assignedTo],
    references: [profiles.id],
  }),
}))

export type InventoryItem = typeof inventory.$inferSelect
export type NewInventoryItem = typeof inventory.$inferInsert
