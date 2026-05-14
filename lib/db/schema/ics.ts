/**
 * Bases del Sistema de Comando de Incidentes (SCI) digital.
 *
 * El SCI es el modelo jerárquico y funcional del CGBVP para gestionar
 * emergencias (RIF Libro 4). Este schema declara las tablas necesarias
 * para digitalizarlo.
 *
 * IMPORTANTE: el SCI no se construye en esta fase — solo declaramos la
 * base de datos para que esté lista cuando el resto del sistema se
 * estabilice.
 *
 * Ver `docs/ARQUITECTURA_MENU.md` §12 y `docs/SCI.md` para el diseño
 * conceptual completo.
 *
 * Estructura jerárquica clásica del SCI:
 *
 *                     Comandante del Incidente (CI)
 *                               │
 *          ┌────────────┬───────┴───────┬──────────────┐
 *      Operaciones   Planificación   Logística   Administración
 *                                                    y Finanzas
 *
 * Cada sección puede tener ramas, grupos y unidades según la magnitud.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'
import { emergencies } from './emergencies'

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

export const ICS_SECTIONS = [
  'comando',               // Comandante del Incidente
  'operaciones',           // Ataque directo (extinción, rescate, triaje)
  'planificacion',         // Situación, recursos, previsión, documentación
  'logistica',             // Soporte: agua, combustible, comunicaciones, rehab
  'administracion',        // Tiempo, compras, reclamos
] as const
export type IcsSection = (typeof ICS_SECTIONS)[number]

export const ICS_POSITIONS = [
  // Comando
  'comandante_incidente',
  'oficial_seguridad',
  'oficial_enlace',
  'oficial_informacion_publica',
  // Operaciones
  'jefe_operaciones',
  'jefe_rama',
  'jefe_division',
  'jefe_grupo',
  'lider_equipo',
  // Planificación
  'jefe_planificacion',
  'lider_situacion',
  'lider_recursos',
  'lider_documentacion',
  // Logística
  'jefe_logistica',
  'lider_comunicaciones',
  'lider_suministros',
  'lider_medico_rehab',
  // Administración
  'jefe_administracion',
  'lider_tiempo',
  'lider_compras',
] as const
export type IcsPositionRole = (typeof ICS_POSITIONS)[number]

export const ICS_STATUSES = [
  'activo',                // SCI abierto, incidente en curso
  'transferido',           // Mando transferido a otro oficial
  'cerrado',               // Incidente controlado y SCI finalizado
] as const
export type IcsStatus = (typeof ICS_STATUSES)[number]

export const ICS_RESOURCE_TYPES = [
  'vehiculo',
  'personal',
  'insumo',
  'equipo',
  'logistica_apoyo',       // Agua, combustible, alimentación
] as const
export type IcsResourceType = (typeof ICS_RESOURCE_TYPES)[number]

export const ICS_RESOURCE_STATUSES = [
  'solicitado',            // Pedido pero no asignado
  'en_camino',             // Asignado y en desplazamiento
  'en_sitio',              // Disponible en el lugar del incidente
  'operando',              // En uso activo
  'liberado',              // Ya no se necesita, vuelve a su unidad
] as const
export type IcsResourceStatus = (typeof ICS_RESOURCE_STATUSES)[number]

export const ICS_TIMELINE_EVENT_TYPES = [
  'apertura',              // Se abrió el SCI
  'asignacion_posicion',   // Se designó a alguien a una posición
  'liberacion_posicion',   // Se liberó una posición
  'transferencia_mando',   // Cambio de Comandante del Incidente
  'solicitud_recurso',     // Se solicitó un recurso
  'asignacion_recurso',    // Se asignó un recurso al incidente
  'inicio_ataque',         // Inicio de operaciones de ataque/rescate
  'control',               // Incidente bajo control
  'extincion',             // Fuego extinguido (si aplica)
  'retorno',               // Inicio de retorno de unidades
  'cierre',                // Cierre formal del SCI
  'nota',                  // Anotación libre del equipo de Planificación
  'otro',
] as const
export type IcsTimelineEventType = (typeof ICS_TIMELINE_EVENT_TYPES)[number]

// ═══════════════════════════════════════════════════════════════════
// TABLA PRINCIPAL DEL SCI
// ═══════════════════════════════════════════════════════════════════

/**
 * Activación de un SCI para una emergencia específica.
 *
 * No toda emergencia tiene SCI (solo las grandes/complejas).
 * Una emergencia puede tener un solo SCI activo a la vez.
 */
