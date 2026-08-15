import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, PutCommand, QueryCommand, generateId, now } from '@/lib/db/dynamodb'

const AREA_KEY_TO_ALMACEN: Record<string, string> = {
  maquinas: 'maquina', servicios_generales: 'servicios', instruccion: 'instruccion',
  prehospitalaria: 'sanidad', administracion: 'administracion', imagen: 'imagen',
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { areaKey, items } = body

    if (!areaKey) return NextResponse.json({ error: 'areaKey requerido' }, { status: 400 })

    // Get section
    const { Items: sections } = await ddb.send(new QueryCommand({
      TableName: TABLE.sections,
      IndexName: 'key-index',
      KeyConditionExpression: '#k = :key',
      ExpressionAttributeNames: { '#k': 'key' },
      ExpressionAttributeValues: { ':key': areaKey },
      Limit: 1,
    }))
    const sectionId = (sections?.[0] as any)?.sectionId ?? undefined

    const ts = now()
    const profileId = (session.user as any).profileId

    // Single item or bulk
    const rows = items ?? [body]
    const created: string[] = []

    for (const item of rows) {
      const id = generateId()
      await ddb.send(new PutCommand({
        TableName: TABLE.inventory,
        Item: {
          itemId: id,
          name: item.name,
          category: item.category,
          subcategory: item.subcategory || undefined,
          brand: item.brand || undefined,
          model: item.model || undefined,
          numeroSerie: item.numeroSerie || undefined,
          codigoCbp: item.codigoCbp || undefined,
          quantity: item.quantity ?? 1,
          unitMeasure: item.unitMeasure || 'unidad',
          condition: item.condition || 'operativo',
          almacenTipo: AREA_KEY_TO_ALMACEN[areaKey] ?? 'servicios',
          ubicacionInterna: item.ubicacionInterna || undefined,
          referenceValue: item.referenceValue || undefined,
          notes: item.notes || undefined,
          sectionId,
          createdBy: profileId,
          createdAt: ts,
          updatedAt: ts,
        },
      }))
      created.push(id)
    }

    return NextResponse.json({ success: true, count: created.length })
  } catch (error: any) {
    console.error('POST /api/inventory/create error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
