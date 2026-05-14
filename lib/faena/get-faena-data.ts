import 'server-only'
import { db } from '@/lib/db'
import {
  machines,
  machineCompartments,
  checklistDefinitions,
  checklistExecutions,
  checklistItemResults,
  incidents,
  requests,
  sections,
  profiles,
  inventory,
  type Machine,
  type MachineCompartment,
  type ChecklistExecution,
  type Incident,
  type Request,
} from '@/lib/db/schema'
import { and, eq, gte, desc, asc, sql, inArray } from 'drizzle-orm'

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

export type ShiftKey = 'manana' | 'tarde' | 'noche'

export interface CurrentShift {
  key: ShiftKey
  label: string            // "Mañana (07:00 – 15:00)"
  frequency: 'turno_manana' | 'turno_tarde' | 'turno_noche'
  startHour: number
  endHour: number
  /** Minutos restantes del turno */
  remainingMinutes: number
  remainingLabel: string   // "6 h 23 m"
}

export interface MachineInspectionCard {
  machine: Machine
  totalCompartments: number
  verifiedCompartments: number
  inProgressExecutions: number
  /** Si hay al menos un checklist completado hoy para todos los compartimientos */
  status: 'pendiente' | 'en_curso' | 'completada'
  /** Usuario que cerró el último checklist (para mostrar "verificada por…") */
  lastCompletedBy: string | null
  lastCompletedAt: Date | null
}

export interface IncidentCard {
  id: string
  code: string | null
  title: string
  description: string
  category: string | null
  categorySlug: string     // para CSS
  priority: string
  status: string
  assignedSectionName: string | null
  createdAt: Date
  resolvedAt: Date | null
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
  createdAt: Date
  reviewedAt: Date | null
  resolvedAt: Date | null
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

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export function detectCurrentShift(now: Date = new Date()): CurrentShift {
  const h = now.getHours()
  const m = now.getMinutes()

  let key: ShiftKey
  let startHour: number
  let endHour: number
  let label: string
  let frequency: CurrentShift['frequency']

  if (h >= 7 && h < 15) {
    key = 'manana'; startHour = 7; endHour = 15
    label = 'Mañana (07:00 – 15:00)'
    frequency = 'turno_manana'
  } else if (h >= 15 && h < 23) {
    key = 'tarde'; startHour = 15; endHour = 23
    label = 'Tarde (15:00 – 23:00)'
    frequency = 'turno_tarde'
  } else {
    key = 'noche'; startHour = 23; endHour = 7 // wraps
    label = 'Noche (23:00 – 07:00)'
    frequency = 'turno_noche'
  }

  // Calcular minutos restantes
  let endDate: Date
  if (key === 'noche' && h >= 23) {
    endDate = new Date(now)
    endDate.setDate(endDate.getDate() + 1)
    endDate.setHours(7, 0, 0, 0)
  } else if (key === 'noche' && h < 7) {
    endDate = new Date(now)
    endDate.setHours(7, 0, 0, 0)
  } else {
    endDate = new Date(now)
    endDate.setHours(endHour, 0, 0, 0)
  }

  const remainingMinutes = Math.max(0, Math.round((endDate.getTime() - now.getTime()) / 60000))
  const hours = Math.floor(remainingMinutes / 60)
  const mins = remainingMinutes % 60
  const remainingLabel = `${hours} h ${String(mins).padStart(2, '0')} m`

  return { key, label, frequency, startHour, endHour, remainingMinutes, remainingLabel }
}

function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function mapIncidentCategorySlug(cat: string | null): string {
  if (!cat) return 'default'
  const normalized = cat.toLowerCase()
  if (normalized.includes('equip')) return 'equipamiento'
  if (normalized.includes('uniforme') || normalized.includes('epp')) return 'uniforme'
  if (normalized.includes('vehicul') || normalized.includes('maquina')) return 'equipamiento'
  return 'default'
}

function mapRequestCategorySlug(cat: string): string {
  if (cat === 'reposicion_insumo') return 'reposicion'
  if (cat === 'repuesto' || cat === 'mantenimiento' || cat === 'reparacion') return 'equipamiento'
  return 'default'
}

function formatIncidentCategory(cat: string | null): string {
  if (!cat) return 'OTRO'
  return cat.toUpperCase()
}

function formatRequestCategory(cat: string): string {
  const map: Record<string, string> = {
    repuesto: 'REPUESTO',
    reparacion: 'REPARACIÓN',
    reposicion_insumo: 'REPOSICIÓN DE INSUMO',
    mantenimiento: 'MANTENIMIENTO',
    capacitacion: 'CAPACITACIÓN',
    permiso: 'PERMISO',
    otro: 'OTRO',
  }
  return map[cat] ?? cat.toUpperCase()
}

// ═══════════════════════════════════════════════════════════════════
// API PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export async function getFaenaData(profileId: string): Promise<FaenaData> {
  const now = new Date()
  const shift = detectCurrentShift(now)
  const todayStart = startOfDay(now)

