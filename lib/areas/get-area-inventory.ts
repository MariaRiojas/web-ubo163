import 'server-only'
import { db } from '@/lib/db'
import { inventory, sections, profiles } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
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

export async function getAreaInventory(areaKey: AreaKey): Promise<{
  sectionId: string | null
  items: InventoryRow[]
}> {
  const [section] = await db
    .select()
    .from(sections)
    .where(eq(sections.key, areaKey))
    .limit(1)

  if (!section) return { sectionId: null, items: [] }

  const rows = await db
    .select({
      inv: inventory,
      assignedName: profiles.fullName,
    })
    .from(inventory)
    .leftJoin(profiles, eq(inventory.assignedProfileId, profiles.id))
    .where(eq(inventory.sectionId, section.id))
    .orderBy(asc(inventory.name))

  const items: InventoryRow[] = rows.map((r) => ({
    id: r.inv.id,
    name: r.inv.name,
    category: r.inv.category,
    subcategory: r.inv.subcategory,
    brand: r.inv.brand,
    model: r.inv.model,
    codigoCbp: r.inv.codigoCbp,
    numeroSerie: r.inv.numeroSerie,
    quantity: r.inv.quantity ?? 1,
    unitMeasure: r.inv.unitMeasure ?? 'unidad',
    condition: r.inv.condition,
    almacenTipo: r.inv.almacenTipo,
    almacenReferencia: r.inv.almacenReferencia,
    ubicacionInterna: r.inv.ubicacionInterna,
    expirationDate: r.inv.expirationDate,
    endOfLifeDate: r.inv.endOfLifeDate,
    notes: r.inv.notes,
    assignedTo: r.assignedName ?? null,
  }))

  return { sectionId: section.id, items }
}
