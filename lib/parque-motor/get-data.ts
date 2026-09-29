import 'server-only'
import { ddb, TABLE, ScanCommand, GetCommand } from '@/lib/db/dynamodb'
import type { InventoryItem } from '@/lib/db/schema/inventory'
import type { MachineInspection, InspectionItemResult } from '@/lib/db/schema/machine-inspection'
import {
  detectarTurno, turnosDeLaFecha, turnoYaEmpezo, periodoKey,
  type TurnoInfo, type TurnoKey,
} from '@/lib/turnos'
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

/** Inspecciones de una fecha (los tres turnos). */
async function inspeccionesDe(fecha: string): Promise<MachineInspection[]> {
  const { Items } = await ddb.send(new ScanCommand({
    TableName: TABLE.machineInspections,
    FilterExpression: 'fecha = :f',
    ExpressionAttributeValues: { ':f': fecha },
  }))
  return (Items ?? []) as MachineInspection[]
}

function resumir(insp: MachineInspection | undefined) {
  if (!insp) return null
  const results = Object.values(insp.results ?? {})
  let lastAt: string | null = null, lastBy: string | null = null
  for (const r of results) if (!lastAt || r.at > lastAt) { lastAt = r.at; lastBy = r.byName }
  return {
    marcados: results.length,
    faltantes: results.filter(r => r.status === 'faltante').length,
    danados: results.filter(r => r.status === 'danado').length,
    lastBy, lastAt,
  }
}

export interface TurnoEstado {
  turno: TurnoKey
  label: string
  rango: string
  marcados: number
  completo: boolean
  /** El turno ya arrancó y la unidad no está revisada del todo. */
  pendiente: boolean
  esActual: boolean
}

export interface ParqueMotorMachine {
  ref: string
  itemCount: number
  gabineteCount: number
  /** Progreso del turno vigente. */
  actual: { marcados: number; faltantes: number; danados: number; lastBy: string | null; lastAt: string | null } | null
  /** Cumplimiento de los tres turnos de la fecha en curso. */
  turnosDia: TurnoEstado[]
}

export interface ParqueMotorList {
  machines: ParqueMotorMachine[]
  turno: TurnoInfo
  /** Unidades sin completar en el turno vigente. */
  pendientesTurno: number
}

/** Unidades del parque motor (derivadas del inventario) + cumplimiento por turno. */
export async function getParqueMotorList(): Promise<ParqueMotorList> {
  const turno = detectarTurno()
  const [inv, inspecciones] = await Promise.all([
    scanMachineInventory(),
    inspeccionesDe(turno.fecha),
  ])

  const byRef = new Map<string, { items: Set<string>; gabinetes: Set<string> }>()
  for (const it of inv) {
    const ref = machineRefOf(it)
    const g = byRef.get(ref) ?? { items: new Set(), gabinetes: new Set() }
    g.items.add(it.itemId)
    g.gabinetes.add(gabineteOf(it))
    byRef.set(ref, g)
  }

  // periodo → inspección, por unidad
  const porRefPeriodo = new Map<string, MachineInspection>()
  for (const r of inspecciones) porRefPeriodo.set(`${r.maquinaRef}|${r.date}`, r)

  const machines: ParqueMotorMachine[] = [...byRef.entries()].map(([ref, g]) => {
    const total = g.items.size
    const actualInsp = porRefPeriodo.get(`${ref}|${turno.periodo}`)

    const turnosDia: TurnoEstado[] = turnosDeLaFecha(turno.fecha).map(t => {
      const insp = porRefPeriodo.get(`${ref}|${t.periodo}`)
      const marcados = Object.keys(insp?.results ?? {}).length
      const completo = total > 0 && marcados >= total
      return {
        turno: t.turno,
        label: t.label,
        rango: t.rango,
        marcados,
        completo,
        pendiente: turnoYaEmpezo(turno.fecha, t.turno) && !completo,
        esActual: t.turno === turno.turno,
      }
    })

    return {
      ref,
      itemCount: total,
      gabineteCount: g.gabinetes.size,
      actual: resumir(actualInsp),
      turnosDia,
    }
  }).sort((a, b) => a.ref.localeCompare(b.ref))

  const pendientesTurno = machines.filter(
    m => (m.actual?.marcados ?? 0) < m.itemCount,
  ).length

  return { machines, turno, pendientesTurno }
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
  turno: TurnoInfo
  gabinetes: InspGabinete[]
  totalItems: number
  marcados: number
}

/** Detalle del checklist de una unidad: ítems por gabinete + resultados del turno vigente. */
export async function getMaquinaInspeccion(ref: string): Promise<MaquinaInspeccion> {
  const turno = detectarTurno()
  const inv = await scanMachineInventory()
  const mine = inv.filter(i => machineRefOf(i) === ref)

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.machineInspections,
    Key: { maquinaRef: ref, date: periodoKey(turno.fecha, turno.turno) },
  }))
  const results = (Item as MachineInspection | undefined)?.results ?? {}

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

  return {
    ref,
    turno,
    gabinetes,
    totalItems: mine.length,
    marcados: mine.filter(i => results[i.itemId]).length,
  }
}
