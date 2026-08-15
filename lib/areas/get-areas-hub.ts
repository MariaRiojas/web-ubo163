import 'server-only'
import { ddb, TABLE, ScanCommand, QueryCommand } from '@/lib/db/dynamodb'
import type { Section } from '@/lib/db/schema/sections'
import type { SectionRole } from '@/lib/db/schema/section-roles'
import type { InventoryItem } from '@/lib/db/schema/inventory'
import type { Incident } from '@/lib/db/schema/incidents'
import type { Request } from '@/lib/db/schema/requests'

// ═══════════════════════════════════════════════════════════════════
// CONSTANTES — metadata institucional de cada área
// ═══════════════════════════════════════════════════════════════════

export type AreaKey =
  | 'jefatura'
  | 'maquinas'
  | 'servicios_generales'
  | 'instruccion'
  | 'prehospitalaria'
  | 'administracion'
  | 'imagen'

export type AreaType = 'jefatura' | 'linea' | 'asesoramiento'

export interface AreaMeta {
  key: AreaKey
  name: string
  shortName: string
  seal: string
  type: AreaType
  normativeRef: string
  description: string
  implemented: boolean
  phase: number
}

export const AREAS_META: Record<AreaKey, AreaMeta> = {
  jefatura: {
    key: 'jefatura',
    name: 'Jefatura de Compañía',
    shortName: 'Jefatura',
    seal: 'JF',
    type: 'jefatura',
    normativeRef: 'Art. 113-115 RIF CGBVP',
    description: 'Dirección y representación de la Unidad de Bomberos. Primer y Segundo Jefe conducen la operación.',
    implemented: true,
    phase: 4,
  },
  maquinas: {
    key: 'maquinas',
    name: 'Sección de Máquinas',
    shortName: 'Máquinas',
    seal: 'MQ',
    type: 'linea',
    normativeRef: 'Art. 116 literal a RIF CGBVP',
    description: 'Operatividad y equipamiento de las unidades de emergencia. Mantenimiento preventivo y correctivo de vehículos, compartimientos y equipos embarcados.',
    implemented: true,
    phase: 1,
  },
  servicios_generales: {
    key: 'servicios_generales',
    name: 'Sección de Servicios Generales',
    shortName: 'Servicios Generales',
    seal: 'SG',
    type: 'linea',
    normativeRef: 'Art. 116 literal b RIF CGBVP',
    description: 'Gestión de insumos, almacén y mantenimiento de las instalaciones del cuartel. Provisión de materiales operativos.',
    implemented: true,
    phase: 2,
  },
  instruccion: {
    key: 'instruccion',
    name: 'Sección de Instrucción y Entrenamiento',
    shortName: 'Instrucción',
    seal: 'IN',
    type: 'linea',
    normativeRef: 'Art. 116 literal c RIF CGBVP',
    description: 'Capacitación del personal en todos sus niveles. Administra el curso ESBAS y la malla de la Escuela Técnica.',
    implemented: true,
    phase: 2,
  },
  prehospitalaria: {
    key: 'prehospitalaria',
    name: 'Sección de Atención Prehospitalaria',
    shortName: 'Sanidad',
    seal: 'SN',
    type: 'linea',
    normativeRef: 'Art. 116 literal d RIF CGBVP',
    description: 'Equipamiento y operatividad de las unidades médicas. Gestión de farmacia, equipos APH y protocolos clínicos.',
    implemented: true,
    phase: 3,
  },
  administracion: {
    key: 'administracion',
    name: 'Sección de Administración',
    shortName: 'Administración',
    seal: 'AD',
    type: 'asesoramiento',
    normativeRef: 'Art. 117 literal a RIF CGBVP',
    description: 'Gestión administrativa interna: legajos, resoluciones, horas de servicio y reportería institucional.',
    implemented: true,
    phase: 3,
  },
  imagen: {
    key: 'imagen',
    name: 'Sección de Imagen de Compañía',
    shortName: 'Imagen',
    seal: 'IM',
    type: 'asesoramiento',
    normativeRef: 'Art. 117 literal b RIF CGBVP',
    description: 'Proyección institucional y comunicaciones. Gestión de redes sociales, prensa y material audiovisual.',
    implemented: true,
    phase: 4,
  },
}

export const AREA_ORDER: AreaKey[] = [
  'jefatura', 'maquinas', 'servicios_generales', 'instruccion',
  'prehospitalaria', 'administracion', 'imagen',
]

export interface AreaHubCard {
  meta: AreaMeta
  sectionId: string | null
  personnelCount: number
  inventoryCount: number
  openIncidents: number
  openRequests: number
}

