import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { cgbvpSyncConfig, cgbvpSyncAudit } from '@/lib/db/schema'
import {
  saveCgbvpCredentials,
  deleteCgbvpCredentials,
  maskUsername,
} from '@/lib/cgbvp/credentials-store'
import { testCgbvpLogin } from '@/lib/cgbvp/test-login'
import { companyConfig } from '@/company.config'

// ═══════════════════════════════════════════════════════════════════
// POST — Guardar o actualizar credenciales
//
// Flujo:
//   1. Valida sesión y permiso company.manage
//   2. Registra el consentimiento del Jefe
//   3. Ejecuta un login de prueba contra el intranet CGBVP
//   4. Si OK: guarda cifrado en Secrets Manager (o archivo local en dev)
//   5. Hace upsert en cgbvp_sync_config
//   6. Registra auditoría completa
//   7. Devuelve el estado nuevo
// ═══════════════════════════════════════════════════════════════════

const saveSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(50, 'El usuario es demasiado largo'),
  password: z
    .string()
    .min(4, 'La contraseña debe tener al menos 4 caracteres')
    .max(100, 'La contraseña es demasiado larga'),
  /**
   * El Jefe debe marcar explícitamente el consentimiento antes de guardar.
   * Si es false, rechazamos con 400.
   */
  consent: z.literal(true, {
    errorMap: () => ({
      message: 'Debe aceptar el consentimiento para continuar.',
    }),
  }),
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
          'Solo el Primer Jefe y el Segundo Jefe pueden configurar las credenciales del CGBVP.',
      },
      { status: 403 },
    )
  }

  // Parsear y validar body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'La información enviada no se pudo procesar.' },
      { status: 400 },
    )
  }

  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Información inválida.' },
      { status: 422 },
    )
  }

  const { username, password } = parsed.data
  const companyId = companyConfig.id
  const actorProfileId = (session.user as any).profileId as string | undefined
  const actorName = session.user.name ?? 'Desconocido'
  const actorGrade = (session.user as any).grade ?? ''
  const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  // Registrar el consentimiento ANTES de intentar login (el Jefe aceptó
  // antes de que valide, queremos trazabilidad aunque la validación falle)
  await db.insert(cgbvpSyncAudit).values({
    companyId,
    action: 'consent_accepted',
    actorProfileId: actorProfileId ?? null,
    actorName,
    actorGrade,
    description: `Aceptó el consentimiento para el uso de credenciales CGBVP`,
    ipAddress,
    userAgent,
  })

  // Probar login contra el CGBVP
  const testResult = await testCgbvpLogin({ username, password })

  if (!testResult.success) {
    // Registrar fallo en auditoría
    await db.insert(cgbvpSyncAudit).values({
      companyId,
      action: 'login_test_failed',
      actorProfileId: actorProfileId ?? null,
      actorName,
      actorGrade,
      description: `Intento de validación rechazado: ${testResult.errorCode ?? 'unknown'}`,
      metadata: JSON.stringify({
        errorCode: testResult.errorCode,
        durationMs: testResult.durationMs,
      }),
      ipAddress,
      userAgent,
    })

    return NextResponse.json(
      {
        error: testResult.error,
        errorCode: testResult.errorCode,
      },
      { status: 422 },
    )
  }

  // Login validado: guardar cifrado
  let saveResult
  try {
    saveResult = await saveCgbvpCredentials(companyId, { username, password })
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          'No pudimos guardar sus credenciales de forma segura. Contacte al administrador del sistema.',
      },
      { status: 500 },
    )
  }

  const masked = maskUsername(username)
  const now = new Date()

  // Verificar si ya existía un registro (para saber si es create o update)
  const existing = await db.query.cgbvpSyncConfig.findFirst({
    where: eq(cgbvpSyncConfig.companyId, companyId),
  })

  if (existing) {
    await db
      .update(cgbvpSyncConfig)
      .set({
        secretRef: saveResult.secretRef,
        maskedUsername: masked,
        credentialsOwnerName: `${actorGrade} ${actorName}`.trim(),
        lastValidatedAt: now,
        lastSyncStatus: existing.lastSyncStatus === 'invalid_credentials' ? 'never' : existing.lastSyncStatus,
        lastSyncError: null,
        updatedBy: actorProfileId ?? null,
        updatedAt: now,
      })
      .where(eq(cgbvpSyncConfig.companyId, companyId))
  } else {
    await db.insert(cgbvpSyncConfig).values({
      companyId,
      secretRef: saveResult.secretRef,
      maskedUsername: masked,
      credentialsOwnerName: `${actorGrade} ${actorName}`.trim(),
      lastValidatedAt: now,
      lastSyncStatus: 'never',
      autoSyncEnabled: false,
      updatedBy: actorProfileId ?? null,
    })
  }

  // Registrar en auditoría
  await db.insert(cgbvpSyncAudit).values([
    {
      companyId,
      action: 'login_test_ok',
      actorProfileId: actorProfileId ?? null,
      actorName,
      actorGrade,
      description: 'Las credenciales fueron validadas con el intranet del CGBVP',
      metadata: JSON.stringify({ durationMs: testResult.durationMs }),
      ipAddress,
      userAgent,
    },
    {
      companyId,
      action: existing ? 'credentials_updated' : 'credentials_created',
      actorProfileId: actorProfileId ?? null,
      actorName,
      actorGrade,
      description: existing
        ? `Actualizó las credenciales de acceso al CGBVP`
        : `Registró las credenciales de acceso al CGBVP por primera vez`,
      metadata: JSON.stringify({ maskedUsername: masked }),
      ipAddress,
      userAgent,
    },
  ])

  return NextResponse.json({
    success: true,
    maskedUsername: masked,
    lastValidatedAt: now.toISOString(),
    message:
      'Sus credenciales fueron validadas y guardadas correctamente. Ya puede activar la descarga automática de datos.',
  })
}

