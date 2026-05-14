import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { inventoryAttachments } from '@/lib/db/schema'
import { deleteFile } from '@/lib/storage/s3'

/**
 * DELETE /api/inventory/attachments/[attId]
 * Elimina un adjunto: borra el archivo de S3 y la fila de BD.
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

  const att = await db.query.inventoryAttachments.findFirst({
    where: eq(inventoryAttachments.id, attId),
    columns: { id: true, fileKey: true },
  })
  if (!att) {
    return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })
  }

  // Borrar de S3 primero (best-effort)
  try {
    await deleteFile(att.fileKey)
  } catch (err) {
    console.error('[inventory/attachments] S3 delete error:', err)
    // Continuamos con el delete de BD aunque S3 falle para no dejar registros huérfanos
  }

  await db.delete(inventoryAttachments).where(eq(inventoryAttachments.id, attId))

  return NextResponse.json({ ok: true })
}
