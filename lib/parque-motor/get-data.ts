import 'server-only'
import { ddb, TABLE, ScanCommand, GetCommand } from '@/lib/db/dynamodb'
import type { InventoryItem } from '@/lib/db/schema/inventory'
import type { MachineInspection, InspectionItemResult } from '@/lib/db/schema/machine-inspection'
import { limaDateStr } from '@/lib/instruccion/horario'
import { GRADES } from '@/lib/db/schema/profiles'

/** Un efectivo puede usar el checklist si es activo (seccionario o superior). */
export function esEfectivoActivo(grade: string, status?: string): boolean {
  if (status === 'retirado') return false
  const rank = GRADES.indexOf(grade as any)
  return rank >= GRADES.indexOf('seccionario' as any)
}

const SIN_REF = '(Sin referencia)'
const machineRefOf = (i: InventoryItem) => (i.almacenReferencia?.trim() || SIN_REF)
const gabineteOf = (i: InventoryItem) => (i.ubicacionInterna?.trim() || 'General')

/** Sólo el inventario que está físicamente dentro de una máquina. */
async function scanMachineInventory(): Promise<InventoryItem[]> {
  const { Items } = await ddb.send(new ScanCommand({
    TableName: TABLE.inventory,
    FilterExpression: 'almacenTipo = :m',
    ExpressionAttributeValues: { ':m': 'maquina' },
  }))
  return (Items ?? []) as InventoryItem[]
}

export interface ParqueMotorMachine {
  ref: string
  itemCount: number
  gabineteCount: number
  hoy: { marcados: number; faltantes: number; danados: number; lastBy: string | null; lastAt: string | null } | null
}

/** Lista de máquinas del parque motor (derivada del inventario) + progreso de hoy. */
export async function getParqueMotorList(): Promise<{ machines: ParqueMotorMachine[]; date: string }> {
  const date = limaDateStr()
  const [inv, inspRes] = await Promise.all([
    scanMachineInventory(),
    ddb.send(new ScanCommand({
      TableName: TABLE.machineInspections,
      FilterExpression: '#d = :today',
      ExpressionAttributeNames: { '#d': 'date' },
      ExpressionAttributeValues: { ':today': date },
    })),
  ])

  const byRef = new Map<string, { items: Set<string>; gabinetes: Set<string> }>()
  for (const it of inv) {
    const ref = machineRefOf(it)
    const g = byRef.get(ref) ?? { items: new Set(), gabinetes: new Set() }
    g.items.add(it.itemId)
    g.gabinetes.add(gabineteOf(it))
    byRef.set(ref, g)
  }

  const inspByRef = new Map<string, MachineInspection>()
  for (const r of (inspRes.Items ?? []) as MachineInspection[]) inspByRef.set(r.maquinaRef, r)

  const machines: ParqueMotorMachine[] = [...byRef.entries()].map(([ref, g]) => {
    const insp = inspByRef.get(ref)
    let hoy: ParqueMotorMachine['hoy'] = null
    if (insp) {
      const results = Object.values(insp.results ?? {})
      let lastAt: string | null = null, lastBy: string | null = null
      for (const r of results) if (!lastAt || r.at > lastAt) { lastAt = r.at; lastBy = r.byName }
      hoy = {
        marcados: results.length,
        faltantes: results.filter(r => r.status === 'faltante').length,
        danados: results.filter(r => r.status === 'danado').length,
        lastBy, lastAt,
      }
    }
    return { ref, itemCount: g.items.size, gabineteCount: g.gabinetes.size, hoy }
  }).sort((a, b) => a.ref.localeCompare(b.ref))

  return { machines, date }
}

export interface InspItem {
  itemId: string
  name: string
  category: string
  quantity: number
  condition: string
  result: InspectionItemResult | null
}
export interface InspGabinete { nombre: string; items: InspItem[] }
export interface MaquinaInspeccion {
  ref: string
  date: string
  gabinetes: InspGabinete[]
  totalItems: number
  marcados: number
}

/** Detalle del checklist de una máquina: ítems por gabinete + resultados de hoy. */
export async function getMaquinaInspeccion(ref: string): Promise<MaquinaInspeccion> {
  const date = limaDateStr()
  const inv = await scanMachineInventory()
  const mine = inv.filter(i => machineRefOf(i) === ref)

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.machineInspections, Key: { maquinaRef: ref, date },
  }))
  const insp = Item as MachineInspection | undefined
  const results = insp?.results ?? {}

  const byGab = new Map<string, InspItem[]>()
  for (const it of mine) {
    const g = gabineteOf(it)
    const list = byGab.get(g) ?? []
    list.push({
      itemId: it.itemId,
      name: it.name,
      category: it.category,
      quantity: it.quantity ?? 1,
      condition: it.condition,
      result: results[it.itemId] ?? null,
    })
    byGab.set(g, list)
  }

  const gabinetes: InspGabinete[] = [...byGab.entries()]
    .map(([nombre, items]) => ({ nombre, items: items.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const totalItems = mine.length
  const marcados = mine.filter(i => results[i.itemId]).length

  return { ref, date, gabinetes, totalItems, marcados }
}
