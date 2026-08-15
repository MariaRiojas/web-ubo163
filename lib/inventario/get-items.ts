import { ddb, ScanCommand, GetCommand, TABLE } from '@/lib/db/dynamodb'

export interface InventoryItemDB {
  itemId: string
  name: string
  category: string
  sectionId: string
  condition: string
  quantity: number
  unitMeasure: string | null
  brand: string | null
  model: string | null
  almacenTipo: string | null
  ubicacionInterna: string | null
  serialNumber: string | null
  notes: string | null
  inbpCode?: string | null
  active?: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
}

const SECTION_MAP: Record<string, { name: string; key: string }> = {
  'sec-servicios':     { name: 'Servicios Generales', key: 'servicios_generales' },
  'sec-prehospitalaria': { name: 'Prehospitalaria',  key: 'prehospitalaria' },
  'sec-maquinas':      { name: 'Máquinas',            key: 'maquinas' },
  'sec-instruccion':   { name: 'Instrucción',         key: 'instruccion' },
  'sec-administracion':{ name: 'Administración',      key: 'administracion' },
  'sec-imagen':        { name: 'Imagen',              key: 'imagen' },
  'sec-jefatura':      { name: 'Jefatura',            key: 'jefatura' },
}

export function resolveSection(sectionId: string) {
  return SECTION_MAP[sectionId] ?? { name: sectionId, key: sectionId }
}

export async function getAllInventoryItems(): Promise<InventoryItemDB[]> {
  const result = await ddb.send(new ScanCommand({ TableName: TABLE.inventory }))
  const items = (result.Items ?? []) as InventoryItemDB[]
  return items.filter(i => i.active !== false)
}

export async function getInventoryItem(itemId: string): Promise<InventoryItemDB | null> {
  const result = await ddb.send(new GetCommand({
    TableName: TABLE.inventory,
    Key: { itemId },
  }))
  return (result.Item as InventoryItemDB) ?? null
}
