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
import { eq, and, sql, inArray, or } from 'drizzle-orm'

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
  seal: string              // 2 letras: JF, MQ, SG, IN, SN, AD, IM
  type: AreaType
  normativeRef: string
  description: string
  implemented: boolean      // true si tiene vista completa
  phase: number             // 1, 2, 3...
}

export const AREAS_META: Record<AreaKey, AreaMeta> = {
  jefatura: {
    key: 'jefatura',
    name: 'Jefatura de Compañía',
    shortName: 'Jefatura',
    seal: 'JF',
    type: 'jefatura',
    normativeRef: 'Art. 113-115 RIF CGBVP',
    description:
      'Dirección y representación de la Unidad de Bomberos. Primer y Segundo Jefe conducen la operación.',
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
    description:
      'Operatividad y equipamiento de las unidades de emergencia. Mantenimiento preventivo y correctivo de vehículos, compartimientos y equipos embarcados.',
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
    description:
      'Gestión de insumos, almacén y mantenimiento de las instalaciones del cuartel. Provisión de materiales operativos.',
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
    description:
      'Capacitación del personal en todos sus niveles. Administra el curso ESBAS y la malla de la Escuela Técnica.',
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
    description:
      'Equipamiento y operatividad de las unidades médicas. Gestión de farmacia, equipos APH y protocolos clínicos.',
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
    description:
      'Gestión administrativa interna: legajos, resoluciones, horas de servicio y reportería institucional.',
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
    description:
      'Proyección institucional y comunicaciones. Gestión de redes sociales, prensa y material audiovisual.',
    implemented: true,
    phase: 4,
  },
}

export const AREA_ORDER: AreaKey[] = [
  'jefatura',
  'maquinas',
  'servicios_generales',
  'instruccion',
  'prehospitalaria',
  'administracion',
  'imagen',
]

// ═══════════════════════════════════════════════════════════════════
// TIPOS DE SALIDA
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════

export async function getAreasHubData(): Promise<AreasHubData> {
  // Traer todas las secciones de la BD
  const dbSections = await db.select().from(sections)
  const sectionByKey = new Map(dbSections.map((s) => [s.key, s]))

  // Counts de personal activo por sección
  const personnelCounts = await db
    .select({
      sectionId: sectionRoles.sectionId,
      count: sql<number>`count(distinct ${sectionRoles.profileId})`,
    })
    .from(sectionRoles)
    .where(eq(sectionRoles.isActive, true))
    .groupBy(sectionRoles.sectionId)
  const personnelBySectionId = new Map(
    personnelCounts.map((p) => [p.sectionId, Number(p.count)]),
  )

  // Counts de inventario por sección
  const inventoryCounts = await db
    .select({
      sectionId: inventory.sectionId,
      count: sql<number>`count(*)`,
    })
    .from(inventory)
    .groupBy(inventory.sectionId)
  const inventoryBySectionId = new Map(
    inventoryCounts
      .filter((i) => i.sectionId)
      .map((i) => [i.sectionId!, Number(i.count)]),
  )

  // Counts de incidencias abiertas por sección
  const incidentCounts = await db
    .select({
      sectionId: incidents.sectionId,
      count: sql<number>`count(*)`,
    })
    .from(incidents)
    .where(
      or(
        eq(incidents.status, 'pendiente'),
        eq(incidents.status, 'en_proceso'),
      ),
    )
    .groupBy(incidents.sectionId)
  const incidentsBySectionId = new Map(
    incidentCounts
      .filter((i) => i.sectionId)
      .map((i) => [i.sectionId!, Number(i.count)]),
  )

  // Counts de solicitudes abiertas por target section
  const requestCounts = await db
    .select({
      targetSectionId: requests.targetSectionId,
      count: sql<number>`count(*)`,
    })
    .from(requests)
    .where(
      or(
        eq(requests.status, 'pendiente'),
        eq(requests.status, 'aprobada'),
        eq(requests.status, 'en_proceso'),
      ),
    )
    .groupBy(requests.targetSectionId)
  const requestsBySectionId = new Map(
    requestCounts.map((r) => [r.targetSectionId, Number(r.count)]),
  )

  // Construir cards
  const cards: AreaHubCard[] = AREA_ORDER.map((key) => {
    const meta = AREAS_META[key]
    const section = sectionByKey.get(key)
    const sectionId = section?.id ?? null
    return {
      meta,
      sectionId,
      personnelCount: sectionId ? (personnelBySectionId.get(sectionId) ?? 0) : 0,
      inventoryCount: sectionId ? (inventoryBySectionId.get(sectionId) ?? 0) : 0,
      openIncidents: sectionId ? (incidentsBySectionId.get(sectionId) ?? 0) : 0,
      openRequests: sectionId ? (requestsBySectionId.get(sectionId) ?? 0) : 0,
    }
  })

  // Totales
  const stats = {
    totalAreas: cards.length,
    implementedAreas: cards.filter((c) => c.meta.implemented).length,
    totalPersonnel: cards.reduce((acc, c) => acc + c.personnelCount, 0),
    totalInventory: cards.reduce((acc, c) => acc + c.inventoryCount, 0),
    totalOpenTickets: cards.reduce((acc, c) => acc + c.openIncidents + c.openRequests, 0),
  }

  return { cards, stats }
}

// ═══════════════════════════════════════════════════════════════════
// Helper: obtener section row por key
// ═══════════════════════════════════════════════════════════════════

export async function getSectionByKey(key: AreaKey) {
  const [row] = await db
    .select()
    .from(sections)
    .where(eq(sections.key, key))
    .limit(1)
  return row ?? null
}
