import {
  pgTable,
  uuid,
  serial,
  text,
  integer,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'

// ==================== TIPOS DE EMERGENCIA ====================

export const emergencyTypes = pgTable('emergency_types', {
  id: serial('id').primaryKey(),
  descripcion: text('descripcion').unique().notNull(),
})

// ==================== EMERGENCIAS (SGO Norte + Partes CIA) ====================

export const emergencies = pgTable('emergencies', {
  id: serial('id').primaryKey(),
  numeroParte: text('numero_parte').unique().notNull(),
  tipo: text('tipo'),
  estado: text('estado'), // DESPACHADA, EN CAMINO, EN ESCENA, CONTROLADA, etc.
  fechaDespacho: timestamp('fecha_despacho', { withTimezone: true }),
  fechaRetorno: timestamp('fecha_retorno', { withTimezone: true }),
  tipoEmergenciaId: integer('tipo_emergencia_id').references(() => emergencyTypes.id),
  direccion: text('direccion'),
  distrito: text('distrito'),
  /** Bombero al mando (si se identifica) */
  alMandoId: uuid('al_mando_id').references(() => profiles.id),
  alMandoTexto: text('al_mando_texto'), // Texto original del scrapper
  observaciones: text('observaciones'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const emergenciesRelations = relations(emergencies, ({ one, many }) => ({
  tipoEmergencia: one(emergencyTypes, {
    fields: [emergencies.tipoEmergenciaId],
    references: [emergencyTypes.id],
  }),
  alMando: one(profiles, {
    fields: [emergencies.alMandoId],
    references: [profiles.id],
  }),
  vehiculos: many(emergencyVehicles),
  dotacion: many(emergencyCrewMembers),
}))

// ==================== VEHÍCULOS EN EMERGENCIA ====================

export const emergencyVehicles = pgTable('emergency_vehicles', {
  id: serial('id').primaryKey(),
  emergencyId: integer('emergency_id').notNull().references(() => emergencies.id, { onDelete: 'cascade' }),
  codigoVehiculo: text('codigo_vehiculo').notNull(),
  nombreVehiculo: text('nombre_vehiculo'), // Ej: "RES-150", "M150-1"
  horaSalida: timestamp('hora_salida', { withTimezone: true }),
  horaRetorno: timestamp('hora_retorno', { withTimezone: true }),
  kmSalida: integer('km_salida'),
  kmRetorno: integer('km_retorno'),
}, (table) => ({
  uniqueEmergencyVehicle: unique().on(table.emergencyId, table.codigoVehiculo),
}))

export const emergencyVehiclesRelations = relations(emergencyVehicles, ({ one }) => ({
  emergency: one(emergencies, {
    fields: [emergencyVehicles.emergencyId],
    references: [emergencies.id],
  }),
}))

// ==================== DOTACIÓN (bomberos en emergencia) ====================

export const emergencyCrewMembers = pgTable('emergency_crew_members', {
  id: serial('id').primaryKey(),
  emergencyId: integer('emergency_id').notNull().references(() => emergencies.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id').references(() => profiles.id),
  vehicleId: integer('vehicle_id').references(() => emergencyVehicles.id),
  rol: text('rol'), // piloto, jefe_maquina, bombero
  nombreTexto: text('nombre_texto'), // Texto original si no se matchea con profile
}, (table) => ({
  uniqueCrewMember: unique().on(table.emergencyId, table.profileId),
}))

export const emergencyCrewRelations = relations(emergencyCrewMembers, ({ one }) => ({
  emergency: one(emergencies, {
    fields: [emergencyCrewMembers.emergencyId],
    references: [emergencies.id],
  }),
  profile: one(profiles, {
    fields: [emergencyCrewMembers.profileId],
    references: [profiles.id],
  }),
  vehicle: one(emergencyVehicles, {
    fields: [emergencyCrewMembers.vehicleId],
    references: [emergencyVehicles.id],
  }),
}))

// ==================== PILOTOS RENTADOS ====================

export const hiredDrivers = pgTable('hired_drivers', {
  id: serial('id').primaryKey(),
  apellidos: text('apellidos').notNull(),
  nombres: text('nombres').notNull(),
  dni: text('dni'),
  telefono: text('telefono'),
  activo: text('activo').default('si'),
})

export type Emergency = typeof emergencies.$inferSelect
export type EmergencyVehicle = typeof emergencyVehicles.$inferSelect
export type EmergencyCrewMember = typeof emergencyCrewMembers.$inferSelect
