import 'server-only'
import { ddb, TABLE, QueryCommand, ScanCommand, GetCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { Machine, MachineCompartment, ChecklistExecution, ChecklistItemResult } from '@/lib/db/schema/machines'
import type { InventoryItem } from '@/lib/db/schema/inventory'
import type { Incident } from '@/lib/db/schema/incidents'
import type { Request } from '@/lib/db/schema/requests'
import type { Section } from '@/lib/db/schema/sections'
import type { Profile } from '@/lib/db/schema/profiles'

export type ShiftKey = 'manana' | 'tarde' | 'noche'

export interface CurrentShift {
  key: ShiftKey
  label: string
  frequency: 'turno_manana' | 'turno_tarde' | 'turno_noche'
  startHour: number
  endHour: number
  remainingMinutes: number
  remainingLabel: string
}

export interface MachineInspectionCard {
  machine: Machine
  totalCompartments: number
  verifiedCompartments: number
  inProgressExecutions: number
  status: 'pendiente' | 'en_curso' | 'completada'
  lastCompletedBy: string | null
  lastCompletedAt: string | null
}

export interface IncidentCard {
  id: string
  code: string | null
  title: string
  description: string
  category: string | null
  categorySlug: string
  priority: string
  status: string
  assignedSectionName: string | null
  createdAt: string
  resolvedAt: string | null
  resolutionNotes: string | null
}

export interface RequestCard {
  id: string
  code: string | null
  title: string
  description: string
  category: string
  categorySlug: string
  priority: string
  status: string
  targetSectionName: string | null
  createdAt: string
  reviewedAt: string | null
  resolvedAt: string | null
}

export interface FaenaData {
  shift: CurrentShift
  machinesToInspect: MachineInspectionCard[]
  summary: {
    totalMachines: number
    completed: number
    inProgress: number
    pending: number
  }
  myIncidents: IncidentCard[]
  myRequests: RequestCard[]
}

export interface ChecklistExecutionDetail {
  execution: ChecklistExecution
  compartment: {
    compartmentId: string
    name: string
    qrCode: string
    type: string
  }
  machine: {
    machineId: string
    label: string
    kind: string
  }
  items: {
    inventoryId: string
    name: string
    brand: string | null
    model: string | null
    lote: string | null
    expectedQuantity: number
    result: {
      status: 'presente' | 'faltante' | 'danado' | 'no_aplica' | null
      foundQuantity: number | null
      notes: string | null
      photoKey: string | null
    }
  }[]
}

export function detectCurrentShift(now: Date = new Date()): CurrentShift {
  const h = now.getHours()
  let key: ShiftKey
  let startHour: number
  let endHour: number
  let label: string
  let frequency: CurrentShift['frequency']

  if (h >= 7 && h < 15) {
    key = 'manana'; startHour = 7; endHour = 15
    label = 'Mañana (07:00 – 15:00)'; frequency = 'turno_manana'
  } else if (h >= 15 && h < 23) {
    key = 'tarde'; startHour = 15; endHour = 23
    label = 'Tarde (15:00 – 23:00)'; frequency = 'turno_tarde'
  } else {
    key = 'noche'; startHour = 23; endHour = 7
    label = 'Noche (23:00 – 07:00)'; frequency = 'turno_noche'
  }

  let endDate: Date
  if (key === 'noche' && h >= 23) {
    endDate = new Date(now); endDate.setDate(endDate.getDate() + 1); endDate.setHours(7, 0, 0, 0)
  } else if (key === 'noche' && h < 7) {
    endDate = new Date(now); endDate.setHours(7, 0, 0, 0)
  } else {
    endDate = new Date(now); endDate.setHours(endHour, 0, 0, 0)
  }

  const remainingMinutes = Math.max(0, Math.round((endDate.getTime() - now.getTime()) / 60000))
  const hours = Math.floor(remainingMinutes / 60)
  const mins = remainingMinutes % 60
  return { key, label, frequency, startHour, endHour, remainingMinutes, remainingLabel: `${hours} h ${String(mins).padStart(2, '0')} m` }
}

function mapIncidentCategorySlug(cat: string | null): string {
  if (!cat) return 'default'
  const n = cat.toLowerCase()
  if (n.includes('equip') || n.includes('vehicul') || n.includes('maquina')) return 'equipamiento'
  if (n.includes('uniforme') || n.includes('epp')) return 'uniforme'
  return 'default'
}

function mapRequestCategorySlug(cat: string): string {
  if (cat === 'reposicion_insumo') return 'reposicion'
  if (['repuesto', 'mantenimiento', 'reparacion'].includes(cat)) return 'equipamiento'
  return 'default'
}

function formatIncidentCategory(cat: string | null): string {
  return cat ? cat.toUpperCase() : 'OTRO'
}

function formatRequestCategory(cat: string): string {
  const map: Record<string, string> = {
    repuesto: 'REPUESTO', reparacion: 'REPARACIÓN', reposicion_insumo: 'REPOSICIÓN DE INSUMO',
    mantenimiento: 'MANTENIMIENTO', capacitacion: 'CAPACITACIÓN', permiso: 'PERMISO', otro: 'OTRO',
  }
  return map[cat] ?? cat.toUpperCase()
}

export async function getFaenaData(profileId: string): Promise<FaenaData> {
  const now = new Date()
  const shift = detectCurrentShift(now)
  const todayIso = now.toISOString().slice(0, 10)

  // Machines and incidents/requests in parallel
  const [machinesResult, incidentsResult, requestsResult] = await Promise.all([
    ddb.send(new ScanCommand({
      TableName: TABLE.machines,
      FilterExpression: '#st <> :baja',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':baja': 'baja' },
    })),
    ddb.send(new ScanCommand({
      TableName: TABLE.incidents,
      FilterExpression: 'reportedBy = :pid',
      ExpressionAttributeValues: { ':pid': profileId },
      Limit: 20,
    })),
    ddb.send(new ScanCommand({
      TableName: TABLE.requests,
      FilterExpression: 'createdBy = :pid',
      ExpressionAttributeValues: { ':pid': profileId },
      Limit: 20,
    })),
  ])

  const machineList = ((machinesResult.Items ?? []) as Machine[]).sort((a, b) => a.label.localeCompare(b.label))
  const machineIds = machineList.map(m => m.machineId)

  // Sections for incident/request cards — depends only on the incidents/requests
  // already fetched above, so it runs in parallel with the machine-inspection
  // branch below instead of waiting for it.
  const incidentsRaw = (incidentsResult.Items ?? []) as Incident[]
  const requestsRaw = (requestsResult.Items ?? []) as Request[]
  incidentsRaw.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  requestsRaw.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const sectionIds = [
    ...new Set([
      ...incidentsRaw.filter(i => i.sectionId).map(i => i.sectionId!),
      ...requestsRaw.filter(r => r.sectionId).map(r => r.sectionId!),
    ]),
  ]

  const [{ machinesToInspect, summary }, sectionNames] = await Promise.all([
    // Branch A: machine inspection state. The performer batch-get needs the
    // checklist IDs, so it stays sequential after the compartment/checklist reads.
    (async (): Promise<{ machinesToInspect: MachineInspectionCard[]; summary: FaenaData['summary'] }> => {
      // For each machine: get compartments and today's checklists
      const [compartmentsAll, checklistsAll] = machineIds.length > 0
        ? await Promise.all([
            Promise.all(machineIds.map(mid =>
              ddb.send(new QueryCommand({
                TableName: TABLE.machineCompartments,
                KeyConditionExpression: 'machineId = :mid',
                FilterExpression: 'active = :t',
                ExpressionAttributeValues: { ':mid': mid, ':t': true },
              })).then(r => (r.Items ?? []) as MachineCompartment[]),
            )).then(results => results.flat()),
            Promise.all(machineIds.map(mid =>
              ddb.send(new QueryCommand({
                TableName: TABLE.machineChecklists,
                KeyConditionExpression: 'machineId = :mid',
                FilterExpression: '#d = :today',
                ExpressionAttributeNames: { '#d': 'date' },
                ExpressionAttributeValues: { ':mid': mid, ':today': todayIso },
              })).then(r => (r.Items ?? []) as ChecklistExecution[]),
            )).then(results => results.flat()),
          ])
        : [[], []]

      // Batch-get performer names for completed checklists
      const performerIds = [...new Set(checklistsAll.filter(c => c.profileId).map(c => c.profileId))]
      const performerNames = new Map<string, string>()
      if (performerIds.length > 0) {
        const { Responses } = await ddb.send(new BatchGetCommand({
          RequestItems: {
            [TABLE.profiles]: {
              Keys: performerIds.map(pid => ({ profileId: pid })),
              ProjectionExpression: 'profileId, fullName',
            },
          },
        }))
        for (const p of Responses?.[TABLE.profiles] ?? []) {
          performerNames.set(p.profileId as string, p.fullName as string)
        }
      }

      // Build checklist map: compartmentId (= definitionId) → executions
      const checklistsByCompartmentId = new Map<string, ChecklistExecution[]>()
      for (const c of checklistsAll) {
        const list = checklistsByCompartmentId.get(c.definitionId) ?? []
        list.push(c)
        checklistsByCompartmentId.set(c.definitionId, list)
      }

      const machinesToInspect: MachineInspectionCard[] = machineList.map(m => {
        const comps = compartmentsAll.filter(c => c.machineId === m.machineId)
        let verified = 0
        let inProgress = 0
        let lastCompletedAt: string | null = null
        let lastCompletedBy: string | null = null

        for (const c of comps) {
          const execs = checklistsByCompartmentId.get(c.compartmentId) ?? []
          const completed = execs.find(e => e.status === 'completado')
          const active = execs.find(e => e.status === 'en_curso')
          if (completed) {
            verified++
            if (!lastCompletedAt || (completed.completedAt && completed.completedAt > lastCompletedAt)) {
              lastCompletedAt = completed.completedAt ?? null
              lastCompletedBy = performerNames.get(completed.profileId) ?? null
            }
          } else if (active) {
            inProgress++
          }
        }

        const total = comps.length
        const status: MachineInspectionCard['status'] =
          total === 0 ? 'pendiente'
            : verified >= total ? 'completada'
            : inProgress > 0 || verified > 0 ? 'en_curso'
            : 'pendiente'

        return { machine: m, totalCompartments: total, verifiedCompartments: verified, inProgressExecutions: inProgress, status, lastCompletedBy, lastCompletedAt }
      })

      const order = { pendiente: 0, en_curso: 1, completada: 2 } as const
      machinesToInspect.sort((a, b) => order[a.status] - order[b.status])

      const summary = {
        totalMachines: machinesToInspect.length,
        completed: machinesToInspect.filter(m => m.status === 'completada').length,
        inProgress: machinesToInspect.filter(m => m.status === 'en_curso').length,
        pending: machinesToInspect.filter(m => m.status === 'pendiente').length,
      }

      return { machinesToInspect, summary }
    })(),

    // Branch B: resolve section names for the incident/request cards.
    (async (): Promise<Map<string, string>> => {
      const sectionNames = new Map<string, string>()
      if (sectionIds.length > 0) {
        const { Responses } = await ddb.send(new BatchGetCommand({
          RequestItems: {
            [TABLE.sections]: {
              Keys: sectionIds.map(id => ({ sectionId: id })),
              ProjectionExpression: 'sectionId, #n',
              ExpressionAttributeNames: { '#n': 'name' },
            },
          },
        }))
        for (const s of Responses?.[TABLE.sections] ?? []) {
          sectionNames.set(s.sectionId as string, s.name as string)
        }
      }
      return sectionNames
    })(),
  ])

  const myIncidents: IncidentCard[] = incidentsRaw.map(r => ({
    id: r.incidentId,
    code: r.code ?? null,
    title: r.title,
    description: r.description,
    category: r.category ? formatIncidentCategory(r.category) : null,
    categorySlug: mapIncidentCategorySlug(r.category ?? null),
    priority: r.priority,
    status: r.status,
    assignedSectionName: r.sectionId ? (sectionNames.get(r.sectionId) ?? null) : null,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt ?? null,
    resolutionNotes: r.resolutionNotes ?? null,
  }))

  const myRequests: RequestCard[] = requestsRaw.map(r => ({
    id: r.requestId,
    code: r.code ?? null,
    title: r.title,
    description: r.description,
    category: formatRequestCategory(r.category),
    categorySlug: mapRequestCategorySlug(r.category),
    priority: r.priority,
    status: r.status,
    targetSectionName: r.sectionId ? (sectionNames.get(r.sectionId) ?? null) : null,
    createdAt: r.createdAt,
    reviewedAt: r.reviewedAt ?? null,
    resolvedAt: r.resolvedAt ?? null,
  }))

  return { shift, machinesToInspect, summary, myIncidents, myRequests }
}

