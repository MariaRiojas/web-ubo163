import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { ContenidoClient } from "./contenido-client"
import { CalendarDays } from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"

export type ContentType = 'post' | 'reel' | 'video' | 'story' | 'carousel'
export type ContentStatus = 'planificado' | 'en_proceso' | 'publicado' | 'cancelado'
export type ContentCategory =
  | 'aniversario' | 'cumpleanos' | 'fecha_especial' | 'prevencion'
  | 'emergencias' | 'reclutamiento' | 'reconocimiento' | 'comunidad' | 'institucional'

export interface ContentItem {
  id: string
  title: string
  date: string          // 'YYYY-MM-DD'
  type: ContentType
  platform: string[]
  category: ContentCategory
  status: ContentStatus
  assignedTo: string | null
  caption: string | null
  templateUrl: string | null
  notes: string | null
}

// Mock data — en producción: await db.query.contentCalendar.findMany({ orderBy: asc(contentCalendar.date) })
const MOCK_CONTENT: ContentItem[] = [
  // Abril 2026
  { id: 'c01', title: 'Día del Bombero Voluntario Peruano', date: '2026-04-04', type: 'post', platform: ['facebook', 'instagram'], category: 'fecha_especial', status: 'publicado', assignedTo: 'Subteniente Ruiz Palomino', caption: '¡Feliz Día del Bombero Voluntario Peruano! Hoy reconocemos la valentía y entrega de todos nuestros efectivos.', templateUrl: 'https://canva.com', notes: null },
  { id: 'c02', title: 'Cumpleaños Brigadier Torres Mendoza', date: '2026-04-08', type: 'story', platform: ['instagram'], category: 'cumpleanos', status: 'publicado', assignedTo: 'Subteniente Ruiz Palomino', caption: null, templateUrl: null, notes: 'Auto-generado desde perfil' },
  { id: 'c03', title: 'Simulacro de incendio en colegio San Martín', date: '2026-04-12', type: 'reel', platform: ['instagram', 'tiktok'], category: 'prevencion', status: 'publicado', assignedTo: 'Subteniente Ruiz Palomino', caption: null, templateUrl: null, notes: 'Grabar durante el simulacro' },
  { id: 'c04', title: 'Convocatoria nuevos aspirantes 2026-II', date: '2026-04-20', type: 'carousel', platform: ['facebook', 'instagram'], category: 'reclutamiento', status: 'en_proceso', assignedTo: 'Subteniente Ruiz Palomino', caption: null, templateUrl: 'https://canva.com', notes: 'Revisar requisitos con Jefatura antes de publicar' },
  { id: 'c05', title: 'Visita del Comandante General CGBVP', date: '2026-04-25', type: 'post', platform: ['facebook', 'instagram'], category: 'institucional', status: 'planificado', assignedTo: null, caption: null, templateUrl: null, notes: null },
  // Mayo 2026
  { id: 'c06', title: 'Día del Trabajo — Homenaje a efectivos', date: '2026-05-01', type: 'post', platform: ['facebook', 'instagram'], category: 'fecha_especial', status: 'planificado', assignedTo: null, caption: null, templateUrl: null, notes: null },
  { id: 'c07', title: 'Cumpleaños Ten. Brigadier Ramírez Silva', date: '2026-05-05', type: 'story', platform: ['instagram'], category: 'cumpleanos', status: 'planificado', assignedTo: null, caption: null, templateUrl: null, notes: 'Auto-generado' },
  { id: 'c08', title: 'Emergencia atendida — Incendio vehicular', date: '2026-05-10', type: 'reel', platform: ['facebook', 'instagram', 'tiktok'], category: 'emergencias', status: 'planificado', assignedTo: null, caption: null, templateUrl: null, notes: 'Pendiente de autorización para publicación' },
  { id: 'c09', title: 'Aniversario Cía. 163 — 74 años', date: '2026-05-15', type: 'video', platform: ['facebook', 'instagram', 'youtube'], category: 'aniversario', status: 'planificado', assignedTo: null, caption: null, templateUrl: null, notes: 'Video institucional — coordinar con Jefatura' },
  { id: 'c10', title: 'Reconocimiento al efectivo del mes', date: '2026-05-28', type: 'post', platform: ['facebook', 'instagram'], category: 'reconocimiento', status: 'planificado', assignedTo: null, caption: null, templateUrl: null, notes: null },
  // Junio 2026
  { id: 'c11', title: 'Día de la Bandera — Formación', date: '2026-06-07', type: 'post', platform: ['facebook', 'instagram'], category: 'fecha_especial', status: 'planificado', assignedTo: null, caption: null, templateUrl: null, notes: null },
  { id: 'c12', title: 'Campaña de prevención incendios forestales', date: '2026-06-15', type: 'carousel', platform: ['facebook', 'instagram'], category: 'prevencion', status: 'planificado', assignedTo: null, caption: null, templateUrl: null, notes: null },
]

export default async function ContenidoPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canManage = permissions.includes('content.manage')

  return (
    <div>
      <PageHeader
        icon={CalendarDays}
        title="Contenido e Imagen"
        description="Calendario de publicaciones y cronograma de imagen institucional · Art. 117b RIF CGBVP"
        normativeRef="Art. 117b RIF"
      />
      <ContenidoClient
        items={MOCK_CONTENT}
        canManage={canManage}
      />
    </div>
  )
}
