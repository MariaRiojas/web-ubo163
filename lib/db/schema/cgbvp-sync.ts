/**
 * Configuración y auditoría de sincronización con CGBVP.
 *
 * Tabla DynamoDB: {PREFIX}-cgbvp-sync
 * PK: syncType ('config' | 'estado-cia' | 'partes-cia' | ...)
 * SK: timestamp ISO 8601 (para historial) o 'LATEST' (para config actual)
 */

export const CGBVP_SYNC_STATUSES = [
  'never',
  'ok',
  'error',
  'invalid_credentials',
] as const
export type CgbvpSyncStatus = (typeof CGBVP_SYNC_STATUSES)[number]

export const CGBVP_AUDIT_ACTIONS = [
  'credentials_created',
  'credentials_updated',
  'credentials_deleted',
  'login_test_ok',
  'login_test_failed',
  'auto_sync_enabled',
  'auto_sync_disabled',
  'manual_sync_triggered',
  'credentials_expired',
  'consent_accepted',
] as const
export type CgbvpAuditAction = (typeof CGBVP_AUDIT_ACTIONS)[number]

export interface CgbvpSyncConfig {
  syncType: 'config'   // PK
  timestamp: 'LATEST'  // SK
  companyId: string
  secretRef?: string
  maskedUsername?: string
  credentialsOwnerName?: string
  lastSyncAt?: string
  lastValidatedAt?: string
  lastSyncStatus: CgbvpSyncStatus
  lastSyncError?: string
  autoSyncEnabled: boolean
  successfulSyncCount: number
  consecutiveErrors: number
  updatedBy?: string   // profileId
  createdAt: string
  updatedAt: string
}

export interface CgbvpSyncAudit {
  syncType: string     // PK (acción: 'audit')
  timestamp: string    // SK — ISO 8601
  companyId: string
  action: CgbvpAuditAction
  actorProfileId?: string
  actorName?: string
  actorGrade?: string
  description?: string
  metadata?: string    // JSON serializado
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface CgbvpSyncRun {
  syncType: string     // PK ('estado-cia' | 'partes-cia' | 'sgo' | ...)
  timestamp: string    // SK — ISO 8601 del inicio de la ejecución
  status: 'ok' | 'error'
  errorMessage?: string
  recordsProcessed?: number
  durationMs?: number
}

export type NewCgbvpSyncConfig = CgbvpSyncConfig
export type NewCgbvpSyncAudit = CgbvpSyncAudit
export type NewCgbvpSyncRun = CgbvpSyncRun
