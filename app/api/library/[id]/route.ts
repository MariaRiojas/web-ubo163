import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand, DeleteCommand, UpdateCommand, now } from '@/lib/db/dynamodb'
import { getDownloadPresignedUrl, deleteFile } from '@/lib/storage/s3'
import type { Permission } from '@/lib/auth/permissions'
import { LIBRARY_CATEGORIES } from '@/lib/db/schema/training'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const res = await ddb.send(new GetCommand({ TableName: TABLE.libraryDocuments, Key: { docId: id } }))
  if (!res.Item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const url = await getDownloadPresignedUrl(res.Item.fileKey as string, 3600)
  return NextResponse.json({ url, item: res.Item })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!permissions.includes('area.instruction.manage')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { title, description, category } = body

  if (!title || !category) {
    return NextResponse.json({ error: 'title y category son requeridos' }, { status: 400 })
  }
  if (!LIBRARY_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE.libraryDocuments,
    Key: { docId: id },
    UpdateExpression: 'SET #t = :title, #d = :desc, #c = :cat, updatedAt = :ts',
    ExpressionAttributeNames: { '#t': 'title', '#d': 'description', '#c': 'category' },
    ExpressionAttributeValues: {
      ':title': title,
      ':desc': description ?? null,
      ':cat': category,
      ':ts': now(),
    },
  }))

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!permissions.includes('area.instruction.manage')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { id } = await params
  const res = await ddb.send(new GetCommand({ TableName: TABLE.libraryDocuments, Key: { docId: id } }))
  if (!res.Item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await Promise.all([
    ddb.send(new DeleteCommand({ TableName: TABLE.libraryDocuments, Key: { docId: id } })),
    deleteFile(res.Item.fileKey as string).catch(() => {}),
  ])

  return NextResponse.json({ success: true })
}
