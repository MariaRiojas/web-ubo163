import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { ddb, TABLE, ScanCommand, DeleteCommand } from '@/lib/db/dynamodb'
import type { InventoryAttachment } from '@/lib/db/schema/inventory'
import { deleteFile } from '@/lib/storage/s3'

/**
 * DELETE /api/inventory/attachments/[attId]
 * Elimina un adjunto: borra el archivo de S3 y el item de DynamoDB.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ attId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!hasPermission(permissions, 'inventory.manage')) {
    return NextResponse.json(
      { error: 'Sin permiso para eliminar adjuntos' },
      { status: 403 }
    )
  }

  const { attId } = await params

  // La tabla tiene PK=itemId, SK=attachmentId — necesitamos ambos para DeleteCommand.
  // Scan por attachmentId para obtener el itemId.
  const { Items } = await ddb.send(new ScanCommand({
    TableName: TABLE.inventoryAttachments,
    FilterExpression: 'attachmentId = :a',
    ExpressionAttributeValues: { ':a': attId },
    Limit: 1,
  }))

  const att = (Items?.[0] as InventoryAttachment | undefined) ?? null
  if (!att) {
    return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })
  }

  // Borrar de S3 primero (best-effort)
  try {
    await deleteFile(att.fileKey)
  } catch (err) {
    console.error('[inventory/attachments] S3 delete error:', err)
  }

  await ddb.send(new DeleteCommand({
    TableName: TABLE.inventoryAttachments,
    Key: { itemId: att.itemId, attachmentId: att.attachmentId },
  }))

  return NextResponse.json({ ok: true })
}
