import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { inventory, inventoryAttachments, INVENTORY_ATTACHMENT_TYPES } from '@/lib/db/schema'
import { getDownloadPresignedUrl } from '@/lib/storage/s3'

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

  const { id } = await params

  // El ítem debe existir
  const item = await db.query.inventory.findFirst({
    where: eq(inventory.id, id),
    columns: { id: true },
  })
  if (!item) {
    return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
  }

  const attachments = await db.query.inventoryAttachments.findMany({
    where: eq(inventoryAttachments.inventoryId, id),
    orderBy: desc(inventoryAttachments.uploadedAt),
    with: {
      uploadedByProfile: { columns: { fullName: true } },
    },
  })

  // Generar URLs firmadas de descarga (válidas 1h)
  const withUrls = await Promise.all(
    attachments.map(async (a) => ({
      id: a.id,
      type: a.type,
      fileName: a.fileName,
      fileSizeBytes: a.fileSizeBytes,
      mimeType: a.mimeType,
      uploadedAt: a.uploadedAt,
      uploadedBy: a.uploadedByProfile?.fullName ?? 'Desconocido',
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

  const { id } = await params

  // Validar ítem
  const item = await db.query.inventory.findFirst({
    where: eq(inventory.id, id),
    columns: { id: true },
  })
  if (!item) {
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
  const existing = await db.query.inventoryAttachments.findMany({
    where: eq(inventoryAttachments.inventoryId, id),
    columns: { id: true },
  })
  if (existing.length >= MAX_ATTACHMENTS_PER_ITEM) {
    return NextResponse.json(
      { error: `Máximo ${MAX_ATTACHMENTS_PER_ITEM} adjuntos por ítem` },
      { status: 409 }
    )
  }

  const profileId = (session.user as any).profileId as string | undefined

  const [created] = await db
    .insert(inventoryAttachments)
    .values({
      inventoryId: id,
      type: parsed.data.type,
      fileName: parsed.data.fileName,
      fileKey: parsed.data.fileKey,
      fileSizeBytes: parsed.data.fileSizeBytes,
      mimeType: parsed.data.mimeType,
      uploadedBy: profileId ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning()

  return NextResponse.json({ attachment: created }, { status: 201 })
}
