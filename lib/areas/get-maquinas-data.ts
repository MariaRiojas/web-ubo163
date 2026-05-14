import 'server-only'
import { db } from '@/lib/db'
import {
  sections,
  sectionRoles,
  profiles,
  machines,
  machineCompartments,
  inventory,
  incidents,
  requests,
  checklistExecutions,
  checklistDefinitions,
  type Machine,
  type MachineCompartment,
} from '@/lib/db/schema'
import { eq, and, desc, asc, sql, or, inArray } from 'drizzle-orm'

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

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
  createdAt: Date
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
  createdAt: Date
}

export interface AreaChecklistLog {
  id: string
  machineLabel: string
  compartmentName: string
  performerName: string | null
  performerGrade: string | null
  status: string
  startedAt: Date
  completedAt: Date | null
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
    operativesCount: number    // equipos en estado 'operativo'
    damagedCount: number
    openIncidentsCount: number
    openRequestsCount: number
    checklistsTodayCount: number
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const GRADE_LABELS_SHORT: Record<string, string> = {
  aspirante: 'Aspirante',
  seccionario: 'Seccionario',
  subteniente: 'Subteniente',
  teniente: 'Teniente',
  capitan: 'Capitán',
  teniente_brigadier: 'Ten. Brigadier',
  brigadier: 'Brigadier',
  brigadier_mayor: 'Brig. Mayor',
  brigadier_general: 'Brig. General',
}

const ROLE_LABELS: Record<string, string> = {
  primer_jefe: 'Primer Jefe',
  segundo_jefe: 'Segundo Jefe',
  jefe_seccion: 'Jefe de Sección',
  adjunto: 'Adjunto',
  miembro: 'Miembro',
  jefe_guardia_masculina: 'Jefe de Guardia Masculina',
  jefe_guardia_femenina: 'Jefe de Guardia Femenina',
}

function mapRoleGroup(role: string): 'jefe' | 'adjunto' | 'miembro' {
  if (
    role === 'primer_jefe' ||
    role === 'segundo_jefe' ||
    role === 'jefe_seccion'
  )
    return 'jefe'
  if (role === 'adjunto') return 'adjunto'
  return 'miembro'
}

function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// ═══════════════════════════════════════════════════════════════════
// API PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export async function getMaquinasAreaData(): Promise<MaquinasAreaData> {
  // ── Sección maquinas ─────────────────────────────────────────
  const [section] = await db
    .select()
    .from(sections)
    .where(eq(sections.key, 'maquinas'))
    .limit(1)

  const sectionId = section?.id ?? null

  // ── Personal de la sección ───────────────────────────────────
  const personnelRows = sectionId
    ? await db
        .select({
          role: sectionRoles,
          profile: {
            id: profiles.id,
            fullName: profiles.fullName,
            grade: profiles.grade,
            codigoCgbvp: profiles.codigoCgbvp,
          },
        })
        .from(sectionRoles)
        .innerJoin(profiles, eq(sectionRoles.profileId, profiles.id))
        .where(
          and(
            eq(sectionRoles.sectionId, sectionId),
            eq(sectionRoles.isActive, true),
          ),
        )
    : []

  const personnel: AreaPerson[] = personnelRows.map((r) => ({
    profileId: r.profile.id,
    fullName: r.profile.fullName,
    grade: r.profile.grade,
    gradeLabel: GRADE_LABELS_SHORT[r.profile.grade] ?? r.profile.grade,
    codigoCgbvp: r.profile.codigoCgbvp,
    role: mapRoleGroup(r.role.role),
    roleLabel: ROLE_LABELS[r.role.role] ?? r.role.role,
  }))

  // Ordenar: jefe → adjunto → miembro → por apellido
  const roleOrder = { jefe: 0, adjunto: 1, miembro: 2 } as const
  personnel.sort((a, b) => {
    const diff = roleOrder[a.role] - roleOrder[b.role]
    if (diff !== 0) return diff
    return a.fullName.localeCompare(b.fullName)
  })

  const jefeArea = personnel.find((p) => p.role === 'jefe') ?? null

  // ── Máquinas activas ─────────────────────────────────────────
  const machinesList = await db
    .select()
    .from(machines)
    .where(sql`${machines.status} != 'baja'`)
    .orderBy(asc(machines.label))

  const machineIds = machinesList.map((m) => m.id)

  // Compartimientos de esas máquinas
  const compartmentsAll = machineIds.length > 0
    ? await db
        .select()
        .from(machineCompartments)
        .where(
          and(
            inArray(machineCompartments.machineId, machineIds),
            eq(machineCompartments.active, true),
          ),
        )
        .orderBy(asc(machineCompartments.displayOrder), asc(machineCompartments.name))
    : []

  // Count de items por compartimiento
  const compartmentIds = compartmentsAll.map((c) => c.id)
  const itemsByCompartmentRows = compartmentIds.length > 0
    ? await db
        .select({
          compartmentId: inventory.compartmentId,
          count: sql<number>`count(*)`,
        })
        .from(inventory)
        .where(inArray(inventory.compartmentId, compartmentIds))
        .groupBy(inventory.compartmentId)
    : []
  const itemsByCompartment = new Map(
    itemsByCompartmentRows
      .filter((r) => r.compartmentId)
      .map((r) => [r.compartmentId!, Number(r.count)]),
  )

