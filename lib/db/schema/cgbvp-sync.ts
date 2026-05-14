import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'

/**
 * Configuración de sincronización con el intranet del CGBVP.
 *
 * Esta tabla no guarda credenciales — solo un puntero al secret que vive
 * en AWS Secrets Manager (o en un fallback local durante desarrollo).
 *
 * El flujo es:
 *   1. El Primer o Segundo Jefe ingresa sus credenciales en la UI
 *   2. El sistema valida el login contra bomberosperu.gob.pe/extranet
 *   3. Si son válidas, se guardan cifradas en Secrets Manager y se
 *      registra un puntero aquí
 *   4. El scraper lee el puntero y obtiene las credenciales en runtime
 */
export const CGBVP_SYNC_STATUSES = [
  'never',                 // Nunca se ha sincronizado
  'ok',                    // Última sincronización exitosa
  'error',                 // Error técnico (no credenciales)
  'invalid_credentials',   // El intranet rechazó las credenciales
] as const
export type CgbvpSyncStatus = (typeof CGBVP_SYNC_STATUSES)[number]

export const cgbvpSyncConfig = pgTable('cgbvp_sync_config', {
  id: uuid('id').primaryKey().defaultRandom(),

  /**
   * Identificador interno de la compañía. En la fase de piloto es
   * siempre "163", pero se prepara para multi-tenancy.
   */
  companyId: text('company_id').notNull().unique(),

  /**
   * ARN del secret en AWS Secrets Manager (o un identificador local
   * cuando corre en desarrollo sin AWS).
   */
  secretRef: text('secret_ref'),

  /**
   * Usuario enmascarado para mostrar en UI. Por ejemplo "A2***18" si el
   * usuario real es "A23118". Sirve para que el Jefe confirme de un vistazo
   * que las credenciales guardadas corresponden a su cuenta, sin exponer
   * el usuario completo.
   */
  maskedUsername: text('masked_username'),

  /** Nombre completo del efectivo cuyas credenciales están guardadas. */
  credentialsOwnerName: text('credentials_owner_name'),

  /** Última vez que la sincronización corrió con éxito. */
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),

  /** Última vez que se validó el login (distinto de sincronización completa). */
  lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),

  /** Estado actual de la sincronización. */
  lastSyncStatus: text('last_sync_status').notNull().default('never'),

  /** Mensaje del último error (si lo hubo). Para mostrar al Jefe. */
  lastSyncError: text('last_sync_error'),

  /** Si está en true, los schedulers ejecutan las tareas automáticamente. */
  autoSyncEnabled: boolean('auto_sync_enabled').notNull().default(false),

  /** Contador de sincronizaciones exitosas — útil para mostrar trayectoria. */
  successfulSyncCount: integer('successful_sync_count').notNull().default(0),

  /** Contador de errores consecutivos — se resetea al éxito. */
  consecutiveErrors: integer('consecutive_errors').notNull().default(0),

  /** Quién actualizó las credenciales por última vez. */
  updatedBy: uuid('updated_by').references(() => profiles.id),

  /** Timestamp de creación y actualización. */
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const cgbvpSyncConfigRelations = relations(cgbvpSyncConfig, ({ one }) => ({
  updatedByProfile: one(profiles, {
    fields: [cgbvpSyncConfig.updatedBy],
    references: [profiles.id],
  }),
}))

/**
 * Registro de auditoría para acciones críticas sobre las credenciales.
 * Nunca se borra — mantiene la trazabilidad completa.
 */
export const CGBVP_AUDIT_ACTIONS = [
  'credentials_created',       // Se guardaron nuevas credenciales
  'credentials_updated',       // Se actualizaron las credenciales existentes
  'credentials_deleted',       // Se eliminaron las credenciales
  'login_test_ok',             // Se validó un login con éxito
  'login_test_failed',         // Un login de prueba falló
  'auto_sync_enabled',         // Se activó la sincronización automática
  'auto_sync_disabled',        // Se desactivó la sincronización automática
  'manual_sync_triggered',     // Se ejecutó una tarea manualmente
  'credentials_expired',       // El sistema detectó credenciales expiradas
  'consent_accepted',          // El Jefe aceptó el consentimiento de uso
] as const
export type CgbvpAuditAction = (typeof CGBVP_AUDIT_ACTIONS)[number]

export const cgbvpSyncAudit = pgTable('cgbvp_sync_audit', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),

  /** Qué se hizo. */
  action: text('action').notNull(),

  /** Quién lo hizo (profileId). Puede ser null para acciones del sistema. */
  actorProfileId: uuid('actor_profile_id').references(() => profiles.id),

  /** Grado y nombre del actor al momento de la acción (se guarda por si después cambia). */
  actorName: text('actor_name'),
  actorGrade: text('actor_grade'),

  /** Descripción legible de la acción para mostrar en UI. */
  description: text('description'),

  /** Información adicional en formato JSON serializado. */
  metadata: text('metadata'),

  /** Dirección IP del origen, cuando aplica. */
  ipAddress: text('ip_address'),

  /** User agent del navegador, cuando aplica. */
  userAgent: text('user_agent'),

  /** Timestamp del evento. */
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const cgbvpSyncAuditRelations = relations(cgbvpSyncAudit, ({ one }) => ({
  actor: one(profiles, {
    fields: [cgbvpSyncAudit.actorProfileId],
    references: [profiles.id],
  }),
}))

export type CgbvpSyncConfig = typeof cgbvpSyncConfig.$inferSelect
export type CgbvpSyncAudit = typeof cgbvpSyncAudit.$inferSelect
export type NewCgbvpSyncConfig = typeof cgbvpSyncConfig.$inferInsert
export type NewCgbvpSyncAudit = typeof cgbvpSyncAudit.$inferInsert