export async function getChecklistExecution(
  machineId: string,
  checklistId: string,
): Promise<ChecklistExecutionDetail | null> {
  const { Item: execItem } = await ddb.send(new GetCommand({
    TableName: TABLE.machineChecklists,
    Key: { machineId, checklistId },
  }))
  if (!execItem) return null
  const execution = execItem as ChecklistExecution

  // Compartment, machine and inventory all key off values already known from the
  // execution record — fetch them together.
  const [{ Item: compartmentItem }, { Item: machineItem }, { Items: invItems }] = await Promise.all([
    ddb.send(new GetCommand({
      TableName: TABLE.machineCompartments,
      Key: { machineId, compartmentId: execution.definitionId },
    })),
    ddb.send(new GetCommand({
      TableName: TABLE.machines,
      Key: { machineId },
    })),
    // Inventory items for this compartment
    ddb.send(new ScanCommand({
      TableName: TABLE.inventory,
      FilterExpression: 'compartmentId = :cid',
      ExpressionAttributeValues: { ':cid': execution.definitionId },
    })),
  ])

  const compartment = compartmentItem as MachineCompartment | undefined
  const machine = machineItem as Machine | undefined

  const inventoryItems = ((invItems ?? []) as InventoryItem[]).sort((a, b) => a.name.localeCompare(b.name))

  const resultsByInventoryId = new Map<string, ChecklistItemResult>()
  for (const r of execution.results ?? []) {
    resultsByInventoryId.set(r.inventoryId, r)
  }

  const items = inventoryItems.map(inv => {
    const prev = resultsByInventoryId.get(inv.itemId)
    return {
      inventoryId: inv.itemId,
      name: inv.name,
      brand: inv.brand ?? null,
      model: inv.model ?? null,
      lote: inv.lote ?? null,
      expectedQuantity: inv.quantity ?? 1,
      result: {
        status: (prev?.status ?? null) as 'presente' | 'faltante' | 'danado' | 'no_aplica' | null,
        foundQuantity: prev?.foundQuantity ?? null,
        notes: prev?.notes ?? null,
        photoKey: prev?.photoKey ?? null,
      },
    }
  })

  return {
    execution,
    compartment: {
      compartmentId: compartment?.compartmentId ?? execution.definitionId,
      name: compartment?.name ?? execution.definitionId,
      qrCode: compartment?.qrCode ?? '',
      type: compartment?.type ?? 'otro',
    },
    machine: {
      machineId: machine?.machineId ?? machineId,
      label: machine?.label ?? machineId,
      kind: machine?.kind ?? 'otra',
    },
    items,
  }
}

