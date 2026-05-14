import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { cgbvpSyncConfig, cgbvpSyncAudit } from '@/lib/db/schema'
import { companyConfig } from '@/company.config'

/**
 * GET /api/config/cgbvp/status
 *
 * Devuelve el estado actual de la sincronización con el intranet del CGBVP:
 *   - Si hay credenciales guardadas (y su versión enmascarada)
 *   - Última sincronización exitosa / errónea
 *   - Últimas 5 acciones de auditoría
 *
 * Requiere sesión + permiso company.manage.
 */
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Su sesión no está activa. Vuelva a ingresar.' },
      { status: 401 },
    )
  }

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!hasPermission(permissions, 'company.manage')) {
    return NextResponse.json(
      {
        error:
          'Esta sección solo está disponible para el Primer Jefe y el Segundo Jefe de la compañía.',
      },
      { status: 403 },
    )
  }

  const companyId = companyConfig.id

  const config = await db.query.cgbvpSyncConfig.findFirst({
    where: eq(cgbvpSyncConfig.companyId, companyId),
    with: {
      updatedByProfile: {
        columns: { fullName: true, grade: true },
      },
    },
  })

  const recentAudit = await db.query.cgbvpSyncAudit.findMany({
    where: eq(cgbvpSyncAudit.companyId, companyId),
    orderBy: desc(cgbvpSyncAudit.createdAt),
    limit: 10,
  })

  return NextResponse.json({
    // Si no existe el registro, devolvemos un estado "nunca configurado"
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
    updatedBy: config?.updatedByProfile
      ? {
          name: config.updatedByProfile.fullName,
          grade: config.updatedByProfile.grade,
        }
      : null,
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