export interface AreasHubData {
  cards: AreaHubCard[]
  stats: {
    totalAreas: number
    implementedAreas: number
    totalPersonnel: number
    totalInventory: number
    totalOpenTickets: number
  }
}

export async function getAreasHubData(): Promise<AreasHubData> {
  // The five source scans are mutually independent — issue them in one round-trip.
  const [
    { Items: sectionItems },
    { Items: roleItems },
    { Items: invItems },
    { Items: incItems },
    { Items: reqItems },
  ] = await Promise.all([
    // All sections
    ddb.send(new ScanCommand({ TableName: TABLE.sections })),
    // Personnel counts — scan sectionRoles, group by sectionId
    ddb.send(new ScanCommand({
      TableName: TABLE.sectionRoles,
      FilterExpression: 'isActive = :t',
      ExpressionAttributeValues: { ':t': true },
      ProjectionExpression: 'sectionId, profileId',
    })),
    // Inventory counts — scan inventory, group by sectionId
    ddb.send(new ScanCommand({
      TableName: TABLE.inventory,
      ProjectionExpression: 'sectionId',
      FilterExpression: 'attribute_exists(sectionId)',
    })),
    // Incident counts — scan incidents by open status
    ddb.send(new ScanCommand({
      TableName: TABLE.incidents,
      FilterExpression: '#st IN (:p, :e) AND attribute_exists(sectionId)',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':p': 'pendiente', ':e': 'en_proceso' },
      ProjectionExpression: 'sectionId',
    })),
    // Request counts — scan requests by open status
    ddb.send(new ScanCommand({
      TableName: TABLE.requests,
      FilterExpression: '#st IN (:p, :a, :e)',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':p': 'pendiente', ':a': 'aprobada', ':e': 'en_proceso' },
      ProjectionExpression: 'sectionId',
    })),
  ])

  const dbSections = (sectionItems ?? []) as Section[]
  const sectionByKey = new Map(dbSections.map(s => [s.key, s]))

  const personnelBySectionId = new Map<string, Set<string>>()
  for (const r of (roleItems ?? []) as SectionRole[]) {
    if (!r.sectionId) continue
    const s = personnelBySectionId.get(r.sectionId) ?? new Set()
    s.add(r.profileId)
    personnelBySectionId.set(r.sectionId, s)
  }

  const inventoryBySectionId = new Map<string, number>()
  for (const r of (invItems ?? []) as InventoryItem[]) {
    if (!r.sectionId) continue
    inventoryBySectionId.set(r.sectionId, (inventoryBySectionId.get(r.sectionId) ?? 0) + 1)
  }

  const incidentsBySectionId = new Map<string, number>()
  for (const r of (incItems ?? []) as Incident[]) {
    if (!r.sectionId) continue
    incidentsBySectionId.set(r.sectionId, (incidentsBySectionId.get(r.sectionId) ?? 0) + 1)
  }

  const requestsBySectionId = new Map<string, number>()
  for (const r of (reqItems ?? []) as Request[]) {
    if (!r.sectionId) continue
    requestsBySectionId.set(r.sectionId, (requestsBySectionId.get(r.sectionId) ?? 0) + 1)
  }

  const cards: AreaHubCard[] = AREA_ORDER.map(key => {
    const meta = AREAS_META[key]
    const section = sectionByKey.get(key)
    const sectionId = section?.sectionId ?? null
    return {
      meta,
      sectionId,
      personnelCount: sectionId ? (personnelBySectionId.get(sectionId)?.size ?? 0) : 0,
      inventoryCount: sectionId ? (inventoryBySectionId.get(sectionId) ?? 0) : 0,
      openIncidents: sectionId ? (incidentsBySectionId.get(sectionId) ?? 0) : 0,
      openRequests: sectionId ? (requestsBySectionId.get(sectionId) ?? 0) : 0,
    }
  })

  const stats = {
    totalAreas: cards.length,
    implementedAreas: cards.filter(c => c.meta.implemented).length,
    totalPersonnel: cards.reduce((acc, c) => acc + c.personnelCount, 0),
    totalInventory: cards.reduce((acc, c) => acc + c.inventoryCount, 0),
    totalOpenTickets: cards.reduce((acc, c) => acc + c.openIncidents + c.openRequests, 0),
  }

  return { cards, stats }
}

export async function getSectionByKey(key: AreaKey) {
  const { Items } = await ddb.send(new QueryCommand({
    TableName: TABLE.sections,
    IndexName: 'key-index',
    KeyConditionExpression: '#k = :key',
    ExpressionAttributeNames: { '#k': 'key' },
    ExpressionAttributeValues: { ':key': key },
    Limit: 1,
  }))
  return ((Items?.[0] ?? null) as Section | null)
}
