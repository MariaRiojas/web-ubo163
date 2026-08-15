import 'server-only'
import { ddb, TABLE, QueryCommand, ScanCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { Section } from '@/lib/db/schema/sections'
import type { SectionRole } from '@/lib/db/schema/section-roles'
import type { Profile } from '@/lib/db/schema/profiles'
import type { InventoryItem } from '@/lib/db/schema/inventory'
import type { Incident } from '@/lib/db/schema/incidents'
import type { Request } from '@/lib/db/schema/requests'
import type { InternalRequest } from '@/lib/db/schema/internal-requests'
import type { AreaKey } from './get-areas-hub'

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
  assignedTo: string | null
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
  createdAt: string
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
  createdAt: string
}

export interface AreaBaseRequerimientoInbox {
  id: string
  code: string | null
  type: string
  title: string
  description: string | null
  priority: string
  status: string
  requestedByName: string | null
  requestedByGrade: string | null
  createdAt: string
}

export interface AreaBaseData {
  sectionId: string | null
  sectionName: string
  personnel: AreaBasePerson[]
  jefeArea: AreaBasePerson | null
  inventory: AreaBaseInventoryRow[]
  incidentsInbox: AreaBaseIncidentInbox[]
  requestsInbox: AreaBaseRequestInbox[]
  requerimientosInbox: AreaBaseRequerimientoInbox[]
  stats: {
    personnelCount: number
    inventoryCount: number
    operativesCount: number
    damagedCount: number
    expiredCount: number
    expiringSoonCount: number
    openIncidentsCount: number
    openRequestsCount: number
    openRequerimientosCount: number
  }
}

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

