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

// ==================== ASISTENCIA MENSUAL CGBVP ====================

export const cgbvpAttendance = pgTable('cgbvp_attendance', {
  id: serial('id').primaryKey(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  mes: integer('mes').notNull(),
  anio: integer('anio').notNull(),
  diasAsistidos: integer('dias_asistidos').default(0),
  diasGuardia: integer('dias_guardia').default(0),
  horasAcumuladas: integer('horas_acumuladas').default(0),
  numEmergencias: integer('num_emergencias').default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueProfileMonth: unique().on(table.profileId, table.mes, table.anio),
}))

export const cgbvpAttendanceRelations = relations(cgbvpAttendance, ({ one }) => ({
  profile: one(profiles, {
    fields: [cgbvpAttendance.profileId],
    references: [profiles.id],
  }),
}))

// ==================== HISTORIAL DE ESTADO CGBVP ====================

export const cgbvpStatusHistory = pgTable('cgbvp_status_history', {
  id: serial('id').primaryKey(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  estadoAnterior: text('estado_anterior'),
  estadoNuevo: text('estado_nuevo').notNull(),
  fuente: text('fuente').default('scraper'), // 'scraper' | 'manual'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const cgbvpStatusHistoryRelations = relations(cgbvpStatusHistory, ({ one }) => ({
  profile: one(profiles, {
    fields: [cgbvpStatusHistory.profileId],
    references: [profiles.id],
  }),
}))

// ==================== ESTADO COMPAÑÍA (snapshot cada 2 min) ====================

export const cgbvpCompanyStatus = pgTable('cgbvp_company_status', {
  id: serial('id').primaryKey(),
  primerJefe: text('primer_jefe'),
  segundoJefe: text('segundo_jefe'),
  estadoGeneral: text('estado_general'),
  pilotosDisponibles: integer('pilotos_disponibles'),
  paramedicosDisponibles: integer('paramedicos_disponibles'),
  personalDisponible: integer('personal_disponible'),
  observaciones: text('observaciones'),
  informante: text('informante'),
  fechaHora: timestamp('fecha_hora', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ==================== VEHÍCULOS DE LA COMPAÑÍA ====================

export const cgbvpVehicles = pgTable('cgbvp_vehicles', {
  id: serial('id').primaryKey(),
  codigo: text('codigo').unique().notNull(),
  tipo: text('tipo'),
  estado: text('estado').default('EN BASE'),
  motivo: text('motivo'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Vehículos en cada snapshot de estado
export const cgbvpStatusVehicles = pgTable('cgbvp_status_vehicles', {
  id: serial('id').primaryKey(),
  statusId: integer('status_id').notNull().references(() => cgbvpCompanyStatus.id, { onDelete: 'cascade' }),
  vehicleId: integer('vehicle_id').references(() => cgbvpVehicles.id),
  codigoVehiculo: text('codigo_vehiculo').notNull(),
  estado: text('estado'),
  motivo: text('motivo'),
  tipoVehiculo: text('tipo_vehiculo'),
})

// ==================== ASISTENCIA DE TURNO (quién está presente) ====================

export const cgbvpShiftAttendance = pgTable('cgbvp_shift_attendance', {
  id: serial('id').primaryKey(),
  statusId: integer('status_id').notNull().references(() => cgbvpCompanyStatus.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id').references(() => profiles.id),
  hiredDriverId: integer('hired_driver_id'),
  nombreRaw: text('nombre_raw'),
  tipo: text('tipo'), // BOM | REN
  horaIngreso: text('hora_ingreso'),
  esBombero: integer('es_bombero').default(0),
  esAlMando: integer('es_al_mando').default(0),
  esPiloto: integer('es_piloto').default(0),
  esMedico: integer('es_medico').default(0),
  esAppa: integer('es_appa').default(0),
  esMap: integer('es_map').default(0),
  esBrec: integer('es_brec').default(0),
})

export type CgbvpAttendance = typeof cgbvpAttendance.$inferSelect
export type CgbvpStatusHistory = typeof cgbvpStatusHistory.$inferSelect
export type CgbvpCompanyStatus = typeof cgbvpCompanyStatus.$inferSelect
export type CgbvpVehicle = typeof cgbvpVehicles.$inferSelect
