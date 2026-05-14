import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { cgbvpSyncConfig, cgbvpSyncAudit } from '@/lib/db/schema'
import { companyConfig } from '@/company.config'

/**
 * POST /api/config/cgbvp/auto-sync
 *
 * Activa o desactiva la descarga automática de datos. Solo tiene efecto si
 * ya hay credenciales configuradas.
 *
 * Body: { enabled: boolean }
 */

const schema = z.object({
  enabled: z.boolean(),
})

export async function POST(req: NextRequest) {
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
          'Solo el Primer Jefe y el Segundo Jefe pueden cambiar la descarga automática.',
      },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'La información enviada no se pudo procesar.' },
      { status: 400 },
    )
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Información inválida.' },
      { status: 422 },
    )
  }

  const companyId = companyConfig.id
  const actorProfileId = (session.user as any).profileId as string | undefined
  const actorName = session.user.name ?? 'Desconocido'
  const actorGrade = (session.user as any).grade ?? ''
  const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  const existing = await db.query.cgbvpSyncConfig.findFirst({
    where: eq(cgbvpSyncConfig.companyId, companyId),
  })

  if (!existing || !existing.secretRef) {
    return NextResponse.json(
      {
        error:
          'Antes de activar la descarga automática debe ingresar sus credenciales del intranet CGBVP.',
      },
      { status: 409 },
    )
  }

  // Si no hay cambio real, responder sin escribir
  if (existing.autoSyncEnabled === parsed.data.enabled) {
    return NextResponse.json({
      success: true,
      autoSyncEnabled: parsed.data.enabled,
      message: parsed.data.enabled
        ? 'La descarga automática ya estaba activada.'
        : 'La descarga automática ya estaba detenida.',
    })
  }

  await db
    .update(cgbvpSyncConfig)
    .set({
      autoSyncEnabled: parsed.data.enabled,
      updatedBy: actorProfileId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(cgbvpSyncConfig.companyId, companyId))

  await db.insert(cgbvpSyncAudit).values({
    companyId,
    action: parsed.data.enabled ? 'auto_sync_enabled' : 'auto_sync_disabled',
    actorProfileId: actorProfileId ?? null,
    actorName,
    actorGrade,
    description: parsed.data.enabled
      ? 'Activó la descarga automática de datos del CGBVP'
      : 'Detuvo la descarga automática de datos del CGBVP',
    ipAddress,
    userAgent,
  })

  return NextResponse.json({
    success: true,
    autoSyncEnabled: parsed.data.enabled,
    message: parsed.data.enabled
      ? 'La descarga automática está activa. Los datos se irán actualizando en los próximos minutos.'
      : 'La descarga automática se detuvo. Los datos ya descargados se conservan.',
  })
}