/** Igual que getChecklistExecution pero resolviendo el machineId desde el checklistId. */
export async function getChecklistExecutionById(checklistId: string): Promise<ChecklistExecutionDetail | null> {
  const { Items } = await ddb.send(new ScanCommand({
    TableName: TABLE.machineChecklists,
    FilterExpression: 'checklistId = :cid',
    ExpressionAttributeValues: { ':cid': checklistId },
    Limit: 1,
  }))
  const exec = (Items?.[0] ?? null) as ChecklistExecution | null
  if (!exec) return null
  return getChecklistExecution(exec.machineId, exec.checklistId)
}

export async function lookupCompartmentByQr(qrCode: string) {
  const { Items } = await ddb.send(new ScanCommand({
    TableName: TABLE.machineCompartments,
    FilterExpression: 'qrCode = :qr',
    ExpressionAttributeValues: { ':qr': qrCode },
    Limit: 1,
  }))
  const compartment = (Items?.[0] ?? null) as MachineCompartment | null
  if (!compartment) return null

  const { Item: machineItem } = await ddb.send(new GetCommand({
    TableName: TABLE.machines,
    Key: { machineId: compartment.machineId },
  }))
  return machineItem ? { compartment, machine: machineItem as Machine } : null
}

export async function getSectionCatalog() {
  const { Items } = await ddb.send(new ScanCommand({ TableName: TABLE.sections }))
  return ((Items ?? []) as Section[])
    .sort((a, b) => ((a as any).displayOrder ?? 99) - ((b as any).displayOrder ?? 99) || a.name.localeCompare(b.name))
    .map(s => ({ id: s.sectionId, key: s.key as string, name: s.name }))
}
