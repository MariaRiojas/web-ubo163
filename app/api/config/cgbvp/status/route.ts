import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { ddb, TABLE, GetCommand, QueryCommand, now } from '@/lib/db/dynamodb'
import type { CgbvpSyncConfig, CgbvpSyncAudit } from '@/lib/db/schema/cgbvp-sync'

/**
 * GET /api/config/cgbvp/status
 *
 * Devuelve el estado de sincronización con CGBVP:
 * credenciales configuradas, última sync, últimas 10 acciones de auditoría.
 */
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Su sesión no está activa. Vuelva a ingresar.' }, { status: 401 })
  }

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!hasPermission(permissions, 'company.manage')) {
    return NextResponse.json(
      { error: 'Esta sección solo está disponible para el Primer Jefe y el Segundo Jefe de la compañía.' },
      { status: 403 }
    )
  }

  const [configRes, auditRes] = await Promise.all([
    ddb.send(new GetCommand({
      TableName: TABLE.cgbvpSync,
      Key: { syncType: 'config', timestamp: 'LATEST' },
    })),
    ddb.send(new QueryCommand({
      TableName: TABLE.cgbvpSync,
      KeyConditionExpression: 'syncType = :t',
      ExpressionAttributeValues: { ':t': 'audit' },
      ScanIndexForward: false,
      Limit: 10,
    })),
  ])

  const config = configRes.Item as CgbvpSyncConfig | undefined
  const recentAudit = (auditRes.Items ?? []) as CgbvpSyncAudit[]

  return NextResponse.json({
    configured: !!config?.secretRef,
    maskedUsername: config?.maskedUsername ?? null,
    credentialsOwnerName: config?.credentialsOwnerName ?? null,
    lastValidatedAt: config?.lastValidatedAt ?? null,
    lastSyncAt: config?.lastSyncAt ?? null,
    lastSyncStatus: config?.lastSyncStatus ?? 'never',
    lastSyncError: config?.lastSyncError ?? null,
    autoSyncEnabled: config?.autoSyncEnabled ?? false,
    successfulSyncCount: config?.successfulSyncCount ?? 0,
    consecutiveErrors: config?.consecutiveErrors ?? 0,
    updatedBy: config?.updatedBy ?? null,
    updatedAt: config?.updatedAt ?? null,
    recentActivity: recentAudit.map((a) => ({
      action: a.action,
      description: a.description,
      actorName: a.actorName,
      actorGrade: a.actorGrade,
      createdAt: a.createdAt,
    })),
  })
}
