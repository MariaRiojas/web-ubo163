import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/intranet/page-header"
import { Building2, ChevronRight, Shield, Truck, Wrench, GraduationCap, Stethoscope, ClipboardList, Camera } from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"

// Mapa de iconos por sección
const SECTION_ICONS: Record<string, React.ElementType> = {
  jefatura: Shield,
  maquinas: Truck,
  servicios_generales: Wrench,
  instruccion: GraduationCap,
  prehospitalaria: Stethoscope,
  administracion: ClipboardList,
  imagen: Camera,
}

// Datos estáticos de secciones (en producción vendría de la BD via getAllSections())
const SECTIONS = [
  { key: 'jefatura', name: 'Jefatura de Compañía', type: 'jefatura', normativeRef: 'Art. 113-115 RIF', description: 'Dirección y representación de la UBO.' },
  { key: 'maquinas', name: 'Sección de Máquinas', type: 'linea', normativeRef: 'Art. 116a RIF', description: 'Operatividad y equipamiento de unidades de emergencia.' },
  { key: 'servicios_generales', name: 'Sección de Servicios Generales', type: 'linea', normativeRef: 'Art. 116b RIF', description: 'Insumos, almacén y mantenimiento de instalaciones.' },
  { key: 'instruccion', name: 'Sección de Instrucción y Entrenamiento', type: 'linea', normativeRef: 'Art. 116c RIF', description: 'Capacitación del personal en todos sus niveles.' },
  { key: 'prehospitalaria', name: 'Sección de Atención Prehospitalaria', type: 'linea', normativeRef: 'Art. 116d RIF', description: 'Equipamiento y operatividad de unidades médicas.' },
  { key: 'administracion', name: 'Sección de Administración', type: 'asesoramiento', normativeRef: 'Art. 117a RIF', description: 'Gestión administrativa interna.' },
  { key: 'imagen', name: 'Sección de Imagen de Compañía', type: 'asesoramiento', normativeRef: 'Art. 117b RIF', description: 'Proyección institucional y comunicaciones.' },
]

const TYPE_LABELS: Record<string, string> = {
  jefatura: 'Jefatura',
  linea: 'Sección de Línea',
  asesoramiento: 'Sección de Asesoramiento',
}

const TYPE_COLORS: Record<string, string> = {
  jefatura: 'bg-primary/10 text-primary border-primary/20',
  linea: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  asesoramiento: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
}

export default async function SeccionesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canManage = permissions.includes('section.manage') || permissions.includes('company.view_all')

  // En producción: const sections = await getAllSections()

  return (
    <div>
      <PageHeader
        icon={Building2}
        title="Secciones"
        description="Estructura organizativa de la compañía según el RIF del CGBVP"
        normativeRef="Art. 112-117 RIF CGBVP"
      />

      <div className="space-y-6">
        {/* Jefatura */}
        {SECTIONS.filter(s => s.type === 'jefatura').map(section => {
          const Icon = SECTION_ICONS[section.key] ?? Building2
          return (
            <Link key={section.key} href={`/intranet/secciones/${section.key}`}>
              <Card className="glass border-primary/20 hover:border-primary/40 transition-all cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{section.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={TYPE_COLORS[section.type]}>
                        {TYPE_LABELS[section.type]}
                      </Badge>
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {section.normativeRef}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          )
        })}

        {/* Secciones de Línea */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Secciones de Línea
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SECTIONS.filter(s => s.type === 'linea').map(section => {
              const Icon = SECTION_ICONS[section.key] ?? Building2
              return (
                <Link key={section.key} href={`/intranet/secciones/${section.key}`}>
                  <Card className="glass border-border hover:border-primary/30 transition-all cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-blue-500/10 rounded-lg shrink-0">
                            <Icon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{section.name}</CardTitle>
                            <Badge variant="outline" className="text-xs mt-1 text-muted-foreground">
                              {section.normativeRef}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Secciones de Asesoramiento */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Secciones de Asesoramiento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SECTIONS.filter(s => s.type === 'asesoramiento').map(section => {
              const Icon = SECTION_ICONS[section.key] ?? Building2
              return (
                <Link key={section.key} href={`/intranet/secciones/${section.key}`}>
                  <Card className="glass border-border hover:border-amber-500/30 transition-all cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-amber-500/10 rounded-lg shrink-0">
                            <Icon className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{section.name}</CardTitle>
                            <Badge variant="outline" className="text-xs mt-1 text-muted-foreground">
                              {section.normativeRef}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
