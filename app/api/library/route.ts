import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, ScanCommand, PutCommand, generateId, now } from '@/lib/db/dynamodb'
import type { Permission } from '@/lib/auth/permissions'
import { LIBRARY_CATEGORIES } from '@/lib/db/schema/training'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const res = await ddb.send(new ScanCommand({ TableName: TABLE.libraryDocuments }))
  const items = (res.Items ?? []).sort((a: any, b: any) =>
    (b.uploadedAt ?? '').localeCompare(a.uploadedAt ?? '')
  )
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!permissions.includes('area.instruction.manage')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const body = await req.json()
  const { docId: clientDocId, title, description, category, fileKey, fileName, fileSizeBytes, mimeType } = body

  if (!title || !category || !fileKey) {
    return NextResponse.json({ error: 'title, category y fileKey son requeridos' }, { status: 400 })
  }
  if (!LIBRARY_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
  }

  // Usar el docId generado por el cliente si viene (para que el S3 key coincida),
  // o generar uno nuevo como fallback.
  const docId = clientDocId ?? generateId()
  const timestamp = now()

  await ddb.send(new PutCommand({
    TableName: TABLE.libraryDocuments,
    Item: {
      docId, title, category, fileKey, fileName: fileName ?? '',
      fileSizeBytes: fileSizeBytes ?? null,
      mimeType: mimeType ?? null,
      description: description ?? null,
      uploadedBy: (session.user as any).profileId ?? '',
      uploadedAt: timestamp,
      updatedAt: timestamp,
    },
  }))

  return NextResponse.json({ success: true, docId })
}
