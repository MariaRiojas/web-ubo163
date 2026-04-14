import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PageHeader } from "@/components/intranet/page-header"
import {
  Shield, Truck, Wrench, GraduationCap, Stethoscope, ClipboardList, Camera,
  Users, Package, AlertCircle, Activity, Plus, UserPlus,
} from "lucide-react"
import Link from "next/link"
import type { Permission } from "@/lib/auth/permissions"

const VALID_KEYS = ['jefatura', 'maquinas', 'servicios_generales', 'instruccion', 'prehospitalaria', 'administracion', 'imagen'] as const
type SectionKey = typeof VALID_KEYS[number]

import type { LucideIcon } from "lucide-react"

const SECTION_META: Record<SectionKey, {
  name: string
  type: string
  icon: LucideIcon
  normativeRef: string
  description: string
  color: string
}> = {
  jefatura: { name: 'Jefatura de Compañía', type: 'jefatura', icon: Shield, normativeRef: 'Art. 113-115 RIF CGBVP', description: 'Dirección y representación de la Unidad de Bomberos.', color: 'text-primary' },
  maquinas: { name: 'Sección de Máquinas', type: 'linea', icon: Truck, normativeRef: 'Art. 116a RIF CGBVP', description: 'Operatividad y equipamiento de unidades de emergencia. Responsable del mantenimiento preventivo y correctivo de todos los vehículos.', color: 'text-blue-600' },
  servicios_generales: { name: 'Sección de Servicios Generales', type: 'linea', icon: Wrench, normativeRef: 'Art. 116b RIF CGBVP', description: 'Gestión de insumos, almacén y mantenimiento de instalaciones del cuartel.', color: 'text-blue-600' },
  instruccion: { name: 'Sección de Instrucción y Entrenamiento', type: 'linea', icon: GraduationCap, normativeRef: 'Art. 116c RIF CGBVP', description: 'Capacitación del personal en todos sus niveles. Administra el proceso ESBAS y la malla curricular.', color: 'text-blue-600' },
  prehospitalaria: { name: 'Sección de Atención Prehospitalaria', type: 'linea', icon: Stethoscope, normativeRef: 'Art. 116d RIF CGBVP', description: 'Equipamiento y operatividad de unidades médicas. Gestiona farmacia, equipos y protocolos APH.', color: 'text-blue-600' },
  administracion: { name: 'Sección de Administración', type: 'asesoramiento', icon: ClipboardList, normativeRef: 'Art. 117a RIF CGBVP', description: 'Gestión administrativa interna: legajos, resoluciones, horas de servicio y reportes.', color: 'text-amber-600' },
  imagen: { name: 'Sección de Imagen de Compañía', type: 'asesoramiento', icon: Camera, normativeRef: 'Art. 117b RIF CGBVP', description: 'Proyección institucional, comunicaciones y gestión de redes sociales.', color: 'text-amber-600' },
}

const GRADE_LABELS: Record<string, string> = {
  aspirante: 'Aspirante', seccionario: 'Seccionario', subteniente: 'Subteniente',
  teniente: 'Teniente', capitan: 'Capitán', teniente_brigadier: 'Ten. Brigadier',
  brigadier: 'Brigadier', brigadier_mayor: 'Brig. Mayor', brigadier_general: 'Brig. General',
}

const ROLE_LABELS: Record<string, string> = {
  primer_jefe: 'Primer Jefe', segundo_jefe: 'Segundo Jefe',
  jefe_seccion: 'Jefe de Sección', adjunto: 'Adjunto', miembro: 'Miembro',
}

