/**
 * Schema de máquinas, compartimientos y checklists.
 *
 * Modelo:
 *
 *   machines                  (las 4 unidades de la UBO 163)
 *     └─ machine_compartments (espacios con QR, nombres totalmente editables)
 *          └─ inventory       (ítems dentro de cada compartimiento, FK existente)
 *
 *   checklist_definitions     (plantillas de checklist por compartimiento)
 *     └─ checklist_executions (cada vez que alguien ejecuta uno)
 *          └─ checklist_item_results (por cada ítem: presente/faltante/dañado)
 *
 * Diseño según `docs/ARQUITECTURA_MENU.md` §5.8 y §5.9.
 *
 * Tipos de compartimiento (ver ARQUITECTURA_MENU §5.8):
 *   - cabina         → espacio cerrado con puerta (ej. Cabina 1, Cabina A, Cabina T1)
 *   - cajon          → gaveta deslizable
 *   - vitrina        → compartimiento con visión (típico de ambulancia)
 *   - cama_mangueras → espacio superior de la autobomba
 *   - exterior       → paragolpes, techo, etc.
 *   - otro           → cualquier otro no estandarizable
 *
 * El nombre de cada compartimiento es libre (text). El `type` solo sirve
 * para agrupar visualmente y para reportería.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'
import { inventory } from './inventory'

// ═══════════════════════════════════════════════════════════════════
// MÁQUINAS
// ═══════════════════════════════════════════════════════════════════

export const MACHINE_KINDS = [
  'autobomba',
  'ambulancia',
  'rescate',
  'auxiliar',
  'cisterna',
  'otra',
] as const
export type MachineKind = (typeof MACHINE_KINDS)[number]

export const MACHINE_STATUSES = [
  'operativa',
  'mantenimiento',
  'fuera_servicio',
  'baja',
] as const
export type MachineStatus = (typeof MACHINE_STATUSES)[number]

/**
 * Registro de cada máquina de la compañía.
 * Complementa (no reemplaza) a `cgbvp_vehicles` que viene del scraper;
 * este schema agrega los datos de gestión que no trae el intranet.
 */
export const machines = pgTable('machines', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Slug interno (snake_case) ej: maquina_163_1 */
  slug: text('slug').notNull().unique(),
  /** Nombre visible ej: "MAQUINA 163-1" */
  label: text('label').notNull(),
  /** Código del vehículo en CGBVP (aparece en los partes de emergencia) */
  codigoCgbvp: text('codigo_cgbvp'),
  kind: text('kind').notNull(),
  status: text('status').notNull().default('operativa'),
  brand: text('brand'),
  model: text('model'),
  year: integer('year'),
  plate: text('plate'),
  chassisNumber: text('chassis_number'),
  currentMileage: integer('current_mileage'),
  /** Fecha de vencimiento SOAT (seguro) */
  soatExpiresAt: text('soat_expires_at'),
  /** Fecha de vencimiento revisión técnica */
  revisionExpiresAt: text('revision_expires_at'),
  /** Próximo mantenimiento programado */
  nextMaintenanceAt: text('next_maintenance_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const machinesRelations = relations(machines, ({ many }) => ({
  compartments: many(machineCompartments),
}))

// ═══════════════════════════════════════════════════════════════════
// COMPARTIMIENTOS
// ═══════════════════════════════════════════════════════════════════

export const COMPARTMENT_TYPES = [
  'cabina',
  'cajon',
  'vitrina',
  'cama_mangueras',
  'exterior',
  'otro',
] as const
export type CompartmentType = (typeof COMPARTMENT_TYPES)[number]

/**
 * Compartimiento de una máquina. Cada uno tiene un código QR único que se
 * imprime y pega físicamente en el compartimiento.
 *
 * Nombres típicos (editables):
 *   MAQUINA 163-1  → "Cabina 1", "Cabina A", "Cabina T1", "Cama de mangueras"
 *   AMBULANCIA 163 → "Cajón 1", "Vitrina trasera", "Gaveta médica"
 *   RESCATE 163    → "Cabina técnica", "Compartimiento trípodes"
 */
