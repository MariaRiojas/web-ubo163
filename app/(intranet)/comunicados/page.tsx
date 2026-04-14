import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { ComunicadosClient } from "./comunicados-client"
import { Megaphone } from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"

// Datos de ejemplo — en producción: await getAnnouncements({ targetGrades, sectionIds })
const MOCK_ANNOUNCEMENTS = [
  {
    id: 'ann-1',
    title: 'Cambio de horario — Instrucción mensual de abril',
    content: 'Se informa a todo el personal activo que la instrucción mensual programada para el sábado 12 de abril queda reprogramada para el domingo 13 de abril a las 09:00h en el patio de maniobras. Se solicita puntualidad y presentación con uniforme de instrucción. Asistencia obligatoria para seccionarios y subtenientes.',
    priority: 'alta' as const,
    author: 'Brigadier Torres Mendoza',
    targetSections: ['all'],
    targetGrades: ['all'],
    publishedAt: '2026-04-09T08:00:00Z',
    expiresAt: '2026-04-13T23:59:00Z',
    isPinned: true,
  },
  {
    id: 'ann-2',
    title: 'Proceso de ascenso T2-2026 — Plazo de presentación de documentos',
    content: 'La Sección de Administración informa que el plazo para presentar la carpeta de ascenso correspondiente al trimestre T2-2026 vence el día viernes 15 de abril. Los postulantes deben presentar: ficha de servicio, certificado de horas firmado por su jefe de sección, y constancia de aprobación ESBAS (aspirantes). Consultar con Administración para requisitos completos.',
    priority: 'urgente' as const,
    author: 'Teniente Vega Castro',
    targetSections: ['all'],
    targetGrades: ['aspirante', 'seccionario', 'subteniente'],
    publishedAt: '2026-04-08T10:30:00Z',
    expiresAt: '2026-04-15T23:59:00Z',
    isPinned: true,
  },
  {
    id: 'ann-3',
    title: 'Mantenimiento de vehículos — fin de semana 19-20 abril',
    content: 'La Sección de Máquinas informa que el fin de semana del 19 al 20 de abril se realizará el mantenimiento preventivo semestral de todas las unidades. Las unidades estarán fuera de servicio durante ese período. Cualquier emergencia será coordinada con el Grupo de Intervención Rápida disponible.',
    priority: 'media' as const,
    author: 'Capitán Herrera Vargas',
    targetSections: ['maquinas', 'jefatura'],
    targetGrades: ['all'],
    publishedAt: '2026-04-07T14:00:00Z',
    expiresAt: '2026-04-21T23:59:00Z',
    isPinned: false,
  },
  {
    id: 'ann-4',
    title: 'Bienvenida a nuevos aspirantes — Promoción ESBAS 2026',
    content: 'La Cía. N°163 da la más cordial bienvenida a los nuevos aspirantes González Pérez y Mamani Torres, quienes iniciaron su proceso ESBAS el 20 de enero de 2026. ¡Éxitos en su formación!',
    priority: 'baja' as const,
    author: 'Teniente Soto Palacios',
    targetSections: ['instruccion'],
    targetGrades: ['all'],
    publishedAt: '2026-01-20T09:00:00Z',
    expiresAt: null,
    isPinned: false,
  },
  {
    id: 'ann-5',
    title: 'Actualización de protocolos APH — RCP 2025',
    content: 'La Sección Prehospitalaria comunica que se han actualizado los protocolos de RCP conforme a las guías AHA 2025. Todo el personal con rol APH deberá completar la recertificación antes del 30 de mayo. Fechas de capacitación disponibles con la Teniente Flores Medina.',
    priority: 'alta' as const,
    author: 'Teniente Flores Medina',
    targetSections: ['prehospitalaria'],
    targetGrades: ['all'],
    publishedAt: '2026-04-05T11:00:00Z',
    expiresAt: '2026-05-30T23:59:00Z',
    isPinned: false,
  },
]

export default async function ComunicadosPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canCreate = permissions.includes('announcements.create')
  const currentUserName = session.user.name ?? ''

  return (
    <div>
      <PageHeader
        icon={Megaphone}
        title="Comunicados"
        description="Avisos y comunicaciones oficiales de la compañía"
      />
      <ComunicadosClient
        announcements={MOCK_ANNOUNCEMENTS}
        canCreate={canCreate}
        currentUserName={currentUserName}
      />
    </div>
  )
}
