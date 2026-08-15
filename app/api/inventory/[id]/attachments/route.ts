import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { ddb, TABLE, GetCommand, QueryCommand, PutCommand, BatchGetCommand, generateId, now } from '@/lib/db/dynamodb'
import { INVENTORY_ATTACHMENT_TYPES, type InventoryAttachment } from '@/lib/db/schema/inventory'
import { getDownloadPresignedUrl } from '@/lib/storage/s3'
import { writeAuditLog, auditActor } from '@/lib/audit/write-audit'

/**
 * GET /api/inventory/[id]/attachments
 * Devuelve la lista de adjuntos del ítem con URLs firmadas válidas por 1h.
 *
 * POST /api/inventory/[id]/attachments
 * Registra un adjunto ya subido a S3 via /api/storage/presign.
 * Body: { type, fileName, fileKey, fileSizeBytes, mimeType, notes? }
 */

const MAX_ATTACHMENTS_PER_ITEM = 10

const createSchema = z.object({
  type: z.enum(INVENTORY_ATTACHMENT_TYPES),
  fileName: z.string().min(1).max(255),
  fileKey: z.string().min(1).max(500),
  fileSizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
  mimeType: z.string().min(1).max(100),
  notes: z.string().max(500).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { id: itemId } = await params

  // Verificar que el ítem existe
  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.inventory,
    Key: { itemId },
    ProjectionExpression: 'itemId',
  }))
  if (!Item) {
    return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
  }

  // Obtener todos los adjuntos del ítem (PK = itemId)
  const { Items } = await ddb.send(new QueryCommand({
    TableName: TABLE.inventoryAttachments,
    KeyConditionExpression: 'itemId = :iid',
    ExpressionAttributeValues: { ':iid': itemId },
    ScanIndexForward: false,
  }))
  const attachments = (Items ?? []) as InventoryAttachment[]

  // Obtener nombres de los uploader en batch si hay perfiles
  const uploaderIds = [...new Set(attachments.map((a) => a.uploadedBy).filter(Boolean) as string[])]
  const uploaderNames = new Map<string, string>()
  if (uploaderIds.length > 0) {
    const { Responses } = await ddb.send(new BatchGetCommand({
      RequestItems: {
        [TABLE.profiles]: {
          Keys: uploaderIds.map((pid) => ({ profileId: pid })),
          ProjectionExpression: 'profileId, fullName',
        },
      },
    }))
    for (const p of Responses?.[TABLE.profiles] ?? []) {
      uploaderNames.set(p.profileId as string, p.fullName as string)
    }
  }

  // Generar URLs firmadas de descarga (válidas 1h)
  const withUrls = await Promise.all(
    attachments.map(async (a) => ({
      id: a.attachmentId,
      type: a.type,
      fileName: a.fileName,
      fileSizeBytes: a.fileSizeBytes,
      mimeType: a.mimeType,
      uploadedAt: a.uploadedAt,
      uploadedBy: a.uploadedBy ? (uploaderNames.get(a.uploadedBy) ?? 'Desconocido') : 'Desconocido',
      notes: a.notes,
      downloadUrl: await getDownloadPresignedUrl(a.fileKey),
    }))
  )

  return NextResponse.json({ attachments: withUrls })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!hasPermission(permissions, 'inventory.manage')) {
    return NextResponse.json(
      { error: 'Sin permiso para adjuntar archivos' },
      { status: 403 }
    )
  }

  const { id: itemId } = await params

  // Validar ítem (traer nombre para la bitácora)
  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.inventory,
    Key: { itemId },
    ProjectionExpression: 'itemId, #n, assignedCodigo',
    ExpressionAttributeNames: { '#n': 'name' },
  }))
  if (!Item) {
    return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
  }

  // Validar body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' },
      { status: 422 }
    )
  }

  // Quota por ítem
  const { Count: existingCount } = await ddb.send(new QueryCommand({
    TableName: TABLE.inventoryAttachments,
    KeyConditionExpression: 'itemId = :iid',
    ExpressionAttributeValues: { ':iid': itemId },
    Select: 'COUNT',
  }))
  if ((existingCount ?? 0) >= MAX_ATTACHMENTS_PER_ITEM) {
    return NextResponse.json(
      { error: `Máximo ${MAX_ATTACHMENTS_PER_ITEM} adjuntos por ítem` },
      { status: 409 }
    )
  }

  const profileId = (session.user as any).profileId as string | undefined
  const attachmentId = generateId()
  const ts = now()

  const newAttachment: InventoryAttachment = {
    itemId,
    attachmentId,
    type: parsed.data.type,
    fileName: parsed.data.fileName,
    fileKey: parsed.data.fileKey,
    fileSizeBytes: parsed.data.fileSizeBytes,
    mimeType: parsed.data.mimeType,
    uploadedBy: profileId,
    uploadedAt: ts,
    notes: parsed.data.notes,
  }

  await ddb.send(new PutCommand({
    TableName: TABLE.inventoryAttachments,
    Item: newAttachment,
  }))

  // ── Auditoría: la subida de un acta de asignación firmada deja traza permanente ──
  const isActa = parsed.data.type === 'acta_entrega'
  const itemName = (Item as any).name ?? itemId
  await writeAuditLog({
    entityType: 'inventory',
    entityId: itemId,
    entityLabel: itemName,
    action: 'upload',
    ...auditActor(session),
    summary: isActa
      ? `Adjuntó el acta de asignación firmada del ítem «${itemName}»`
      : `Adjuntó documento (${parsed.data.type}) al ítem «${itemName}»`,
    metadata: { attachmentId, type: parsed.data.type, fileName: parsed.data.fileName },
  })

  return NextResponse.json({ attachment: { ...newAttachment, id: attachmentId } }, { status: 201 })
}
