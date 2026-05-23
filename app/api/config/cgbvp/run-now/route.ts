import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { ddb, TABLE, GetCommand, PutCommand, now } from '@/lib/db/dynamodb'
import type { CgbvpSyncConfig } from '@/lib/db/schema/cgbvp-sync'
import { companyConfig } from '@/company.config'

/**
 * POST /api/config/cgbvp/run-now
 *
 * Dispara manualmente el scraper Lambda con el scraperType indicado.
 * En desarrollo local registra la solicitud sin invocar Lambda.
 */

const TASK_TYPES = ['padron', 'estado', 'partes', 'asistencia'] as const
type TaskType = (typeof TASK_TYPES)[number]

const TASK_LABELS: Record<TaskType, string> = {
  padron: 'Actualización del padrón de bomberos',
  estado: 'Captura del estado de la compañía',
  partes: 'Descarga de partes de emergencia',
  asistencia: 'Asistencia mensual',
}

const TASK_SCRAPER_MAP: Record<TaskType, string> = {
  padron: 'bomberos',
  estado: 'estado-cia',
  partes: 'partes-cia',
  asistencia: 'asistencia-mensual',
}

const schema = z.object({ task: z.enum(TASK_TYPES) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Su sesión no está activa. Vuelva a ingresar.' }, { status: 401 })
  }

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!hasPermission(permissions, 'company.manage')) {
    return NextResponse.json(
      { error: 'Solo el Primer Jefe y el Segundo Jefe pueden ejecutar tareas manualmente.' },
      { status: 403 }
    )
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'La información enviada no se pudo procesar.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: `Tarea inválida. Use: ${TASK_TYPES.join(', ')}` }, { status: 422 })
  }

  const configRes = await ddb.send(new GetCommand({
    TableName: TABLE.cgbvpSync,
    Key: { syncType: 'config', timestamp: 'LATEST' },
  }))
  const config = configRes.Item as CgbvpSyncConfig | undefined

  if (!config?.secretRef) {
    return NextResponse.json(
      { error: 'Antes de ejecutar una tarea debe ingresar sus credenciales del intranet CGBVP.' },
      { status: 409 }
    )
  }

  const actorProfileId = (session.user as any).profileId as string | undefined
  const actorName = session.user.name ?? 'Desconocido'
  const actorGrade = (session.user as any).grade ?? ''
  const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const userAgent = req.headers.get('user-agent') ?? null
  const ts = now()

  // Registrar auditoría
  await ddb.send(new PutCommand({
    TableName: TABLE.cgbvpSync,
    Item: {
      syncType: 'audit',
      timestamp: ts,
      companyId: config.companyId,
      action: 'manual_sync_triggered',
      actorProfileId: actorProfileId ?? null,
      actorName,
      actorGrade,
      description: `Ejecutó manualmente: ${TASK_LABELS[parsed.data.task]}`,
      metadata: JSON.stringify({ task: parsed.data.task }),
      ipAddress,
      userAgent,
      createdAt: ts,
    },
  }))

  const isAws = !!process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.CGBVP_STORE === 'aws'

  if (isAws) {
    // Invocar scraper Lambda asíncronamente
    const scraperType = TASK_SCRAPER_MAP[parsed.data.task]
    const funcName = process.env.SCRAPER_FUNCTION_NAME
      ?? `${process.env.TABLE_PREFIX ?? 'ubo163-dev'}-scraper`

    try {
      const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda')
      const lambda = new LambdaClient({})
      await lambda.send(new InvokeCommand({
        FunctionName: funcName,
        InvocationType: 'Event', // asíncrono — no espera resultado
        Payload: Buffer.from(JSON.stringify({ scraperType })),
      }))
    } catch (err: any) {
      console.error('[run-now] Error invocando Lambda:', err)
    }

    return NextResponse.json({
      success: true,
      task: parsed.data.task,
      mode: 'aws-queued',
      message: `La tarea "${TASK_LABELS[parsed.data.task]}" fue enviada al scraper. En unos minutos debería ver los resultados actualizados.`,
    })
  }

  return NextResponse.json({
    success: true,
    task: parsed.data.task,
    mode: 'local-manual',
    message: `Para ejecutar en desarrollo, corra desde la terminal: npm run scraper:${parsed.data.task === 'padron' ? 'bomberos' : parsed.data.task === 'partes' ? 'historico' : 'start'}`,
  })
}
