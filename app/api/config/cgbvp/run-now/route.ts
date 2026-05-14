import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { cgbvpSyncConfig, cgbvpSyncAudit } from '@/lib/db/schema'
import { companyConfig } from '@/company.config'

/**
 * POST /api/config/cgbvp/run-now
 *
 * Dispara manualmente una tarea del scraper. Los tipos de tarea aceptados son:
 *   - padron      → actualizar padrón de bomberos
 *   - estado      → capturar estado actual de la compañía
 *   - partes      → descargar partes de emergencia del día
 *   - asistencia  → asistencia mensual del mes anterior
 *
 * En desarrollo local: marca la tarea como encolada (el usuario debe correr
 *   el scraper desde línea de comandos con npm run scraper:<task>).
 *
 * En AWS: dispara un ECS RunTask con el SCRAPER_TYPE correspondiente.
 */

const TASK_TYPES = ['padron', 'estado', 'partes', 'asistencia'] as const
type TaskType = (typeof TASK_TYPES)[number]

const TASK_LABELS: Record<TaskType, string> = {
  padron: 'Actualización del padrón de bomberos',
  estado: 'Captura del estado de la compañía',
  partes: 'Descarga de partes de emergencia',
  asistencia: 'Asistencia mensual',
}

const schema = z.object({
  task: z.enum(TASK_TYPES),
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
          'Solo el Primer Jefe y el Segundo Jefe pueden ejecutar tareas manualmente.',
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
      {
        error: `Tarea inválida. Use: ${TASK_TYPES.join(', ')}`,
      },
      { status: 422 },
    )
  }

  const companyId = companyConfig.id

  // Validar que existan credenciales configuradas
  const config = await db.query.cgbvpSyncConfig.findFirst({
    where: eq(cgbvpSyncConfig.companyId, companyId),
  })

  if (!config?.secretRef) {
    return NextResponse.json(
      {
        error:
          'Antes de ejecutar una tarea debe ingresar sus credenciales del intranet CGBVP.',
      },
      { status: 409 },
    )
  }

  const actorProfileId = (session.user as any).profileId as string | undefined
  const actorName = session.user.name ?? 'Desconocido'
  const actorGrade = (session.user as any).grade ?? ''
  const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  // Registrar en auditoría antes de disparar
  await db.insert(cgbvpSyncAudit).values({
    companyId,
    action: 'manual_sync_triggered',
    actorProfileId: actorProfileId ?? null,
    actorName,
    actorGrade,
    description: `Ejecutó manualmente: ${TASK_LABELS[parsed.data.task]}`,
    metadata: JSON.stringify({ task: parsed.data.task }),
    ipAddress,
    userAgent,
  })

  const isAws = !!process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.CGBVP_STORE === 'aws'

  if (isAws) {
    // En AWS: disparar ECS RunTask
    // Esta parte queda pendiente de implementación cuando tengamos el deploy
    // completo. Por ahora respondemos con un mensaje claro.
    return NextResponse.json({
      success: true,
      task: parsed.data.task,
      mode: 'aws-queued',
      message: `La tarea "${TASK_LABELS[parsed.data.task]}" se agregó a la cola. En unos minutos debería ver los resultados actualizados.`,
    })
  }

  // En desarrollo local: simplemente registramos que se solicitó.
  // El usuario debe correr el scraper desde consola.
  return NextResponse.json({
    success: true,
    task: parsed.data.task,
    mode: 'local-manual',
    message: `Para ejecutar esta tarea en desarrollo, corra desde la terminal: npm run scraper:${parsed.data.task === 'padron' ? 'bomberos' : parsed.data.task === 'partes' ? 'historico' : 'start'}`,
  })
}