// ═══════════════════════════════════════════════════════════════════
// DELETE — Eliminar credenciales
// ═══════════════════════════════════════════════════════════════════

export async function DELETE(req: NextRequest) {
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
          'Solo el Primer Jefe y el Segundo Jefe pueden eliminar las credenciales del CGBVP.',
      },
      { status: 403 },
    )
  }

  const companyId = companyConfig.id
  const actorProfileId = (session.user as any).profileId as string | undefined
  const actorName = session.user.name ?? 'Desconocido'
  const actorGrade = (session.user as any).grade ?? ''
  const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  try {
    await deleteCgbvpCredentials(companyId)
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          'No pudimos eliminar las credenciales. Inténtelo nuevamente en unos minutos.',
      },
      { status: 500 },
    )
  }

  // Resetear el registro de configuración (mantener el registro pero vaciar los campos
  // de credenciales para preservar el historial)
  await db
    .update(cgbvpSyncConfig)
    .set({
      secretRef: null,
      maskedUsername: null,
      credentialsOwnerName: null,
      autoSyncEnabled: false,
      lastSyncStatus: 'never',
      lastSyncError: null,
      updatedBy: actorProfileId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(cgbvpSyncConfig.companyId, companyId))

  await db.insert(cgbvpSyncAudit).values([
    {
      companyId,
      action: 'credentials_deleted',
      actorProfileId: actorProfileId ?? null,
      actorName,
      actorGrade,
      description: `Eliminó las credenciales del CGBVP y detuvo la descarga automática`,
      ipAddress,
      userAgent,
    },
    {
      companyId,
      action: 'auto_sync_disabled',
      actorProfileId: actorProfileId ?? null,
      actorName,
      actorGrade,
      description: `La descarga automática se detuvo porque se eliminaron las credenciales`,
      ipAddress,
      userAgent,
    },
  ])

  return NextResponse.json({
    success: true,
    message:
      'Las credenciales se eliminaron correctamente. La descarga automática de datos está detenida. Para reactivarla deberá ingresar nuevas credenciales.',
  })
}
