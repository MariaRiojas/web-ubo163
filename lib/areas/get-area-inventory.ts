import 'server-only'
import { ddb, TABLE, QueryCommand, ScanCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { Section } from '@/lib/db/schema/sections'
import type { InventoryItem } from '@/lib/db/schema/inventory'
import type { AreaKey } from './get-areas-hub'

export interface InventoryRow {
  id: string
  name: string
  category: string
  subcategory: string | null
  brand: string | null
  model: string | null
  codigoCbp: string | null
  numeroSerie: string | null
  quantity: number
  unitMeasure: string
  condition: string
  almacenTipo: string
  almacenReferencia: string | null
  ubicacionInterna: string | null
  expirationDate: string | null
  endOfLifeDate: string | null
  notes: string | null
  assignedTo: string | null
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

export async function getAreaInventory(areaKey: AreaKey): Promise<{
  sectionId: string | null
  items: InventoryRow[]
}> {
  const section = await getSectionByKey(areaKey)
  if (!section) return { sectionId: null, items: [] }

  const { Items } = await ddb.send(new QueryCommand({
    TableName: TABLE.inventory,
    IndexName: 'sectionId-index',
    KeyConditionExpression: 'sectionId = :sid',
    ExpressionAttributeValues: { ':sid': section.sectionId },
  }))
  const inventoryItems = (Items ?? []) as InventoryItem[]
  inventoryItems.sort((a, b) => a.name.localeCompare(b.name))

  const assignedProfileIds = [...new Set(
    inventoryItems.filter(i => i.assignedProfileId).map(i => i.assignedProfileId!),
  )]
  const profileNames = new Map<string, string>()
  if (assignedProfileIds.length > 0) {
    const { Responses } = await ddb.send(new BatchGetCommand({
      RequestItems: {
        [TABLE.profiles]: {
          Keys: assignedProfileIds.map(pid => ({ profileId: pid })),
          ProjectionExpression: 'profileId, fullName',
        },
      },
    }))
    for (const p of Responses?.[TABLE.profiles] ?? []) {
      profileNames.set(p.profileId as string, p.fullName as string)
    }
  }

  const items: InventoryRow[] = inventoryItems.map(r => ({
    id: r.itemId,
    name: r.name,
    category: r.category,
    subcategory: r.subcategory ?? null,
    brand: r.brand ?? null,
    model: r.model ?? null,
    codigoCbp: r.codigoCbp ?? null,
    numeroSerie: r.numeroSerie ?? null,
    quantity: r.quantity ?? 1,
    unitMeasure: r.unitMeasure ?? 'unidad',
    condition: r.condition,
    almacenTipo: r.almacenTipo,
    almacenReferencia: r.almacenReferencia ?? null,
    ubicacionInterna: r.ubicacionInterna ?? null,
    expirationDate: r.expirationDate ?? null,
    endOfLifeDate: r.endOfLifeDate ?? null,
    notes: r.notes ?? null,
    assignedTo: r.assignedProfileId ? (profileNames.get(r.assignedProfileId) ?? null) : null,
  }))

  return { sectionId: section.sectionId, items }
}
