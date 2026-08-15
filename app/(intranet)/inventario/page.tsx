import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { InventarioClient } from "./inventario-client"
import type { Permission } from "@/lib/auth/permissions"
import { getAllInventoryItems, resolveSection } from "@/lib/inventario/get-items"

export const dynamic = 'force-dynamic'

export type InventoryCategory =
  | 'epp' | 'herramienta' | 'vehiculo' | 'comunicacion'
  | 'medico' | 'rescate' | 'hazmat' | 'insumo' | 'mobiliario'
  | 'insumo_medico'
  | (string & {})

export type InventoryCondition =
  | 'operativo' | 'mantenimiento' | 'baja' | 'pendiente_revision'

export interface InventoryItem {
  id: string
  name: string
  category: InventoryCategory
  section: string
  sectionKey: string
  serialNumber: string | null
  brand: string | null
  model: string | null
  inbpCode: string | null
  quantity: number
  condition: InventoryCondition
  location: string | null
  lastMaintenance: string | null
  nextMaintenance: string | null
  assignedTo: string | null
  notes: string | null
}

type MockBase = Omit<InventoryItem, 'brand' | 'model' | 'inbpCode'>
function mockItem(m: MockBase): InventoryItem { return { brand: null, model: null, inbpCode: null, ...m } }