  // ── Máquinas activas ─────────────────────────────────────────
  const machineList = await db
    .select()
    .from(machines)
    .where(sql`${machines.status} != 'baja'`)
    .orderBy(asc(machines.label))

  // ── Compartimientos de todas las máquinas ────────────────────
  const machineIds = machineList.map((m) => m.id)
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
    : []

  // ── Definiciones del checklist para el turno actual ──────────
  const definitionsForShift = compartmentsAll.length > 0
    ? await db
        .select()
        .from(checklistDefinitions)
        .where(
          and(
            inArray(
              checklistDefinitions.compartmentId,
              compartmentsAll.map((c) => c.id),
            ),
            eq(checklistDefinitions.frequency, shift.frequency),
            eq(checklistDefinitions.active, true),
          ),
        )
    : []

  // ── Ejecuciones de hoy para esas definiciones ────────────────
  const executionsToday = definitionsForShift.length > 0
    ? await db
        .select({
          execution: checklistExecutions,
          performerName: profiles.fullName,
        })
        .from(checklistExecutions)
        .leftJoin(profiles, eq(checklistExecutions.performedBy, profiles.id))
        .where(
          and(
            inArray(
              checklistExecutions.definitionId,
              definitionsForShift.map((d) => d.id),
            ),
            gte(checklistExecutions.startedAt, todayStart),
          ),
        )
    : []

  // Mapa: compartmentId → ejecución (última)
  const defToCompartment = new Map<string, string>()
  for (const d of definitionsForShift) defToCompartment.set(d.id, d.compartmentId)

  type ExecutionWithPerformer = typeof executionsToday[number]
  const executionsByCompartment = new Map<string, ExecutionWithPerformer[]>()
  for (const ex of executionsToday) {
    const compId = defToCompartment.get(ex.execution.definitionId)
    if (!compId) continue
    const list = executionsByCompartment.get(compId) ?? []
    list.push(ex)
    executionsByCompartment.set(compId, list)
  }

  // ── Construir card por máquina ───────────────────────────────
  const machinesToInspect: MachineInspectionCard[] = machineList.map((m) => {
    const comps = compartmentsAll.filter((c) => c.machineId === m.id)
    const total = comps.length
    let verified = 0
    let inProgress = 0
    let lastCompletedAt: Date | null = null
    let lastCompletedBy: string | null = null

    for (const c of comps) {
      const execs = executionsByCompartment.get(c.id) ?? []
      const completed = execs.find((e) => e.execution.status === 'completado')
      const active = execs.find((e) => e.execution.status === 'en_curso')
      if (completed) {
        verified++
        if (!lastCompletedAt || (completed.execution.completedAt && completed.execution.completedAt > lastCompletedAt)) {
          lastCompletedAt = completed.execution.completedAt
          lastCompletedBy = completed.performerName ?? null
        }
      } else if (active) {
        inProgress++
      }
    }

    let status: MachineInspectionCard['status']
    if (total === 0) status = 'pendiente'
    else if (verified >= total) status = 'completada'
    else if (inProgress > 0 || verified > 0) status = 'en_curso'
    else status = 'pendiente'

    return {
      machine: m,
      totalCompartments: total,
      verifiedCompartments: verified,
      inProgressExecutions: inProgress,
      status,
      lastCompletedBy,
      lastCompletedAt,
    }
  })

  // Ordenar: pendientes primero, después en curso, completadas al final
  const order: Record<MachineInspectionCard['status'], number> = {
    pendiente: 0, en_curso: 1, completada: 2,
  }
  machinesToInspect.sort((a, b) => order[a.status] - order[b.status])

  // Resumen global
  const summary = {
    totalMachines: machinesToInspect.length,
    completed: machinesToInspect.filter((m) => m.status === 'completada').length,
    inProgress: machinesToInspect.filter((m) => m.status === 'en_curso').length,
    pending: machinesToInspect.filter((m) => m.status === 'pendiente').length,
  }

  // ── Incidencias propias ──────────────────────────────────────
  const incidentsRaw = await db
    .select({
      incident: incidents,
      sectionName: sections.name,
    })
    .from(incidents)
    .leftJoin(sections, eq(incidents.sectionId, sections.id))
    .where(eq(incidents.reportedBy, profileId))
    .orderBy(desc(incidents.createdAt))
    .limit(20)