export const incidentCommandSystems = pgTable('incident_command_systems', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** FK a la emergencia que originó el SCI */
  emergencyId: integer('emergency_id').references(() => emergencies.id, {
    onDelete: 'set null',
  }),
  /** Código legible ej: "SCI-2026-017" */
  code: text('code').unique(),
  /** Nombre descriptivo del incidente (ej: "Incendio estructural Calle 28") */
  name: text('name').notNull(),
  /** Dirección del incidente (copiada de emergency.direccion si existe) */
  address: text('address'),
  status: text('status').notNull().default('activo'),
  /** Nivel de complejidad del SCI (1-5 según estándar NIMS) */
  complexityLevel: integer('complexity_level'),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  openedBy: uuid('opened_by').references(() => profiles.id),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  closedBy: uuid('closed_by').references(() => profiles.id),
  /** Narrativa final del incidente al cerrar */
  closingSummary: text('closing_summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const incidentCommandSystemsRelations = relations(incidentCommandSystems, ({ one, many }) => ({
  emergency: one(emergencies, {
    fields: [incidentCommandSystems.emergencyId],
    references: [emergencies.id],
  }),
  opener: one(profiles, {
    fields: [incidentCommandSystems.openedBy],
    references: [profiles.id],
    relationName: 'icsOpener',
  }),
  closer: one(profiles, {
    fields: [incidentCommandSystems.closedBy],
    references: [profiles.id],
    relationName: 'icsCloser',
  }),
  positions: many(icsPositions),
  resources: many(icsResources),
  timelineEvents: many(icsTimelineEvents),
}))

// ═══════════════════════════════════════════════════════════════════
// POSICIONES ASIGNADAS
// ═══════════════════════════════════════════════════════════════════

export const icsPositions = pgTable('ics_positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  icsId: uuid('ics_id')
    .notNull()
    .references(() => incidentCommandSystems.id, { onDelete: 'cascade' }),
  section: text('section').notNull(),
  position: text('position').notNull(),
  /** Bombero asignado (puede ser de otra compañía si hay apoyo multi-UBO) */
  profileId: uuid('profile_id').references(() => profiles.id),
  /** Texto alternativo si la persona no está en el sistema */
  externalName: text('external_name'),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  notes: text('notes'),
})

export const icsPositionsRelations = relations(icsPositions, ({ one }) => ({
  ics: one(incidentCommandSystems, {
    fields: [icsPositions.icsId],
    references: [incidentCommandSystems.id],
  }),
  profile: one(profiles, {
    fields: [icsPositions.profileId],
    references: [profiles.id],
  }),
}))

// ═══════════════════════════════════════════════════════════════════
// RECURSOS
// ═══════════════════════════════════════════════════════════════════

export const icsResources = pgTable('ics_resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  icsId: uuid('ics_id')
    .notNull()
    .references(() => incidentCommandSystems.id, { onDelete: 'cascade' }),
  resourceType: text('resource_type').notNull(),
  /** Descripción del recurso ("Cisterna 3000 gal", "Grupo Técnico Rescate", etc.) */
  description: text('description').notNull(),
  status: text('status').notNull().default('solicitado'),
  requestedBy: uuid('requested_by').references(() => profiles.id),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow(),
  /** A quién se asignó (posición dentro del SCI) */
  assignedPositionId: uuid('assigned_position_id').references(() => icsPositions.id),
  arrivedAt: timestamp('arrived_at', { withTimezone: true }),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  notes: text('notes'),
})

export const icsResourcesRelations = relations(icsResources, ({ one }) => ({
  ics: one(incidentCommandSystems, {
    fields: [icsResources.icsId],
    references: [incidentCommandSystems.id],
  }),
  requester: one(profiles, {
    fields: [icsResources.requestedBy],
    references: [profiles.id],
  }),
  assignedPosition: one(icsPositions, {
    fields: [icsResources.assignedPositionId],
    references: [icsPositions.id],
  }),
}))

// ═══════════════════════════════════════════════════════════════════
// LÍNEA DE TIEMPO
// ═══════════════════════════════════════════════════════════════════

export const icsTimelineEvents = pgTable('ics_timeline_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  icsId: uuid('ics_id')
    .notNull()
    .references(() => incidentCommandSystems.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  description: text('description').notNull(),
  /** Timestamp del evento (puede ser diferente al createdAt si se registra después) */
  eventAt: timestamp('event_at', { withTimezone: true }).notNull(),
  /** Quién registró el evento */
  registeredBy: uuid('registered_by').references(() => profiles.id),
  /** Metadata adicional en JSON (recurso relacionado, posición, etc.) */
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const icsTimelineEventsRelations = relations(icsTimelineEvents, ({ one }) => ({
  ics: one(incidentCommandSystems, {
    fields: [icsTimelineEvents.icsId],
    references: [incidentCommandSystems.id],
  }),
  registrar: one(profiles, {
    fields: [icsTimelineEvents.registeredBy],
    references: [profiles.id],
  }),
}))

// ═══════════════════════════════════════════════════════════════════
// TIPOS INFERIDOS
// ═══════════════════════════════════════════════════════════════════

export type IncidentCommandSystem = typeof incidentCommandSystems.$inferSelect
export type NewIncidentCommandSystem = typeof incidentCommandSystems.$inferInsert
export type IcsPosition = typeof icsPositions.$inferSelect
export type NewIcsPosition = typeof icsPositions.$inferInsert
export type IcsResource = typeof icsResources.$inferSelect
export type NewIcsResource = typeof icsResources.$inferInsert
export type IcsTimelineEvent = typeof icsTimelineEvents.$inferSelect
export type NewIcsTimelineEvent = typeof icsTimelineEvents.$inferInsert