export const machineCompartments = pgTable('machine_compartments', {
  id: uuid('id').primaryKey().defaultRandom(),
  machineId: uuid('machine_id')
    .notNull()
    .references(() => machines.id, { onDelete: 'cascade' }),
  /** Nombre completamente editable por el Jefe de Máquinas */
  name: text('name').notNull(),
  /** Tipo para agrupar visualmente y reportería */
  type: text('type').notNull().default('cabina'),
  /**
   * Código QR único — se genera al crear el compartimiento.
   * Formato: `MC-<8 chars aleatorios>`
   * Se imprime y se pega físicamente.
   */
  qrCode: text('qr_code').notNull().unique(),
  /** Orden para mostrar en UI */
  displayOrder: integer('display_order').notNull().default(0),
  /** URL de una foto de referencia del compartimiento */
  referencePhotoKey: text('reference_photo_key'),
  notes: text('notes'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const machineCompartmentsRelations = relations(machineCompartments, ({ one, many }) => ({
  machine: one(machines, {
    fields: [machineCompartments.machineId],
    references: [machines.id],
  }),
  checklistDefinitions: many(checklistDefinitions),
}))

// ═══════════════════════════════════════════════════════════════════
// CHECKLISTS
// ═══════════════════════════════════════════════════════════════════

export const CHECKLIST_FREQUENCIES = [
  'turno_manana',        // Al iniciar el turno 07:00
  'turno_tarde',         // Al iniciar el turno 15:00
  'turno_noche',         // Al iniciar el turno 23:00
  'post_emergencia',     // Después de cada emergencia
  'manual',              // Ejecutado por solicitud manual
] as const
export type ChecklistFrequency = (typeof CHECKLIST_FREQUENCIES)[number]

export const CHECKLIST_EXECUTION_STATUSES = [
  'en_curso',            // Iniciado pero no completado
  'completado',          // Finalizado
  'diferido',            // Postergado por el bombero al mando (emergencia de madrugada)
  'vencido',             // No se ejecutó en el tiempo requerido
] as const
export type ChecklistExecutionStatus = (typeof CHECKLIST_EXECUTION_STATUSES)[number]

export const CHECKLIST_ITEM_RESULT_STATUSES = [
  'presente',
  'faltante',
  'danado',
  'no_aplica',           // El ítem no aplica para este checklist específico
] as const
export type ChecklistItemResultStatus = (typeof CHECKLIST_ITEM_RESULT_STATUSES)[number]

/**
 * Plantilla de checklist. Define qué se verifica en un compartimiento
 * con qué frecuencia.
 *
 * Un compartimiento puede tener varias definiciones (ej. una para el
 * ingreso de turno y otra para post-emergencia con menos ítems).
 */
export const checklistDefinitions = pgTable('checklist_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  compartmentId: uuid('compartment_id')
    .notNull()
    .references(() => machineCompartments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  /** Frecuencia en que debe ejecutarse */
  frequency: text('frequency').notNull(),
  /** Si está activa o deshabilitada temporalmente */
  active: boolean('active').notNull().default(true),
  createdBy: uuid('created_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const checklistDefinitionsRelations = relations(checklistDefinitions, ({ one, many }) => ({
  compartment: one(machineCompartments, {
    fields: [checklistDefinitions.compartmentId],
    references: [machineCompartments.id],
  }),
  executions: many(checklistExecutions),
}))

/**
 * Cada vez que un efectivo ejecuta un checklist.
 */
export const checklistExecutions = pgTable('checklist_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  definitionId: uuid('definition_id')
    .notNull()
    .references(() => checklistDefinitions.id, { onDelete: 'cascade' }),
  performedBy: uuid('performed_by')
    .notNull()
    .references(() => profiles.id),
  /** Si se hizo como consecuencia de una emergencia específica */
  triggeredByEmergencyId: integer('triggered_by_emergency_id'),
  status: text('status').notNull().default('en_curso'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  /** Si fue postergado (post-emergencia madrugada), hasta cuándo */
  postponedUntil: timestamp('postponed_until', { withTimezone: true }),
  postponedReason: text('postponed_reason'),
  /** Notas generales del checklist (lo que escriba el ejecutor) */
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const checklistExecutionsRelations = relations(checklistExecutions, ({ one, many }) => ({
  definition: one(checklistDefinitions, {
    fields: [checklistExecutions.definitionId],
    references: [checklistDefinitions.id],
  }),
  performer: one(profiles, {
    fields: [checklistExecutions.performedBy],
    references: [profiles.id],
  }),
  results: many(checklistItemResults),
}))

/**
 * Resultado por cada ítem del inventario del compartimiento durante la
 * ejecución de un checklist.
 */
export const checklistItemResults = pgTable('checklist_item_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  executionId: uuid('execution_id')
    .notNull()
    .references(() => checklistExecutions.id, { onDelete: 'cascade' }),
  /** Ítem del inventario que se verifica */
  inventoryId: uuid('inventory_id')
    .notNull()
    .references(() => inventory.id),
  status: text('status').notNull(),
  /** Cantidad encontrada (útil cuando el ítem tiene `quantity` > 1) */
  foundQuantity: integer('found_quantity'),
  /** Foto opcional (si está faltante o dañado) */
  photoKey: text('photo_key'),
  notes: text('notes'),
})

export const checklistItemResultsRelations = relations(checklistItemResults, ({ one }) => ({
  execution: one(checklistExecutions, {
    fields: [checklistItemResults.executionId],
    references: [checklistExecutions.id],
  }),
  inventoryItem: one(inventory, {
    fields: [checklistItemResults.inventoryId],
    references: [inventory.id],
  }),
}))

// ═══════════════════════════════════════════════════════════════════
// TIPOS INFERIDOS
// ═══════════════════════════════════════════════════════════════════

export type Machine = typeof machines.$inferSelect
export type NewMachine = typeof machines.$inferInsert
export type MachineCompartment = typeof machineCompartments.$inferSelect
export type NewMachineCompartment = typeof machineCompartments.$inferInsert
export type ChecklistDefinition = typeof checklistDefinitions.$inferSelect
export type NewChecklistDefinition = typeof checklistDefinitions.$inferInsert
export type ChecklistExecution = typeof checklistExecutions.$inferSelect
export type NewChecklistExecution = typeof checklistExecutions.$inferInsert
export type ChecklistItemResult = typeof checklistItemResults.$inferSelect
export type NewChecklistItemResult = typeof checklistItemResults.$inferInsert
