import 'server-only'
import { ddb, TABLE, QueryCommand } from '@/lib/db/dynamodb'
import { AUDIT_PARTITION, type AuditLog, type AuditEntityType } from '@/lib/db/schema/audit'

export interface AuditPage {
  items: AuditLog[]
  nextCursor: string | null
}

/**
 * Feed cronológico de auditoría (más reciente primero) vía GSI timeline-index.
 * No hace Scan. Paginable con cursor.
 */
export async function getAuditFeed(opts: {
  entityType?: AuditEntityType
  limit?: number
  cursor?: string | null
} = {}): Promise<AuditPage> {
  const limit = Math.min(opts.limit ?? 50, 200)

  try {
    // Filtrar por tipo → usa el GSI entityType-createdAt-index; si no, el timeline global.
    const useEntity = !!opts.entityType
    const res = await ddb.send(new QueryCommand({
      TableName: TABLE.auditLog,
      IndexName: useEntity ? 'entityType-createdAt-index' : 'timeline-index',
      KeyConditionExpression: useEntity ? 'entityType = :k' : 'logPartition = :k',
      ExpressionAttributeValues: { ':k': useEntity ? opts.entityType : AUDIT_PARTITION },
      ScanIndexForward: false, // más reciente primero
      Limit: limit,
      ...(opts.cursor
        ? { ExclusiveStartKey: JSON.parse(Buffer.from(opts.cursor, 'base64').toString('utf-8')) }
        : {}),
    }))

    const items = (res.Items ?? []) as AuditLog[]
    const nextCursor = res.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64')
      : null

    return { items, nextCursor }
  } catch (err) {
    // Tabla aún no creada o error transitorio → feed vacío (no romper la página).
    console.error('[getAuditFeed] error al leer bitácora:', err)
    return { items: [], nextCursor: null }
  }
}