// Datos de ejemplo — en producción: await getSectionWithPersonnel(key)
const MOCK_PERSONNEL: Record<SectionKey, Array<{ name: string; grade: string; role: string }>> = {
  jefatura: [
    { name: 'Brigadier Torres Mendoza', grade: 'brigadier', role: 'primer_jefe' },
    { name: 'Ten. Brigadier Ramírez Silva', grade: 'teniente_brigadier', role: 'segundo_jefe' },
  ],
  maquinas: [
    { name: 'Capitán Herrera Vargas', grade: 'capitan', role: 'jefe_seccion' },
    { name: 'Seccionario Cárdenas López', grade: 'seccionario', role: 'miembro' },
    { name: 'Seccionario Mendoza Quiroz', grade: 'seccionario', role: 'miembro' },
  ],
  servicios_generales: [
    { name: 'Teniente Córdova Quispe', grade: 'teniente', role: 'jefe_seccion' },
  ],
  instruccion: [
    { name: 'Teniente Soto Palacios', grade: 'teniente', role: 'jefe_seccion' },
    { name: 'Seccionaria Quispe Huanca', grade: 'seccionario', role: 'miembro' },
  ],
  prehospitalaria: [
    { name: 'Teniente Flores Medina', grade: 'teniente', role: 'jefe_seccion' },
    { name: 'Seccionaria Díaz Tello', grade: 'seccionario', role: 'miembro' },
  ],
  administracion: [
    { name: 'Teniente Vega Castro', grade: 'teniente', role: 'jefe_seccion' },
  ],
  imagen: [
    { name: 'Subteniente Ruiz Palomino', grade: 'subteniente', role: 'jefe_seccion' },
  ],
}

export default async function SectionPage({ params }: { params: Promise<{ key: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { key: rawKey } = await params
  const key = rawKey as SectionKey
  if (!VALID_KEYS.includes(key)) notFound()

  const meta = SECTION_META[key]
  const Icon = meta.icon
  const permissions = session.user.permissions as Permission[]
  const canManage = permissions.includes('section.manage') || permissions.includes('company.view_all')
  const canEditInventory = permissions.includes('inventory.manage')
  const personnel = MOCK_PERSONNEL[key]

  return (
    <div>
      <PageHeader
        icon={Icon}
        title={meta.name}
        description={meta.description}
        normativeRef={meta.normativeRef}
      >
        {canManage && (
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
            <UserPlus className="h-4 w-4 mr-2" />
            Agregar personal
          </Button>
        )}
      </PageHeader>

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="personal">
            Personal
            <Badge variant="secondary" className="ml-2 text-xs">{personnel.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="incidencias">Incidencias</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal">Personal activo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{personnel.length}</p>
              </CardContent>
            </Card>
            <Card className="glass border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal">Incidencias abiertas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">—</p>
              </CardContent>
            </Card>
            <Card className="glass border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal">Items en inventario</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">—</p>
              </CardContent>
            </Card>
          </div>

          {/* Accesos rápidos específicos por sección */}
          {key === 'instruccion' && (
            <Card className="glass border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Gestión ESBAS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Administrar el proceso de capacitación, lecciones y progreso de aspirantes.
                </p>
                <Button asChild size="sm">
                  <Link href="/intranet/esbas">Ir a ESBAS</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {key === 'imagen' && (
            <Card className="glass border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="h-5 w-5 text-amber-600" />
                  Calendario de Contenido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Planificar publicaciones en redes sociales y fechas institucionales.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/intranet/contenido">Ver Calendario</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PERSONAL */}
        <TabsContent value="personal">
          <Card className="glass border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Personal de la sección
              </CardTitle>
              {canManage && (
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {personnel.map((person, i) => {
                  const initials = person.name.split(' ').slice(0, 2).map(n => n[0]).join('')
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{person.name}</p>
                        <p className="text-xs text-muted-foreground">{GRADE_LABELS[person.grade]}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={person.role === 'jefe_seccion' || person.role === 'primer_jefe' || person.role === 'segundo_jefe'
                          ? 'border-primary/30 text-primary'
                          : 'border-muted-foreground/30 text-muted-foreground'}
                      >
                        {ROLE_LABELS[person.role]}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INCIDENCIAS */}
        <TabsContent value="incidencias">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Incidencias relacionadas con esta sección.</p>
              <Button size="sm" asChild>
                <Link href="/intranet/incidencias">
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva incidencia
                </Link>
              </Button>
            </div>
            <Card className="glass border-primary/10">
              <CardContent className="py-12 text-center text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No hay incidencias abiertas para esta sección.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* INVENTARIO */}
        <TabsContent value="inventario">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Equipos y materiales bajo responsabilidad de la sección.</p>
              {canEditInventory && (
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar item
                </Button>
              )}
            </div>
            <Card className="glass border-primary/10">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Conectar a la base de datos para ver el inventario.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ACTIVIDAD */}
        <TabsContent value="actividad">
          <Card className="glass border-primary/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Registro de actividad
              </CardTitle>
            </CardHeader>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>El log de actividad aparecerá aquí una vez conectado a la base de datos.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
