import 'server-only'
import { ddb, TABLE, PutCommand, generateId, now } from '@/lib/db/dynamodb'
import { AUDIT_PARTITION, type AuditLog, type AuditEntityType, type AuditAction } from '@/lib/db/schema/audit'

export interface WriteAuditInput {
  entityType: AuditEntityType
  entityId: string
  entityLabel?: string
  action: AuditAction
  actorId: string
  actorName: string
  actorRole?: string
  summary: string
  before?: unknown
  after?: unknown
  metadata?: Record<string, unknown>
}

/**
 * Escribe UNA entrada en la bitácora de auditoría inmutable.
 *
 * - Solo hace PutItem (append-only). No existe update/delete en toda la app.
 * - A prueba de fallos: si la escritura falla (ej. tabla aún no creada, permisos),
 *   registra el error y NO propaga la excepción — la auditoría nunca debe romper
 *   ni bloquear la operación de negocio que la disparó.
 *
 * Devuelve el logId escrito, o null si falló.
 */
export async function writeAuditLog(input: WriteAuditInput): Promise<string | null> {
  try {
    const item: AuditLog = {
      logId: generateId(),
      logPartition: AUDIT_PARTITION,
      createdAt: now(),
      entityType: input.entityType,
      entityId: input.entityId,
      ...(input.entityLabel ? { entityLabel: input.entityLabel } : {}),
      action: input.action,
      actorId: input.actorId,
      actorName: input.actorName,
      ...(input.actorRole ? { actorRole: input.actorRole } : {}),
      summary: input.summary,
      ...(input.before !== undefined ? { before: input.before } : {}),
      ...(input.after !== undefined ? { after: input.after } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    }
    await ddb.send(new PutCommand({
      TableName: TABLE.auditLog,
      Item: item,
      // Garantiza que nunca se sobrescriba un logId existente (append-only real).
      ConditionExpression: 'attribute_not_exists(logId)',
    }))
    return item.logId
  } catch (err) {
    console.error('[writeAuditLog] no se pudo registrar auditoría (operación continúa):', err)
    return null
  }
}

/**
 * Helper para extraer actor desde una sesión de NextAuth.
 * Uso: `const actor = auditActor(session)` → { actorId, actorName, actorRole }.
 */
export function auditActor(session: {
  user?: { profileId?: string; name?: string | null; grade?: string | null }
} | null): { actorId: string; actorName: string; actorRole?: string } {
  return {
    actorId: session?.user?.profileId ?? 'desconocido',
    actorName: session?.user?.name ?? 'Desconocido',
    ...(session?.user?.grade ? { actorRole: session.user.grade } : {}),
  }
}
