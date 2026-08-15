import 'server-only'
import { ddb, TABLE, QueryCommand, ScanCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { Section } from '@/lib/db/schema/sections'
import type { SectionRole } from '@/lib/db/schema/section-roles'
import type { Profile } from '@/lib/db/schema/profiles'
import type { Machine, MachineCompartment, ChecklistExecution } from '@/lib/db/schema/machines'
import type { InventoryItem } from '@/lib/db/schema/inventory'
import type { Incident } from '@/lib/db/schema/incidents'
import type { Request } from '@/lib/db/schema/requests'

export interface AreaPerson {
  profileId: string
  fullName: string
  grade: string
  gradeLabel: string
  codigoCgbvp: string | null
  role: 'jefe' | 'adjunto' | 'miembro'
  roleLabel: string
}

export interface AreaMachineData {
  machine: Machine
  compartments: {
    id: string
    name: string
    type: string
    qrCode: string
    itemCount: number
  }[]
  totalCompartments: number
  totalInventoryItems: number
}

export interface AreaInventoryRow {
  id: string
  name: string
  category: string
  subcategory: string | null
  brand: string | null
  codigoCbp: string | null
  almacenReferencia: string | null
  condition: string
  compartmentName: string | null
  machineLabel: string | null
}

export interface AreaIncidentInbox {
  id: string
  code: string | null
  title: string
  category: string | null
  priority: string
  status: string
  reportedByName: string | null
  reportedByGrade: string | null
  createdAt: string
}

export interface AreaRequestInbox {
  id: string
  code: string | null
  title: string
  category: string
  priority: string
  status: string
  createdByName: string | null
  createdByGrade: string | null
  createdAt: string
}

export interface AreaChecklistLog {
  id: string
  machineLabel: string
  compartmentName: string
  performerName: string | null
  performerGrade: string | null
  status: string
  startedAt: string
  completedAt: string | null
  frequency: string
}

export interface MaquinasAreaData {
  sectionId: string | null
  personnel: AreaPerson[]
  jefeArea: AreaPerson | null
  machines: AreaMachineData[]
  inventory: AreaInventoryRow[]
  incidentsInbox: AreaIncidentInbox[]
  requestsInbox: AreaRequestInbox[]
  recentChecklists: AreaChecklistLog[]
  stats: {
    personnelCount: number
    machineCount: number
    compartmentCount: number
    inventoryCount: number
    operativesCount: number
    damagedCount: number
    openIncidentsCount: number
    openRequestsCount: number
    checklistsTodayCount: number
  }
}

const GRADE_LABELS_SHORT: Record<string, string> = {
  aspirante: 'Aspirante', seccionario: 'Seccionario', subteniente: 'Subteniente',
  teniente: 'Teniente', capitan: 'Capitán', teniente_brigadier: 'Ten. Brigadier',
  brigadier: 'Brigadier', brigadier_mayor: 'Brig. Mayor', brigadier_general: 'Brig. General',
}

const ROLE_LABELS: Record<string, string> = {
  primer_jefe: 'Primer Jefe', segundo_jefe: 'Segundo Jefe', jefe_seccion: 'Jefe de Sección',
  adjunto: 'Adjunto', miembro: 'Miembro',
  jefe_guardia_masculina: 'Jefe de Guardia Masculina', jefe_guardia_femenina: 'Jefe de Guardia Femenina',
}

function mapRoleGroup(role: string): 'jefe' | 'adjunto' | 'miembro' {
  if (['primer_jefe', 'segundo_jefe', 'jefe_seccion'].includes(role)) return 'jefe'
  if (role === 'adjunto') return 'adjunto'
  return 'miembro'
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

export async function getMaquinasAreaData(): Promise<MaquinasAreaData> {
  const section = await getSectionByKey('maquinas')
  const sectionId = section?.sectionId ?? null

  // Personnel
  let personnel: AreaPerson[] = []
  if (sectionId) {
    const { Items: roleItems } = await ddb.send(new QueryCommand({
      TableName: TABLE.sectionRoles,
      IndexName: 'sectionId-index',
      KeyConditionExpression: 'sectionId = :sid',
      FilterExpression: 'isActive = :t',
      ExpressionAttributeValues: { ':sid': sectionId, ':t': true },
    }))
    const roles = (roleItems ?? []) as SectionRole[]
    if (roles.length > 0) {
      const { Responses } = await ddb.send(new BatchGetCommand({
        RequestItems: {
          [TABLE.profiles]: {
            Keys: roles.map(r => ({ profileId: r.profileId })),
            ProjectionExpression: 'profileId, fullName, grade, codigoCgbvp',
          },
        },
      }))
      const profileMap = new Map<string, Profile>()
      for (const p of Responses?.[TABLE.profiles] ?? []) profileMap.set(p.profileId as string, p as Profile)

      personnel = roles.map(r => {
        const p = profileMap.get(r.profileId)
        return {
          profileId: r.profileId,
          fullName: p?.fullName ?? '',
          grade: p?.grade ?? '',
          gradeLabel: GRADE_LABELS_SHORT[p?.grade ?? ''] ?? (p?.grade ?? ''),
          codigoCgbvp: p?.codigoCgbvp ?? null,
          role: mapRoleGroup(r.role),
          roleLabel: ROLE_LABELS[r.role] ?? r.role,
        }
      }).filter(p => p.fullName)

      const roleOrder = { jefe: 0, adjunto: 1, miembro: 2 } as const
      personnel.sort((a, b) => {
        const diff = roleOrder[a.role] - roleOrder[b.role]
        if (diff !== 0) return diff
        return a.fullName.localeCompare(b.fullName)
      })
    }
  }

  const jefeArea = personnel.find(p => p.role === 'jefe') ?? null

  // Machines (not 'baja')
  const { Items: machineItems } = await ddb.send(new ScanCommand({
    TableName: TABLE.machines,
    FilterExpression: '#st <> :baja',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':baja': 'baja' },
  }))
  const machineList = ((machineItems ?? []) as Machine[]).sort((a, b) => a.label.localeCompare(b.label))
  const machineIds = machineList.map(m => m.machineId)

  // Compartments per machine
  const compartmentsAll: MachineCompartment[] = []
  if (machineIds.length > 0) {
    await Promise.all(machineIds.map(async machineId => {
      const { Items } = await ddb.send(new QueryCommand({
        TableName: TABLE.machineCompartments,
        KeyConditionExpression: 'machineId = :mid',
        FilterExpression: 'active = :t',
        ExpressionAttributeValues: { ':mid': machineId, ':t': true },
      }))
      compartmentsAll.push(...((Items ?? []) as MachineCompartment[]))
    }))
    compartmentsAll.sort((a, b) => (a.displayOrder - b.displayOrder) || a.name.localeCompare(b.name))
  }

  // Item count per compartment
  const itemsByCompartment = new Map<string, number>()
  if (sectionId) {
    const { Items: invItems } = await ddb.send(new QueryCommand({
      TableName: TABLE.inventory,
      IndexName: 'sectionId-index',
      KeyConditionExpression: 'sectionId = :sid',
      ExpressionAttributeValues: { ':sid': sectionId },
      ProjectionExpression: 'compartmentId',
      Limit: 200,
    }))
    for (const item of (invItems ?? []) as InventoryItem[]) {
      if (item.compartmentId) {
        itemsByCompartment.set(item.compartmentId, (itemsByCompartment.get(item.compartmentId) ?? 0) + 1)
      }
    }
  }

  const machinesData: AreaMachineData[] = machineList.map(m => {
    const comps = compartmentsAll.filter(c => c.machineId === m.machineId)
    const totalItems = comps.reduce((acc, c) => acc + (itemsByCompartment.get(c.compartmentId) ?? 0), 0)
    return {
      machine: m,
      compartments: comps.map(c => ({
        id: c.compartmentId,
        name: c.name,
        type: c.type,
        qrCode: c.qrCode,
        itemCount: itemsByCompartment.get(c.compartmentId) ?? 0,
      })),
      totalCompartments: comps.length,
      totalInventoryItems: totalItems,
    }
  })

  // Inventory of the section
  let inventoryRows: AreaInventoryRow[] = []
  if (sectionId) {
    const { Items: invItems } = await ddb.send(new QueryCommand({
      TableName: TABLE.inventory,
      IndexName: 'sectionId-index',
      KeyConditionExpression: 'sectionId = :sid',
      ExpressionAttributeValues: { ':sid': sectionId },
      Limit: 100,
    }))
    const invRaw = (invItems ?? []) as InventoryItem[]
    invRaw.sort((a, b) => a.name.localeCompare(b.name))

    const compartmentMap = new Map(compartmentsAll.map(c => [c.compartmentId, c]))
    const machineMap = new Map(machineList.map(m => [m.machineId, m]))

    inventoryRows = invRaw.map(r => {
      const comp = r.compartmentId ? compartmentMap.get(r.compartmentId) : undefined
      const mach = comp ? machineMap.get(comp.machineId) : undefined
      return {
        id: r.itemId,
        name: r.name,
        category: r.category,
        subcategory: r.subcategory ?? null,
        brand: r.brand ?? null,
        codigoCbp: r.codigoCbp ?? null,
        almacenReferencia: r.almacenReferencia ?? null,
        condition: r.condition,
        compartmentName: comp?.name ?? null,
        machineLabel: mach?.label ?? null,
      }
    })
  }

  // Incidents inbox
  let incidentsInbox: AreaIncidentInbox[] = []
  if (sectionId) {
    const { Items: incItems } = await ddb.send(new QueryCommand({
      TableName: TABLE.incidents,
      IndexName: 'sectionId-createdAt-index',
      KeyConditionExpression: 'sectionId = :sid',
      ExpressionAttributeValues: { ':sid': sectionId },
      ScanIndexForward: false,
      Limit: 20,
    }))
    const incRaw = (incItems ?? []) as Incident[]

    const reporterIds = [...new Set(incRaw.filter(i => i.reportedBy).map(i => i.reportedBy!))]
    const reporterMap = new Map<string, Profile>()
    if (reporterIds.length > 0) {
      const { Responses } = await ddb.send(new BatchGetCommand({
        RequestItems: {
          [TABLE.profiles]: {
            Keys: reporterIds.map(pid => ({ profileId: pid })),
            ProjectionExpression: 'profileId, fullName, grade',
          },
        },
      }))
      for (const p of Responses?.[TABLE.profiles] ?? []) reporterMap.set(p.profileId as string, p as Profile)
    }

    incidentsInbox = incRaw.map(r => ({
      id: r.incidentId,
      code: r.code ?? null,
      title: r.title,
      category: r.category ?? null,
      priority: r.priority,
      status: r.status,
      reportedByName: r.reportedBy ? (reporterMap.get(r.reportedBy)?.fullName ?? null) : null,
      reportedByGrade: r.reportedBy ? (reporterMap.get(r.reportedBy)?.grade ?? null) : null,
      createdAt: r.createdAt,
    }))
  }

  // Requests inbox
  let requestsInbox: AreaRequestInbox[] = []
  if (sectionId) {
    const { Items: reqItems } = await ddb.send(new QueryCommand({
      TableName: TABLE.requests,
      IndexName: 'sectionId-createdAt-index',
      KeyConditionExpression: 'sectionId = :sid',
      ExpressionAttributeValues: { ':sid': sectionId },
      ScanIndexForward: false,
      Limit: 20,
    }))
    const reqRaw = (reqItems ?? []) as Request[]
    const creatorIds = [...new Set(reqRaw.filter(r => r.createdBy).map(r => r.createdBy!))]
    const creatorMap = new Map<string, Profile>()
    if (creatorIds.length > 0) {
      const { Responses } = await ddb.send(new BatchGetCommand({
        RequestItems: {
          [TABLE.profiles]: {
            Keys: creatorIds.map(pid => ({ profileId: pid })),
            ProjectionExpression: 'profileId, fullName, grade',
          },
        },
      }))
      for (const p of Responses?.[TABLE.profiles] ?? []) creatorMap.set(p.profileId as string, p as Profile)
    }
    requestsInbox = reqRaw.map(r => ({
      id: r.requestId,
      code: r.code ?? null,
      title: r.title,
      category: r.category,
      priority: r.priority,
      status: r.status,
      createdByName: r.createdBy ? (creatorMap.get(r.createdBy)?.fullName ?? null) : null,
      createdByGrade: r.createdBy ? (creatorMap.get(r.createdBy)?.grade ?? null) : null,
      createdAt: r.createdAt,
    }))
  }

  // Recent checklists (last 15 from machine-checklists)
  let recentChecklists: AreaChecklistLog[] = []
  if (machineIds.length > 0) {
    const todayStr = new Date().toISOString().slice(0, 10)
    const allChecklists: ChecklistExecution[] = []
    for (const machineId of machineIds.slice(0, 5)) {
      const { Items } = await ddb.send(new QueryCommand({
        TableName: TABLE.machineChecklists,
        KeyConditionExpression: 'machineId = :mid',
        ExpressionAttributeValues: { ':mid': machineId },
        ScanIndexForward: false,
        Limit: 5,
      }))
      allChecklists.push(...((Items ?? []) as ChecklistExecution[]))
    }
    allChecklists.sort((a, b) => b.startedAt.localeCompare(a.startedAt))

    const performerIds = [...new Set(allChecklists.filter(c => c.profileId).map(c => c.profileId!))]
    const performerMap = new Map<string, Profile>()
    if (performerIds.length > 0) {
      const { Responses } = await ddb.send(new BatchGetCommand({
        RequestItems: {
          [TABLE.profiles]: {
            Keys: performerIds.map(pid => ({ profileId: pid })),
            ProjectionExpression: 'profileId, fullName, grade',
          },
        },
      }))
      for (const p of Responses?.[TABLE.profiles] ?? []) performerMap.set(p.profileId as string, p as Profile)
    }

    const machineMap = new Map(machineList.map(m => [m.machineId, m.label]))
    const compMap = new Map(compartmentsAll.map(c => [c.compartmentId, c.name]))

    recentChecklists = allChecklists.slice(0, 15).map(c => ({
      id: c.checklistId,
      machineLabel: machineMap.get(c.machineId) ?? c.machineId,
      compartmentName: compMap.get(c.definitionId) ?? '',
      performerName: c.profileId ? (performerMap.get(c.profileId)?.fullName ?? null) : null,
      performerGrade: c.profileId ? (performerMap.get(c.profileId)?.grade ?? null) : null,
      status: c.status,
      startedAt: c.startedAt,
      completedAt: c.completedAt ?? null,
      frequency: 'turno_manana',
    }))
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const checklistsTodayCount = recentChecklists.filter(
    c => new Date(c.startedAt) >= todayStart,
  ).length

  const operativesCount = inventoryRows.filter(i => i.condition === 'operativo').length
  const damagedCount = inventoryRows.filter(
    i => ['dañado', 'danado', 'fuera_servicio'].includes(i.condition),
  ).length

  return {
    sectionId,
    personnel,
    jefeArea,
    machines: machinesData,
    inventory: inventoryRows,
    incidentsInbox,
    requestsInbox,
    recentChecklists,
    stats: {
      personnelCount: personnel.length,
      machineCount: machineList.length,
      compartmentCount: compartmentsAll.length,
      inventoryCount: inventoryRows.length,
      operativesCount,
      damagedCount,
      openIncidentsCount: incidentsInbox.filter(i => ['pendiente', 'en_proceso'].includes(i.status)).length,
      openRequestsCount: requestsInbox.filter(r => ['pendiente', 'aprobada', 'en_proceso'].includes(r.status)).length,
      checklistsTodayCount,
    },
  }
}