  const myIncidents: IncidentCard[] = incidentsRaw.map((r) => ({
    id: r.incident.id,
    code: r.incident.code,
    title: r.incident.title,
    description: r.incident.description,
    category: r.incident.category ? formatIncidentCategory(r.incident.category) : null,
    categorySlug: mapIncidentCategorySlug(r.incident.category),
    priority: r.incident.priority,
    status: r.incident.status,
    assignedSectionName: r.sectionName,
    createdAt: r.incident.createdAt ?? new Date(),
    resolvedAt: r.incident.resolvedAt,
    resolutionNotes: r.incident.resolutionNotes,
  }))

  // ── Solicitudes propias ──────────────────────────────────────
  const requestsRaw = await db
    .select({
      request: requests,
      targetSectionName: sections.name,
    })
    .from(requests)
    .leftJoin(sections, eq(requests.targetSectionId, sections.id))
    .where(eq(requests.createdBy, profileId))
    .orderBy(desc(requests.createdAt))
    .limit(20)

  const myRequests: RequestCard[] = requestsRaw.map((r) => ({
    id: r.request.id,
    code: r.request.code,
    title: r.request.title,
    description: r.request.description,
    category: formatRequestCategory(r.request.category),
    categorySlug: mapRequestCategorySlug(r.request.category),
    priority: r.request.priority,
    status: r.request.status,
    targetSectionName: r.targetSectionName,
    createdAt: r.request.createdAt ?? new Date(),
    reviewedAt: r.request.reviewedAt,
    resolvedAt: r.request.resolvedAt,
  }))

  return {
    shift,
    machinesToInspect,
    summary,
    myIncidents,
    myRequests,
  }
}

// ═══════════════════════════════════════════════════════════════════
// DATOS PARA EL CHECKLIST EXECUTOR
// ═══════════════════════════════════════════════════════════════════

export interface ChecklistExecutionDetail {
  execution: ChecklistExecution
  definition: {
    id: string
    name: string
    description: string | null
  }
  compartment: {
    id: string
    name: string
    qrCode: string
    type: string
  }
  machine: {
    id: string
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

/**
 * Trae el detalle completo de una ejecución de checklist en curso.
 */
export async function getChecklistExecution(
  executionId: string,
): Promise<ChecklistExecutionDetail | null> {
  const execRows = await db
    .select({
      execution: checklistExecutions,
      definition: checklistDefinitions,
      compartment: machineCompartments,
      machine: machines,
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
    .where(eq(checklistExecutions.id, executionId))
    .limit(1)

  const row = execRows[0]
  if (!row) return null

  // Ítems del inventario del compartimiento
  const inventoryItems = await db
    .select()
    .from(inventory)
    .where(eq(inventory.compartmentId, row.compartment.id))
    .orderBy(asc(inventory.name))

  // Resultados ya registrados para esta ejecución
  const existingResults = await db
    .select()
    .from(checklistItemResults)
    .where(eq(checklistItemResults.executionId, executionId))

  const resultsByInventoryId = new Map(existingResults.map((r) => [r.inventoryId, r]))

  const items = inventoryItems.map((inv) => {
    const prev = resultsByInventoryId.get(inv.id)
    return {
      inventoryId: inv.id,
      name: inv.name,
      brand: inv.brand,
      model: inv.model,
      lote: inv.lote,
      expectedQuantity: inv.quantity ?? 1,
      result: {
        status: (prev?.status ?? null) as
          | 'presente' | 'faltante' | 'danado' | 'no_aplica' | null,
        foundQuantity: prev?.foundQuantity ?? null,
        notes: prev?.notes ?? null,
        photoKey: prev?.photoKey ?? null,
      },
    }
  })

  return {
    execution: row.execution,
    definition: {
      id: row.definition.id,
      name: row.definition.name,
      description: row.definition.description,
    },
    compartment: {
      id: row.compartment.id,
      name: row.compartment.name,
      qrCode: row.compartment.qrCode,
      type: row.compartment.type,
    },
    machine: {
      id: row.machine.id,
      label: row.machine.label,
      kind: row.machine.kind,
    },
    items,
  }
}

/**
 * Busca el compartimiento por QR code y retorna info básica para decidir
 * si iniciar un checklist nuevo o continuar uno existente.
 */
export async function lookupCompartmentByQr(qrCode: string) {
  const row = await db
    .select({
      compartment: machineCompartments,
      machine: machines,
    })
    .from(machineCompartments)
    .innerJoin(machines, eq(machineCompartments.machineId, machines.id))
    .where(eq(machineCompartments.qrCode, qrCode))
    .limit(1)

  return row[0] ?? null
}

/**
 * Trae el catálogo de secciones para los selects de incidencias/solicitudes.
 */
export async function getSectionCatalog() {
  const all = await db
    .select({ id: sections.id, key: sections.key, name: sections.name })
    .from(sections)
    .orderBy(asc(sections.displayOrder), asc(sections.name))
  return all
}
