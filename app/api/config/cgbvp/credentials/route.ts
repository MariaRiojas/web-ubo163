import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { ddb, TABLE, GetCommand, PutCommand, UpdateCommand, now } from '@/lib/db/dynamodb'
import type { CgbvpSyncConfig } from '@/lib/db/schema/cgbvp-sync'
import {
  saveCgbvpCredentials,
  deleteCgbvpCredentials,
  maskUsername,
} from '@/lib/cgbvp/credentials-store'
import { testCgbvpLogin } from '@/lib/cgbvp/test-login'
import { companyConfig } from '@/company.config'

const saveSchema = z.object({
  username: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres').max(50),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres').max(100),
  consent: z.literal(true, { errorMap: () => ({ message: 'Debe aceptar el consentimiento para continuar.' }) }),
})

/** Helper para insertar una entrada en el log de auditoría */
async function insertAudit(fields: {
  companyId: string
  action: string
  actorProfileId?: string | null
  actorName?: string
  actorGrade?: string
  description?: string
  metadata?: string
  ipAddress?: string | null
  userAgent?: string | null
}) {
  const ts = now()
  await ddb.send(new PutCommand({
    TableName: TABLE.cgbvpSync,
    Item: { syncType: 'audit', timestamp: ts, createdAt: ts, ...fields },
  }))
}

// ─── POST — Guardar o actualizar credenciales ─────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Su sesión no está activa. Vuelva a ingresar.' }, { status: 401 })
  }

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!hasPermission(permissions, 'company.manage')) {
    return NextResponse.json(
      { error: 'Solo el Primer Jefe y el Segundo Jefe pueden configurar las credenciales del CGBVP.' },
      { status: 403 }
    )
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'La información enviada no se pudo procesar.' }, { status: 400 })
  }

  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Información inválida.' }, { status: 422 })
  }

  const { username, password } = parsed.data
  const companyId = companyConfig.id
  const actorProfileId = (session.user as any).profileId as string | undefined
  const actorName = session.user.name ?? 'Desconocido'
  const actorGrade = (session.user as any).grade ?? ''
  const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  // Registrar consentimiento antes del login de prueba
  await insertAudit({ companyId, action: 'consent_accepted', actorProfileId, actorName, actorGrade,
    description: 'Aceptó el consentimiento para el uso de credenciales CGBVP', ipAddress, userAgent })

  const testResult = await testCgbvpLogin({ username, password })

  if (!testResult.success) {
    await insertAudit({ companyId, action: 'login_test_failed', actorProfileId, actorName, actorGrade,
      description: `Intento de validación rechazado: ${testResult.errorCode ?? 'unknown'}`,
      metadata: JSON.stringify({ errorCode: testResult.errorCode, durationMs: testResult.durationMs }),
      ipAddress, userAgent })
    return NextResponse.json({ error: testResult.error, errorCode: testResult.errorCode }, { status: 422 })
  }

  let saveResult
  try {
    saveResult = await saveCgbvpCredentials(companyId, { username, password })
  } catch {
    return NextResponse.json(
      { error: 'No pudimos guardar sus credenciales de forma segura. Contacte al administrador del sistema.' },
      { status: 500 }
    )
  }

  const masked = maskUsername(username)
  const ts = now()

  const configRes = await ddb.send(new GetCommand({
    TableName: TABLE.cgbvpSync,
    Key: { syncType: 'config', timestamp: 'LATEST' },
  }))
  const existing = configRes.Item as CgbvpSyncConfig | undefined

  if (existing) {
    await ddb.send(new UpdateCommand({
      TableName: TABLE.cgbvpSync,
      Key: { syncType: 'config', timestamp: 'LATEST' },
      UpdateExpression: 'SET secretRef = :sr, maskedUsername = :mu, credentialsOwnerName = :co, lastValidatedAt = :lv, lastSyncError = :null, updatedBy = :ub, updatedAt = :t',
      ExpressionAttributeValues: {
        ':sr': saveResult.secretRef,
        ':mu': masked,
        ':co': `${actorGrade} ${actorName}`.trim(),
        ':lv': ts,
        ':null': null,
        ':ub': actorProfileId ?? null,
        ':t': ts,
      },
    }))
  } else {
    await ddb.send(new PutCommand({
      TableName: TABLE.cgbvpSync,
      Item: {
        syncType: 'config',
        timestamp: 'LATEST',
        companyId,
        secretRef: saveResult.secretRef,
        maskedUsername: masked,
        credentialsOwnerName: `${actorGrade} ${actorName}`.trim(),
        lastValidatedAt: ts,
        lastSyncStatus: 'never',
        autoSyncEnabled: false,
        successfulSyncCount: 0,
        consecutiveErrors: 0,
        updatedBy: actorProfileId ?? null,
        createdAt: ts,
        updatedAt: ts,
      },
    }))
  }

  await Promise.all([
    insertAudit({ companyId, action: 'login_test_ok', actorProfileId, actorName, actorGrade,
      description: 'Las credenciales fueron validadas con el intranet del CGBVP',
      metadata: JSON.stringify({ durationMs: testResult.durationMs }), ipAddress, userAgent }),
    insertAudit({ companyId, action: existing ? 'credentials_updated' : 'credentials_created',
      actorProfileId, actorName, actorGrade,
      description: existing
        ? 'Actualizó las credenciales de acceso al CGBVP'
        : 'Registró las credenciales de acceso al CGBVP por primera vez',
      metadata: JSON.stringify({ maskedUsername: masked }), ipAddress, userAgent }),
  ])

  return NextResponse.json({
    success: true,
    maskedUsername: masked,
    lastValidatedAt: ts,
    message: 'Sus credenciales fueron validadas y guardadas correctamente. Ya puede activar la descarga automática de datos.',
  })
}

// ─── DELETE — Eliminar credenciales ──────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Su sesión no está activa. Vuelva a ingresar.' }, { status: 401 })
  }

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!hasPermission(permissions, 'company.manage')) {
    return NextResponse.json(
      { error: 'Solo el Primer Jefe y el Segundo Jefe pueden eliminar las credenciales del CGBVP.' },
      { status: 403 }
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
  } catch {
    return NextResponse.json(
      { error: 'No pudimos eliminar las credenciales. Inténtelo nuevamente en unos minutos.' },
      { status: 500 }
    )
  }

  const ts = now()

  await Promise.all([
    ddb.send(new UpdateCommand({
      TableName: TABLE.cgbvpSync,
      Key: { syncType: 'config', timestamp: 'LATEST' },
      UpdateExpression: 'SET secretRef = :null, maskedUsername = :null, credentialsOwnerName = :null, autoSyncEnabled = :f, lastSyncStatus = :n, lastSyncError = :null, updatedBy = :ub, updatedAt = :t',
      ExpressionAttributeValues: {
        ':null': null, ':f': false, ':n': 'never',
        ':ub': actorProfileId ?? null, ':t': ts,
      },
    })),
    insertAudit({ companyId, action: 'credentials_deleted', actorProfileId, actorName, actorGrade,
      description: 'Eliminó las credenciales del CGBVP y detuvo la descarga automática', ipAddress, userAgent }),
    insertAudit({ companyId, action: 'auto_sync_disabled', actorProfileId, actorName, actorGrade,
      description: 'La descarga automática se detuvo porque se eliminaron las credenciales', ipAddress, userAgent }),
  ])

  return NextResponse.json({
    success: true,
    message: 'Las credenciales se eliminaron correctamente. La descarga automática de datos está detenida. Para reactivarla deberá ingresar nuevas credenciales.',
  })
}
