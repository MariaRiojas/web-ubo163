import 'server-only'
import { ddb, TABLE, ScanCommand, QueryCommand } from '@/lib/db/dynamodb'
import type { Machine, MachineCompartment } from '@/lib/db/schema/machines'
import type { InventoryItem } from '@/lib/db/schema/inventory'
import type { Section } from '@/lib/db/schema/sections'

export interface SetupItem {
  itemId: string
  name: string
  category: string
  condition: string
}
export interface SetupCompartment {
  compartmentId: string
  name: string
  type: string
  qrCode: string
  displayOrder: number
  items: SetupItem[]
}
export interface SetupMachine {
  machine: Machine
  compartments: SetupCompartment[]
  itemCount: number
}
export interface MaquinasSetupData {
  machines: SetupMachine[]
  unassignedItems: SetupItem[]
  sectionId: string | null
}

async function getMaquinasSectionId(): Promise<string | null> {
  const { Items } = await ddb.send(new QueryCommand({
    TableName: TABLE.sections, IndexName: 'key-index',
    KeyConditionExpression: '#k = :key',
    ExpressionAttributeNames: { '#k': 'key' },
    ExpressionAttributeValues: { ':key': 'maquinas' }, Limit: 1,
  }))
  return (Items?.[0] as Section | undefined)?.sectionId ?? null
}

const toItem = (i: InventoryItem): SetupItem => ({
  itemId: i.itemId, name: i.name, category: i.category, condition: i.condition,
})

export async function getMaquinasSetupData(): Promise<MaquinasSetupData> {
  const sectionId = await getMaquinasSectionId()

  // Máquinas (no baja)
  const { Items: machineItems } = await ddb.send(new ScanCommand({
    TableName: TABLE.machines,
    FilterExpression: '#st <> :baja',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':baja': 'baja' },
  }))
  const machines = ((machineItems ?? []) as Machine[]).sort((a, b) => a.label.localeCompare(b.label))

  // Gabinetes activos por máquina
  const compsByMachine = new Map<string, MachineCompartment[]>()
  await Promise.all(machines.map(async m => {
    const { Items } = await ddb.send(new QueryCommand({
      TableName: TABLE.machineCompartments,
      KeyConditionExpression: 'machineId = :mid',
      FilterExpression: 'active = :t',
      ExpressionAttributeValues: { ':mid': m.machineId, ':t': true },
    }))
    const list = ((Items ?? []) as MachineCompartment[]).sort((a, b) => a.displayOrder - b.displayOrder)
    compsByMachine.set(m.machineId, list)
  }))

  // Inventario de la sección de máquinas
  let inventory: InventoryItem[] = []
  if (sectionId) {
    const { Items } = await ddb.send(new QueryCommand({
      TableName: TABLE.inventory, IndexName: 'sectionId-index',
      KeyConditionExpression: 'sectionId = :sid',
      ExpressionAttributeValues: { ':sid': sectionId },
    }))
    inventory = (Items ?? []) as InventoryItem[]
  }
  const itemsByCompartment = new Map<string, InventoryItem[]>()
  const unassigned: InventoryItem[] = []
  for (const it of inventory) {
    if (it.compartmentId) {
      const list = itemsByCompartment.get(it.compartmentId) ?? []
      list.push(it)
      itemsByCompartment.set(it.compartmentId, list)
    } else {
      unassigned.push(it)
    }
  }

  const setupMachines: SetupMachine[] = machines.map(m => {
    const comps = (compsByMachine.get(m.machineId) ?? []).map<SetupCompartment>(c => ({
      compartmentId: c.compartmentId, name: c.name, type: c.type, qrCode: c.qrCode, displayOrder: c.displayOrder,
      items: (itemsByCompartment.get(c.compartmentId) ?? []).map(toItem).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    return { machine: m, compartments: comps, itemCount: comps.reduce((acc, c) => acc + c.items.length, 0) }
  })

  return {
    machines: setupMachines,
    unassignedItems: unassigned.map(toItem).sort((a, b) => a.name.localeCompare(b.name)),
    sectionId,
  }
}