  const machinesData: AreaMachineData[] = machinesList.map((m) => {
    const comps = compartmentsAll.filter((c) => c.machineId === m.id)
    const totalItems = comps.reduce(
      (acc, c) => acc + (itemsByCompartment.get(c.id) ?? 0),
      0,
    )
    return {
      machine: m,
      compartments: comps.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        qrCode: c.qrCode,
        itemCount: itemsByCompartment.get(c.id) ?? 0,
      })),
      totalCompartments: comps.length,
      totalInventoryItems: totalItems,
    }
  })

  // ── Inventario de la sección (items asignados al área) ───────
  const inventoryRowsRaw = sectionId
    ? await db
        .select({
          inv: inventory,
          compartmentName: machineCompartments.name,
          machineLabel: machines.label,
        })
        .from(inventory)
        .leftJoin(
          machineCompartments,
          eq(inventory.compartmentId, machineCompartments.id),
        )
        .leftJoin(machines, eq(machineCompartments.machineId, machines.id))
        .where(eq(inventory.sectionId, sectionId))
        .orderBy(asc(inventory.name))
        .limit(100)
    : []

  const inventoryRows: AreaInventoryRow[] = inventoryRowsRaw.map((r) => ({
    id: r.inv.id,
    name: r.inv.name,
    category: r.inv.category,
    subcategory: r.inv.subcategory,
    brand: r.inv.brand,
    codigoCbp: r.inv.codigoCbp,
    almacenReferencia: r.inv.almacenReferencia,
    condition: r.inv.condition,
    compartmentName: r.compartmentName,
    machineLabel: r.machineLabel,
  }))

  // ── Bandeja de incidencias recibidas ─────────────────────────
  const incidentsInboxRaw = sectionId
    ? await db
        .select({
          inc: incidents,
          reportedBy: {
            fullName: profiles.fullName,
            grade: profiles.grade,
          },
        })
        .from(incidents)
        .leftJoin(profiles, eq(incidents.reportedBy, profiles.id))
        .where(eq(incidents.sectionId, sectionId))
        .orderBy(desc(incidents.createdAt))
        .limit(20)
    : []

  const incidentsInbox: AreaIncidentInbox[] = incidentsInboxRaw.map((r) => ({
    id: r.inc.id,
    code: r.inc.code,
    title: r.inc.title,
    category: r.inc.category,
    priority: r.inc.priority,
    status: r.inc.status,
    reportedByName: r.reportedBy?.fullName ?? null,
    reportedByGrade: r.reportedBy?.grade ?? null,
    createdAt: r.inc.createdAt ?? new Date(),
  }))

  // ── Bandeja de solicitudes recibidas ─────────────────────────
  const requestsInboxRaw = sectionId
    ? await db
        .select({
          req: requests,
          creator: {
            fullName: profiles.fullName,
            grade: profiles.grade,
          },
        })
        .from(requests)
        .leftJoin(profiles, eq(requests.createdBy, profiles.id))
        .where(eq(requests.targetSectionId, sectionId))
        .orderBy(desc(requests.createdAt))
        .limit(20)
    : []

  const requestsInbox: AreaRequestInbox[] = requestsInboxRaw.map((r) => ({
    id: r.req.id,
    code: r.req.code,
    title: r.req.title,
    category: r.req.category,
    priority: r.req.priority,
    status: r.req.status,
    createdByName: r.creator?.fullName ?? null,
    createdByGrade: r.creator?.grade ?? null,
    createdAt: r.req.createdAt ?? new Date(),
  }))

  // ── Historial de checklists (últimos 15 de compartimientos del área) ──
  const recentChecklistsRaw = compartmentIds.length > 0
    ? await db
        .select({
          exec: checklistExecutions,
          def: checklistDefinitions,
          compartment: machineCompartments,
          machine: machines,
          performer: {
            fullName: profiles.fullName,
            grade: profiles.grade,
          },
        })
        .from(checklistExecutions)
        .innerJoin(
          checklistDefinitions,
          eq(checklistExecutions.definitionId, checklistDefinitions.id),
        )
        .innerJoin(
          machineCompartments,
          eq(checklistDefinitions.compartmentId, machineCompartments.id),
        )
        .innerJoin(machines, eq(machineCompartments.machineId, machines.id))
        .leftJoin(profiles, eq(checklistExecutions.performedBy, profiles.id))
        .where(inArray(machineCompartments.id, compartmentIds))
        .orderBy(desc(checklistExecutions.startedAt))
        .limit(15)
    : []

  const recentChecklists: AreaChecklistLog[] = recentChecklistsRaw.map((r) => ({
    id: r.exec.id,
    machineLabel: r.machine.label,
    compartmentName: r.compartment.name,
    performerName: r.performer?.fullName ?? null,
    performerGrade: r.performer?.grade ?? null,
    status: r.exec.status,
    startedAt: r.exec.startedAt,
    completedAt: r.exec.completedAt,
    frequency: r.def.frequency,
  }))

  // ── Stats ────────────────────────────────────────────────────
  const todayStart = startOfDay()
  const checklistsTodayCount = recentChecklists.filter(
    (c) => c.startedAt >= todayStart,
  ).length

  const operativesCount = inventoryRows.filter((i) => i.condition === 'operativo').length
  const damagedCount = inventoryRows.filter(
    (i) => i.condition === 'dañado' || i.condition === 'danado' || i.condition === 'fuera_servicio',
  ).length

  const stats = {
    personnelCount: personnel.length,
    machineCount: machinesList.length,
    compartmentCount: compartmentsAll.length,
    inventoryCount: inventoryRows.length,
    operativesCount,
    damagedCount,
    openIncidentsCount: incidentsInbox.filter(
      (i) => i.status === 'pendiente' || i.status === 'en_proceso',
    ).length,
    openRequestsCount: requestsInbox.filter(
      (r) => r.status === 'pendiente' || r.status === 'aprobada' || r.status === 'en_proceso',
    ).length,
    checklistsTodayCount,
  }

  return {
    sectionId,
    personnel,
    jefeArea,
    machines: machinesData,
    inventory: inventoryRows,
    incidentsInbox,
    requestsInbox,
    recentChecklists,
    stats,
  }
}
