import 'server-only'
import { db } from '@/lib/db'
import {
  sections,
  sectionRoles,
  profiles,
  inventory,
  incidents,
  requests,
} from '@/lib/db/schema'
import { and, eq, desc, asc, or, sql } from 'drizzle-orm'
import type { AreaKey } from './get-areas-hub'

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

export interface AreaBasePerson {
  profileId: string
  fullName: string
  grade: string
  gradeLabel: string
  codigoCgbvp: string | null
  role: 'jefe' | 'adjunto' | 'miembro'
  roleLabel: string
}

export interface AreaBaseInventoryRow {
  id: string
  name: string
  category: string
  subcategory: string | null
  brand: string | null
  model: string | null
  codigoCbp: string | null
  almacenReferencia: string | null
  condition: string
  quantity: number
  expirationDate: string | null
  endOfLifeDate: string | null
  assignedTo: string | null     // nombre del efectivo si aplica
}

export interface AreaBaseIncidentInbox {
  id: string
  code: string | null
  title: string
  description: string
  category: string | null
  priority: string
  status: string
  reportedByName: string | null
  reportedByGrade: string | null
  createdAt: Date
}

export interface AreaBaseRequestInbox {
  id: string
  code: string | null
  title: string
  description: string
  category: string
  priority: string
  status: string
  createdByName: string | null
  createdByGrade: string | null
  createdAt: Date
}

export interface AreaBaseData {
  sectionId: string | null
  sectionName: string
  personnel: AreaBasePerson[]
  jefeArea: AreaBasePerson | null
  inventory: AreaBaseInventoryRow[]
  incidentsInbox: AreaBaseIncidentInbox[]
  requestsInbox: AreaBaseRequestInbox[]
  stats: {
    personnelCount: number
    inventoryCount: number
    operativesCount: number
    damagedCount: number
    expiredCount: number        // ítems vencidos
    expiringSoonCount: number   // ítems que vencen en ≤30 días
    openIncidentsCount: number
    openRequestsCount: number
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
}

function mapRoleGroup(role: string): 'jefe' | 'adjunto' | 'miembro' {
  if (['primer_jefe', 'segundo_jefe', 'jefe_seccion'].includes(role)) return 'jefe'
  if (role === 'adjunto') return 'adjunto'
  return 'miembro'
}

// ═══════════════════════════════════════════════════════════════════
// API PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export async function getAreaBaseData(sectionKey: AreaKey): Promise<AreaBaseData> {
  // ── Sección ──────────────────────────────────────────────────
  const [section] = await db
    .select()
    .from(sections)
    .where(eq(sections.key, sectionKey))
    .limit(1)

  const sectionId = section?.id ?? null
  const sectionName = section?.name ?? sectionKey

  // ── Personal ─────────────────────────────────────────────────
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

  const personnel: AreaBasePerson[] = personnelRows.map((r) => ({
    profileId: r.profile.id,
    fullName: r.profile.fullName,
    grade: r.profile.grade,
    gradeLabel: GRADE_LABELS_SHORT[r.profile.grade] ?? r.profile.grade,
    codigoCgbvp: r.profile.codigoCgbvp,
    role: mapRoleGroup(r.role.role),
    roleLabel: ROLE_LABELS[r.role.role] ?? r.role.role,
  }))

  const roleOrder = { jefe: 0, adjunto: 1, miembro: 2 } as const
  personnel.sort((a, b) => {
    const diff = roleOrder[a.role] - roleOrder[b.role]
    if (diff !== 0) return diff
    return a.fullName.localeCompare(b.fullName)
  })

  const jefeArea = personnel.find((p) => p.role === 'jefe') ?? null

  // ── Inventario ───────────────────────────────────────────────
  const inventoryRowsRaw = sectionId
    ? await db
        .select({
          inv: inventory,
          assignedName: profiles.fullName,
        })
        .from(inventory)
        .leftJoin(profiles, eq(inventory.assignedProfileId, profiles.id))
        .where(eq(inventory.sectionId, sectionId))
        .orderBy(asc(inventory.name))
        .limit(150)
    : []

  const inventoryRows: AreaBaseInventoryRow[] = inventoryRowsRaw.map((r) => ({
    id: r.inv.id,
    name: r.inv.name,
    category: r.inv.category,
    subcategory: r.inv.subcategory,
    brand: r.inv.brand,
    model: r.inv.model,
    codigoCbp: r.inv.codigoCbp,
    almacenReferencia: r.inv.almacenReferencia,
    condition: r.inv.condition,
    quantity: r.inv.quantity ?? 1,
    expirationDate: r.inv.expirationDate,
    endOfLifeDate: r.inv.endOfLifeDate,
    assignedTo: r.assignedName,
  }))

  // ── Incidencias recibidas ────────────────────────────────────
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
        .limit(30)
    : []

  const incidentsInbox: AreaBaseIncidentInbox[] = incidentsInboxRaw.map((r) => ({
    id: r.inc.id,
    code: r.inc.code,
    title: r.inc.title,
    description: r.inc.description,
    category: r.inc.category,
    priority: r.inc.priority,
    status: r.inc.status,
    reportedByName: r.reportedBy?.fullName ?? null,
    reportedByGrade: r.reportedBy?.grade ?? null,
    createdAt: r.inc.createdAt ?? new Date(),
  }))

  // ── Solicitudes recibidas ────────────────────────────────────
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
        .limit(30)
    : []

  const requestsInbox: AreaBaseRequestInbox[] = requestsInboxRaw.map((r) => ({
    id: r.req.id,
    code: r.req.code,
    title: r.req.title,
    description: r.req.description,
    category: r.req.category,
    priority: r.req.priority,
    status: r.req.status,
    createdByName: r.creator?.fullName ?? null,
    createdByGrade: r.creator?.grade ?? null,
    createdAt: r.req.createdAt ?? new Date(),
  }))

  // ── Stats ────────────────────────────────────────────────────
  const now = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(now.getDate() + 30)

  const operativesCount = inventoryRows.filter((i) => i.condition === 'operativo').length
  const damagedCount = inventoryRows.filter(
    (i) => ['dañado', 'danado', 'fuera_servicio'].includes(i.condition),
  ).length

  const expiredCount = inventoryRows.filter((i) => {
    if (!i.expirationDate) return false
    return new Date(i.expirationDate) < now
  }).length

  const expiringSoonCount = inventoryRows.filter((i) => {
    if (!i.expirationDate) return false
    const exp = new Date(i.expirationDate)
    return exp >= now && exp <= thirtyDaysFromNow
  }).length

  const stats = {
    personnelCount: personnel.length,
    inventoryCount: inventoryRows.length,
    operativesCount,
    damagedCount,
    expiredCount,
    expiringSoonCount,
    openIncidentsCount: incidentsInbox.filter(
      (i) => ['pendiente', 'en_proceso'].includes(i.status),
    ).length,
    openRequestsCount: requestsInbox.filter(
      (r) => ['pendiente', 'aprobada', 'en_proceso'].includes(r.status),
    ).length,
  }

  return {
    sectionId,
    sectionName,
    personnel,
    jefeArea,
    inventory: inventoryRows,
    incidentsInbox,
    requestsInbox,
    stats,
  }
}