export async function getAreaBaseData(sectionKey: AreaKey): Promise<AreaBaseData> {
  const section = await getSectionByKey(sectionKey)
  const sectionId = section?.sectionId ?? null
  const sectionName = section?.name ?? sectionKey

  // The five inbox/personnel blocks are mutually independent; each performs its
  // own query/scan followed by a profile BatchGet that depends on the IDs from
  // that same block (so the two calls inside a block stay sequential). Running
  // the blocks together collapses ~10 serial round-trips into 2 stages.
  const [personnel, inventoryRows, incidentsInbox, requestsInbox, requerimientosInbox] = await Promise.all([
    // Personnel via sectionId-index on sectionRoles
    (async (): Promise<AreaBasePerson[]> => {
      if (!sectionId) return []
      const { Items: roleItems } = await ddb.send(new QueryCommand({
        TableName: TABLE.sectionRoles,
        IndexName: 'sectionId-index',
        KeyConditionExpression: 'sectionId = :sid',
        FilterExpression: 'isActive = :t',
        ExpressionAttributeValues: { ':sid': sectionId, ':t': true },
      }))
      const roles = (roleItems ?? []) as SectionRole[]
      if (roles.length === 0) return []

      const { Responses } = await ddb.send(new BatchGetCommand({
        RequestItems: {
          [TABLE.profiles]: {
            Keys: roles.map(r => ({ profileId: r.profileId })),
            ProjectionExpression: 'profileId, fullName, grade, codigoCgbvp',
          },
        },
      }))
      const profileMap = new Map<string, Profile>()
      for (const p of Responses?.[TABLE.profiles] ?? []) {
        profileMap.set(p.profileId as string, p as Profile)
      }

      const people = roles.map(r => {
        const p = profileMap.get(r.profileId)!
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
      people.sort((a, b) => {
        const diff = roleOrder[a.role] - roleOrder[b.role]
        if (diff !== 0) return diff
        return a.fullName.localeCompare(b.fullName)
      })
      return people
    })(),

    // Inventory
    (async (): Promise<AreaBaseInventoryRow[]> => {
      if (!sectionId) return []
      const { Items: invItems } = await ddb.send(new QueryCommand({
        TableName: TABLE.inventory,
        IndexName: 'sectionId-index',
        KeyConditionExpression: 'sectionId = :sid',
        ExpressionAttributeValues: { ':sid': sectionId },
        Limit: 150,
      }))
      const invRaw = (invItems ?? []) as InventoryItem[]
      invRaw.sort((a, b) => a.name.localeCompare(b.name))

      const assignedIds = [...new Set(invRaw.filter(i => i.assignedProfileId).map(i => i.assignedProfileId!))]
      const assignedNames = new Map<string, string>()
      if (assignedIds.length > 0) {
        const { Responses } = await ddb.send(new BatchGetCommand({
          RequestItems: {
            [TABLE.profiles]: {
              Keys: assignedIds.map(pid => ({ profileId: pid })),
              ProjectionExpression: 'profileId, fullName',
            },
          },
        }))
        for (const p of Responses?.[TABLE.profiles] ?? []) {
          assignedNames.set(p.profileId as string, p.fullName as string)
        }
      }

      return invRaw.map(r => ({
        id: r.itemId,
        name: r.name,
        category: r.category,
        subcategory: r.subcategory ?? null,
        brand: r.brand ?? null,
        model: r.model ?? null,
        codigoCbp: r.codigoCbp ?? null,
        almacenReferencia: r.almacenReferencia ?? null,
        condition: r.condition,
        quantity: r.quantity ?? 1,
        expirationDate: r.expirationDate ?? null,
        endOfLifeDate: r.endOfLifeDate ?? null,
        assignedTo: r.assignedProfileId ? (assignedNames.get(r.assignedProfileId) ?? null) : null,
      }))
    })(),

    // Incidents inbox (by sectionId)
    (async (): Promise<AreaBaseIncidentInbox[]> => {
      if (!sectionId) return []
      const { Items: incItems } = await ddb.send(new QueryCommand({
        TableName: TABLE.incidents,
        IndexName: 'sectionId-createdAt-index',
        KeyConditionExpression: 'sectionId = :sid',
        ExpressionAttributeValues: { ':sid': sectionId },
        ScanIndexForward: false,
        Limit: 30,
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
        for (const p of Responses?.[TABLE.profiles] ?? []) {
          reporterMap.set(p.profileId as string, p as Profile)
        }
      }

      return incRaw.map(r => ({
        id: r.incidentId,
        code: r.code ?? null,
        title: r.title,
        description: r.description,
        category: r.category ?? null,
        priority: r.priority,
        status: r.status,
        reportedByName: r.reportedBy ? (reporterMap.get(r.reportedBy)?.fullName ?? null) : null,
        reportedByGrade: r.reportedBy ? (reporterMap.get(r.reportedBy)?.grade ?? null) : null,
        createdAt: r.createdAt,
      }))
    })(),

    // Requests inbox (by targetSectionId = sectionId field)
    (async (): Promise<AreaBaseRequestInbox[]> => {
      if (!sectionId) return []
      const { Items: reqItems } = await ddb.send(new QueryCommand({
        TableName: TABLE.requests,
        IndexName: 'sectionId-createdAt-index',
        KeyConditionExpression: 'sectionId = :sid',
        ExpressionAttributeValues: { ':sid': sectionId },
        ScanIndexForward: false,
        Limit: 30,
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
        for (const p of Responses?.[TABLE.profiles] ?? []) {
          creatorMap.set(p.profileId as string, p as Profile)
        }
      }

      return reqRaw.map(r => ({
        id: r.requestId,
        code: r.code ?? null,
        title: r.title,
        description: r.description,
        category: r.category,
        priority: r.priority,
        status: r.status,
        createdByName: r.createdBy ? (creatorMap.get(r.createdBy)?.fullName ?? null) : null,
        createdByGrade: r.createdBy ? (creatorMap.get(r.createdBy)?.grade ?? null) : null,
        createdAt: r.createdAt,
      }))
    })(),

    // Requerimientos inbox (TABLE.internalRequests, sin GSI declarado — Scan filtrado por toSectionId)
    (async (): Promise<AreaBaseRequerimientoInbox[]> => {
      if (!sectionId) return []
      const { Items: reqItems } = await ddb.send(new ScanCommand({
        TableName: TABLE.internalRequests,
        FilterExpression: 'toSectionId = :sid',
        ExpressionAttributeValues: { ':sid': sectionId },
      }))
      const reqRaw = (reqItems ?? []) as InternalRequest[]
      reqRaw.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

      const requesterIds = [...new Set(reqRaw.filter(r => r.requestedBy).map(r => r.requestedBy))]
      const requesterMap = new Map<string, Profile>()
      if (requesterIds.length > 0) {
        const { Responses } = await ddb.send(new BatchGetCommand({
          RequestItems: {
            [TABLE.profiles]: {
              Keys: requesterIds.map(pid => ({ profileId: pid })),
              ProjectionExpression: 'profileId, fullName, grade',
            },
          },
        }))
        for (const p of Responses?.[TABLE.profiles] ?? []) {
          requesterMap.set(p.profileId as string, p as Profile)
        }
      }

      return reqRaw.map(r => ({
        id: r.requestId,
        code: r.code ?? null,
        type: r.type,
        title: r.title,
        description: r.description ?? null,
        priority: r.priority,
        status: r.status,
        requestedByName: requesterMap.get(r.requestedBy)?.fullName ?? null,
        requestedByGrade: requesterMap.get(r.requestedBy)?.grade ?? null,
        createdAt: r.createdAt,
      }))
    })(),
  ])

  const jefeArea = personnel.find(p => p.role === 'jefe') ?? null

  // Stats
  const nowDate = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(nowDate.getDate() + 30)

  const operativesCount = inventoryRows.filter(i => i.condition === 'operativo').length
  const damagedCount = inventoryRows.filter(i =>
    ['dañado', 'danado', 'fuera_servicio'].includes(i.condition),
  ).length
  const expiredCount = inventoryRows.filter(i => {
    if (!i.expirationDate) return false
    return new Date(i.expirationDate) < nowDate
  }).length
  const expiringSoonCount = inventoryRows.filter(i => {
    if (!i.expirationDate) return false
    const exp = new Date(i.expirationDate)
    return exp >= nowDate && exp <= thirtyDaysFromNow
  }).length

  return {
    sectionId,
    sectionName,
    personnel,
    jefeArea,
    inventory: inventoryRows,
    incidentsInbox,
    requestsInbox,
    requerimientosInbox,
    stats: {
      personnelCount: personnel.length,
      inventoryCount: inventoryRows.length,
      operativesCount,
      damagedCount,
      expiredCount,
      expiringSoonCount,
      openIncidentsCount: incidentsInbox.filter(i => ['pendiente', 'en_proceso'].includes(i.status)).length,
      openRequestsCount: requestsInbox.filter(r => ['pendiente', 'aprobada', 'en_proceso'].includes(r.status)).length,
      openRequerimientosCount: requerimientosInbox.filter(r => ['pendiente', 'aprobada', 'en_proceso'].includes(r.status)).length,
    },
  }
}
