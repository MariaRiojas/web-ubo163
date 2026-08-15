'use server'

import { auth } from '@/lib/auth'
import { ddb, TABLE, QueryCommand, PutCommand, generateId, now } from '@/lib/db/dynamodb'
import type { Section } from '@/lib/db/schema/sections'
import { revalidatePath } from 'next/cache'
import { writeAuditLog, auditActor } from '@/lib/audit/write-audit'

const AREA_KEY_TO_ALMACEN: Record<string, string> = {
  maquinas:            'maquina',
  servicios_generales: 'servicios',
  instruccion:         'instruccion',
  prehospitalaria:     'sanidad',
  administracion:      'administracion',
  imagen:              'imagen',
}

const AREA_KEY_TO_SLUG: Record<string, string> = {
  maquinas:            'maquinas',
  servicios_generales: 'servicios-generales',
  instruccion:         'instruccion',
  prehospitalaria:     'prehospitalaria',
  administracion:      'administracion',
  imagen:              'imagen',
}

async function getSectionByKey(key: string): Promise<Section | null> {
  const { Items } = await ddb.send(new QueryCommand({
    TableName: TABLE.sections,
    IndexName: 'key-index',
    KeyConditionExpression: '#k = :key',
    ExpressionAttributeNames: { '#k': 'key' },
    ExpressionAttributeValues: { ':key': key },
    Limit: 1,
  }))
  return (Items?.[0] ?? null) as Section | null
}

export async function createInventoryItemAction(areaKey: string, formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    const name = (formData.get('name') as string | null)?.trim()
    const category = (formData.get('category') as string | null)?.trim()
    if (!name || !category) return { success: false, error: 'Nombre y categoría son obligatorios' }

    const section = await getSectionByKey(areaKey)

    const qty = parseInt((formData.get('quantity') as string) ?? '1', 10)
    const finalQty = isNaN(qty) || qty < 1 ? 1 : qty
    const ts = now()
    const itemId = generateId()

    await ddb.send(new PutCommand({
      TableName: TABLE.inventory,
      Item: {
        itemId,
        name,
        category,
        subcategory:      (formData.get('subcategory') as string) || undefined,
        brand:            (formData.get('brand') as string) || undefined,
        model:            (formData.get('model') as string) || undefined,
        numeroSerie:      (formData.get('numeroSerie') as string) || undefined,
        codigoCbp:        (formData.get('codigoCbp') as string) || undefined,
        quantity:         finalQty,
        unitMeasure:      (formData.get('unitMeasure') as string) || 'unidad',
        condition:        (formData.get('condition') as string) || 'operativo',
        almacenTipo:      AREA_KEY_TO_ALMACEN[areaKey] ?? 'servicios',
        ubicacionInterna: (formData.get('ubicacionInterna') as string) || undefined,
        referenceValue:   (formData.get('referenceValue') as string) || undefined,
        notes:            (formData.get('notes') as string) || undefined,
        sectionId:        section?.sectionId ?? undefined,
        createdBy:        (session.user as any).profileId ?? undefined,
        createdAt:        ts,
        updatedAt:        ts,
      },
    }))

    await writeAuditLog({
      entityType: 'inventory',
      entityId: itemId,
      entityLabel: name,
      action: 'create',
      ...auditActor(session),
      summary: `Registró el ítem «${name}» (${finalQty} ${(formData.get('unitMeasure') as string) || 'unidad'}) en el inventario de ${areaKey}`,
      after: { name, category, quantity: finalQty, sectionId: section?.sectionId },
    })

    const slug = AREA_KEY_TO_SLUG[areaKey] ?? areaKey.replace('_', '-')
    revalidatePath(`/areas/${slug}/inventario`)
    return { success: true }
  } catch (error: any) {
    console.error('Error en createInventoryItemAction:', error)
    return { success: false, error: error.message }
  }
}
