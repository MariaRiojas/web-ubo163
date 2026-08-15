'use server'

import { ddb, TABLE, QueryCommand, ScanCommand, BatchWriteCommand, generateId, now } from '@/lib/db/dynamodb'
import type { Section } from '@/lib/db/schema/sections'
import type { Profile } from '@/lib/db/schema/profiles'
import type { NewInventoryItem } from '@/lib/db/schema/inventory'
import { revalidatePath } from 'next/cache'

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

export async function importInventoryRowsAction(areaKey: string, rows: any[]) {
  try {
    const section = await getSectionByKey(areaKey)
    if (!section) {
      throw new Error(`No se encontró la sección para el área: ${areaKey}`)
    }

    const codigos = rows
      .map(r => r.data.assignedCodigo)
      .filter(Boolean) as string[]

    const profileMap = new Map<string, string>()

    if (codigos.length > 0) {
      // Look for profiles by codigoCgbvp
      for (const codigo of codigos) {
        const { Items } = await ddb.send(new QueryCommand({
          TableName: TABLE.profiles,
          IndexName: 'codigoCgbvp-index',
          KeyConditionExpression: 'codigoCgbvp = :c',
          ExpressionAttributeValues: { ':c': codigo },
          Limit: 1,
        }))
        if (Items?.[0]) {
          const p = Items[0] as Profile
          profileMap.set(codigo, p.profileId)
        }
      }

      // For DNI-based codes not found yet
      const remaining = codigos.filter(c => !profileMap.has(c))
      for (const dni of remaining) {
        const { Items } = await ddb.send(new QueryCommand({
          TableName: TABLE.profiles,
          IndexName: 'dni-index',
          KeyConditionExpression: 'dni = :d',
          ExpressionAttributeValues: { ':d': dni },
          Limit: 1,
        }))
        if (Items?.[0]) {
          const p = Items[0] as Profile
          profileMap.set(dni, p.profileId)
        }
      }
    }

    const ts = now()
    const toInsert = rows.map(r => {
      const d = r.data
      const assignedProfileId = d.assignedCodigo ? profileMap.get(d.assignedCodigo) : undefined

      return {
        itemId: generateId(),
        name: d.name,
        category: d.category,
        subcategory: d.subcategory || undefined,
        brand: d.brand || undefined,
        model: d.model || undefined,
        numeroSerie: d.numeroSerie || undefined,
        codigoCbp: d.codigoCbp || undefined,
        almacenTipo: d.almacenTipo,
        almacenReferencia: d.almacenReferencia || undefined,
        ubicacionInterna: d.ubicacionInterna || undefined,
        sectionId: section.sectionId,
        assignedCodigo: d.assignedCodigo || undefined,
        assignedProfileId: assignedProfileId || undefined,
        quantity: d.quantity ?? 1,
        unitMeasure: d.unitMeasure || 'unidad',
        condition: d.condition || 'operativo',
        lote: d.lote || undefined,
        expirationDate: d.expirationDate || undefined,
        requiresCertification: d.requiresCertification,
        lastCertificationDate: d.lastCertificationDate || undefined,
        nextCertificationDate: d.nextCertificationDate || undefined,
        usefulLifeMonths: d.usefulLifeMonths,
        referenceValue: d.referenceValue || undefined,
        notes: d.notes || undefined,
        createdAt: ts,
        updatedAt: ts,
      }
    })

    // Insert in chunks of 25 (DynamoDB BatchWrite limit)
    const chunkSize = 25
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize)
      await ddb.send(new BatchWriteCommand({
        RequestItems: {
          [TABLE.inventory]: chunk.map(item => ({ PutRequest: { Item: item } })),
        },
      }))
    }

    revalidatePath(`/areas/${areaKey}/inventario`)
    return { success: true, count: toInsert.length }
  } catch (error: any) {
    console.error('Error en importInventoryRowsAction:', error)
    return { success: false, error: error.message }
  }
}
