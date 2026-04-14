import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { InventarioClient } from "./inventario-client"
import { Package } from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"

export type InventoryCategory =
  | 'epp' | 'herramienta' | 'vehiculo' | 'comunicacion'
  | 'medico' | 'rescate' | 'hazmat' | 'insumo' | 'mobiliario'

export type InventoryCondition =
  | 'operativo' | 'mantenimiento' | 'baja' | 'pendiente_revision'

export interface InventoryItem {
  id: string
  name: string
  category: InventoryCategory
  section: string
  sectionKey: string
  serialNumber: string | null
  quantity: number
  condition: InventoryCondition
  location: string | null
  lastMaintenance: string | null
  nextMaintenance: string | null
  assignedTo: string | null
  notes: string | null
}

// Mock data — en producción: await db.query.inventory.findMany({ with: { section: true, assignedToProfile: true } })
const MOCK_INVENTORY: InventoryItem[] = [
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
]

export default async function InventarioPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canManage = permissions.includes('inventory.manage')
  const currentUserName = session.user.name ?? ''

  // Items asignados al usuario actual
  const myItems = MOCK_INVENTORY.filter(i => i.assignedTo === currentUserName)

  // Items que necesitan atención próxima (mantenimiento en < 30 días o condición no operativo)
  const today = new Date()
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const maintenanceItems = MOCK_INVENTORY.filter(i => {
    if (i.condition !== 'operativo') return true
    if (!i.nextMaintenance) return false
    return new Date(i.nextMaintenance) <= thirtyDaysFromNow
  })

  return (
    <div>
      <PageHeader
        icon={Package}
        title="Inventario"
        description="Control de equipos, vehículos y materiales por sección"
      />
      <InventarioClient
        items={MOCK_INVENTORY}
        myItems={myItems}
        maintenanceItems={maintenanceItems}
        canManage={canManage}
        currentUserName={currentUserName}
      />
    </div>
  )
}