// Mock data — en producción: await db.query.inventory.findMany({ with: { section: true, assignedToProfile: true } })
const MOCK_INVENTORY: InventoryItem[] = ([
  // VEHÍCULOS — Sección Máquinas
  { id: 'inv-01', name: 'Unidad Autobomba 163-01', category: 'vehiculo', section: 'Máquinas', sectionKey: 'maquinas', serialNumber: 'ABT-163-01', quantity: 1, condition: 'operativo', location: 'Bahía 1', lastMaintenance: '2026-03-15', nextMaintenance: '2026-06-15', assignedTo: null, notes: 'Revisión técnica vigente hasta julio 2026' },
  { id: 'inv-02', name: 'Unidad Rescate 163-02', category: 'vehiculo', section: 'Máquinas', sectionKey: 'maquinas', serialNumber: 'URS-163-02', quantity: 1, condition: 'mantenimiento', location: 'Bahía 2', lastMaintenance: '2026-04-01', nextMaintenance: '2026-04-20', assignedTo: null, notes: 'Cambio de frenos en proceso' },
  { id: 'inv-03', name: 'Ambulancia 163-03', category: 'vehiculo', section: 'Prehospitalaria', sectionKey: 'prehospitalaria', serialNumber: 'AMB-163-03', quantity: 1, condition: 'operativo', location: 'Bahía 3', lastMaintenance: '2026-02-20', nextMaintenance: '2026-05-20', assignedTo: null, notes: null },
  // EPP — asignado a personal
  { id: 'inv-04', name: 'Traje Estructural Nivel II', category: 'epp', section: 'Máquinas', sectionKey: 'maquinas', serialNumber: 'TRJ-001', quantity: 1, condition: 'operativo', location: 'Almacén EPP', lastMaintenance: '2025-12-01', nextMaintenance: '2026-06-01', assignedTo: 'Capitán Herrera Vargas', notes: null },
  { id: 'inv-05', name: 'Traje Estructural Nivel II', category: 'epp', section: 'Máquinas', sectionKey: 'maquinas', serialNumber: 'TRJ-002', quantity: 1, condition: 'operativo', location: 'Almacén EPP', lastMaintenance: '2025-12-01', nextMaintenance: '2026-06-01', assignedTo: 'Seccionario Cárdenas López', notes: null },
  { id: 'inv-06', name: 'Casco Estructural Bullard', category: 'epp', section: 'Máquinas', sectionKey: 'maquinas', serialNumber: 'CAS-003', quantity: 1, condition: 'operativo', location: 'Almacén EPP', lastMaintenance: null, nextMaintenance: null, assignedTo: 'Capitán Herrera Vargas', notes: null },
  { id: 'inv-07', name: 'Traje Rescate Técnico', category: 'epp', section: 'Prehospitalaria', sectionKey: 'prehospitalaria', serialNumber: 'TRJ-RSC-001', quantity: 1, condition: 'pendiente_revision', location: 'Almacén EPP', lastMaintenance: '2025-06-01', nextMaintenance: '2026-04-15', assignedTo: 'Teniente Flores Medina', notes: 'Revisar costuras y cierres' },
  // HERRAMIENTAS
  { id: 'inv-08', name: 'Cizalla Hidráulica Holmatro', category: 'herramienta', section: 'Máquinas', sectionKey: 'maquinas', serialNumber: 'CHZ-001', quantity: 1, condition: 'operativo', location: 'Unidad 163-01', lastMaintenance: '2026-01-10', nextMaintenance: '2026-07-10', assignedTo: null, notes: null },
  { id: 'inv-09', name: 'Expansor Hidráulico', category: 'herramienta', section: 'Máquinas', sectionKey: 'maquinas', serialNumber: 'EXP-001', quantity: 1, condition: 'operativo', location: 'Unidad 163-01', lastMaintenance: '2026-01-10', nextMaintenance: '2026-07-10', assignedTo: null, notes: null },
  { id: 'inv-10', name: 'Generador Eléctrico 5kW', category: 'herramienta', section: 'Servicios Generales', sectionKey: 'servicios_generales', serialNumber: 'GEN-001', quantity: 1, condition: 'operativo', location: 'Almacén General', lastMaintenance: '2026-02-01', nextMaintenance: '2026-08-01', assignedTo: null, notes: null },
  // COMUNICACIÓN
  { id: 'inv-11', name: 'Radio Motorola APX900', category: 'comunicacion', section: 'Jefatura', sectionKey: 'jefatura', serialNumber: 'RAD-001', quantity: 1, condition: 'operativo', location: 'Central de Comunicaciones', lastMaintenance: null, nextMaintenance: null, assignedTo: null, notes: null },
  { id: 'inv-12', name: 'Radio Motorola APX900', category: 'comunicacion', section: 'Jefatura', sectionKey: 'jefatura', serialNumber: 'RAD-002', quantity: 1, condition: 'operativo', location: 'Central de Comunicaciones', lastMaintenance: null, nextMaintenance: null, assignedTo: null, notes: null },
  { id: 'inv-13', name: 'Radio Motorola DP4400', category: 'comunicacion', section: 'Máquinas', sectionKey: 'maquinas', serialNumber: 'RAD-003', quantity: 2, condition: 'operativo', location: 'Unidad 163-01', lastMaintenance: null, nextMaintenance: null, assignedTo: null, notes: null },
  // MÉDICO
  { id: 'inv-14', name: 'Desfibrilador DEA Zoll AED Plus', category: 'medico', section: 'Prehospitalaria', sectionKey: 'prehospitalaria', serialNumber: 'DEA-001', quantity: 1, condition: 'operativo', location: 'Ambulancia 163-03', lastMaintenance: '2026-03-01', nextMaintenance: '2026-09-01', assignedTo: null, notes: 'Electrodos vencen en agosto 2026' },
  { id: 'inv-15', name: 'Monitor Multiparámetro Mindray', category: 'medico', section: 'Prehospitalaria', sectionKey: 'prehospitalaria', serialNumber: 'MON-001', quantity: 1, condition: 'operativo', location: 'Ambulancia 163-03', lastMaintenance: '2026-01-15', nextMaintenance: '2026-07-15', assignedTo: null, notes: null },
  { id: 'inv-16', name: 'Botiquín Avanzado APH', category: 'medico', section: 'Prehospitalaria', sectionKey: 'prehospitalaria', serialNumber: 'BOT-001', quantity: 2, condition: 'operativo', location: 'Ambulancia 163-03', lastMaintenance: '2026-04-01', nextMaintenance: '2026-07-01', assignedTo: null, notes: 'Stock de insumos al 80%' },
  // INSUMOS
  { id: 'inv-17', name: 'Espuma AFFF 6%', category: 'insumo', section: 'Servicios Generales', sectionKey: 'servicios_generales', serialNumber: null, quantity: 20, condition: 'operativo', location: 'Almacén General', lastMaintenance: null, nextMaintenance: '2026-12-01', assignedTo: null, notes: 'Stock mínimo: 10 bidones' },
  { id: 'inv-18', name: 'Mascarillas N95', category: 'insumo', section: 'Servicios Generales', sectionKey: 'servicios_generales', serialNumber: null, quantity: 100, condition: 'operativo', location: 'Almacén General', lastMaintenance: null, nextMaintenance: null, assignedTo: null, notes: 'Stock para 3 meses' },
] as MockBase[]).map(mockItem)

export default async function InventarioPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canManage = permissions.includes('inventory.manage')
  const currentUserName = session.user.name ?? ''

  // Intentar datos reales de DynamoDB; usar mock como fallback de desarrollo
  let allItems: InventoryItem[]
  try {
    const dbItems = await getAllInventoryItems()
    allItems = dbItems.length > 0
      ? dbItems.map(i => {
          const sec = resolveSection(i.sectionId)
          return {
            id: i.itemId,
            name: i.name,
            category: i.category as InventoryCategory,
            section: sec.name,
            sectionKey: sec.key,
            serialNumber: i.serialNumber ?? null,
            brand: i.brand ?? null,
            model: i.model ?? null,
            inbpCode: i.inbpCode ?? null,
            quantity: i.quantity,
            condition: (i.condition as InventoryCondition) ?? 'operativo',
            location: i.ubicacionInterna ?? i.almacenTipo ?? null,
            lastMaintenance: null,
            nextMaintenance: null,
            assignedTo: null,
            notes: i.notes ?? null,
          } satisfies InventoryItem
        })
      : MOCK_INVENTORY
  } catch {
    allItems = MOCK_INVENTORY
  }

  return (
    <InventarioClient
      items={allItems}
      canManage={canManage}
    />
  )
}
