import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { IncidenciasClient } from "./incidencias-client"
import { AlertTriangle } from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"

// Datos de ejemplo — en producción: await getIncidents({ sectionId, status })
const MOCK_INCIDENTS = [
  {
    id: 'inc-1',
    code: 'INC-2026-001',
    title: 'Falta de EPP en Sección Máquinas',
    description: 'Se requiere reposición de cascos, guantes y botas para el personal de la sección. Stock actual por debajo del mínimo operativo.',
    priority: 'alta' as const,
    status: 'en_proceso' as const,
    category: 'equipamiento',
    section: 'Máquinas',
    reportedBy: 'Capitán Herrera Vargas',
    assignedTo: 'Teniente Córdova Quispe',
    createdAt: '2026-04-01T09:00:00Z',
    updatedAt: '2026-04-03T14:30:00Z',
  },
  {
    id: 'inc-2',
    code: 'INC-2026-002',
    title: 'Unidad B-163 requiere mantenimiento de frenos',
    description: 'El autobomba B-163 presenta falla en el sistema de frenos delanteros. Se recomienda salida de servicio hasta revisión completa.',
    priority: 'urgente' as const,
    status: 'pendiente' as const,
    category: 'vehiculos',
    section: 'Máquinas',
    reportedBy: 'Seccionario Cárdenas López',
    assignedTo: null,
    createdAt: '2026-04-08T16:00:00Z',
    updatedAt: '2026-04-08T16:00:00Z',
  },
  {
    id: 'inc-3',
    code: 'INC-2026-003',
    title: 'Medicamentos vencidos en botiquín APH',
    description: 'Revisión rutinaria detectó 12 items vencidos en el botiquín de la unidad APH-163. Se solicita reposición inmediata.',
    priority: 'media' as const,
    status: 'resuelta' as const,
    category: 'insumos',
    section: 'Prehospitalaria',
    reportedBy: 'Seccionaria Díaz Tello',
    assignedTo: 'Teniente Flores Medina',
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-04-05T11:00:00Z',
  },
  {
    id: 'inc-4',
    code: 'INC-2026-004',
    title: 'Filtración en techo cuarto de guardia',
    description: 'Se detectó filtración de agua en el techo del cuarto de guardia sector norte. Genera humedad que afecta el confort y puede dañar equipos.',
    priority: 'media' as const,
    status: 'pendiente' as const,
    category: 'infraestructura',
    section: 'Servicios Generales',
    reportedBy: 'Teniente Córdova Quispe',
    assignedTo: null,
    createdAt: '2026-04-10T08:00:00Z',
    updatedAt: '2026-04-10T08:00:00Z',
  },
]

export default async function IncidenciasPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canManageAll     = permissions.includes('incidents.manage_all')
  const canManageSection = permissions.includes('incidents.manage_section')
  const canCreate        = permissions.includes('incidents.create')
  const currentUserName  = session.user.name ?? ''

  return (
    <div>
      <PageHeader
        icon={AlertTriangle}
        title="Incidencias"
        description="Registro y seguimiento de incidencias operativas de la compañía"
      />
      <IncidenciasClient
        incidents={MOCK_INCIDENTS}
        canManageAll={canManageAll}
        canManageSection={canManageSection}
        canCreate={canCreate}
        currentUserName={currentUserName}
      />
    </div>
  )
}
