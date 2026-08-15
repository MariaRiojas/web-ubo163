/**
 * Bitácora de auditoría inmutable (estilo CloudTrail).
 *
 * Tabla `{PREFIX}-audit-log` — append-only. La app SOLO hace PutItem; no hay
 * ninguna ruta de edición ni borrado. Sirve para dar trazabilidad a operaciones
 * sensibles (inventario, documentos, donaciones, personal/roles) y evitar que
 * algo "desaparezca" sin rastro durante un pase de mando.
 *
 * PK: logId
 * GSI timeline-index: logPartition (constante 'AUDIT') + createdAt  → feed cronológico global
 * GSI entityType-createdAt-index: entityType + createdAt            → filtro por tipo
 *
 * Visible solo para Primer Jefe (permiso `company.manage`).
 */

export const AUDIT_PARTITION = 'AUDIT' as const

export const AUDIT_ENTITY_TYPES = [
  'inventory',   // ítems, asignaciones, actas, insumos, EPP, jaulas, casilleros
  'document',    // informes de conducta, actas administrativas, documentos
  'donation',    // donaciones recibidas
  'personnel',   // altas/bajas, cambios de grado, cargo, roles
  'admission',   // postulaciones y su gestión
  'training',    // cursos, certificados, evaluaciones
  'system',      // configuración, usuarios
] as const
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number]

export const AUDIT_ACTIONS = [
  'create', 'update', 'delete',
  'assign', 'unassign', 'reassign',
  'status_change', 'approve', 'reject',
  'upload', 'download', 'issue', 'revoke',
  'quantity_change',
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export interface AuditLog {
  logId: string                 // PK — uuid
  logPartition: typeof AUDIT_PARTITION  // GSI timeline HASH (constante)
  createdAt: string             // GSI RANGE — ISO timestamp
  entityType: AuditEntityType   // GSI entityType HASH
  entityId: string              // id del recurso afectado
  entityLabel?: string          // etiqueta legible (ej. nombre del ítem)
  action: AuditAction
  actorId: string               // profileId de quien ejecutó la operación
  actorName: string             // nombre legible del actor
  actorRole?: string            // cargo/grado del actor al momento
  summary: string               // frase legible de lo ocurrido
  before?: unknown              // snapshot previo (opcional)
  after?: unknown               // snapshot posterior (opcional)
  metadata?: Record<string, unknown>
}

/** Etiquetas legibles para la UI del visor. */
export const AUDIT_ENTITY_LABELS: Record<AuditEntityType, string> = {
  inventory:  'Inventario',
  document:   'Documentos',
  donation:   'Donaciones',
  personnel:  'Personal y roles',
  admission:  'Admisión',
  training:   'Capacitación',
  system:     'Sistema',
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create:          'Creó',
  update:          'Modificó',
  delete:          'Eliminó',
  assign:          'Asignó',
  unassign:        'Desasignó',
  reassign:        'Reasignó',
  status_change:   'Cambió estado',
  approve:         'Aprobó',
  reject:          'Rechazó',
  upload:          'Subió documento',
  download:        'Descargó',
  issue:           'Emitió',
  revoke:          'Revocó',
  quantity_change: 'Cambió cantidad',
}
