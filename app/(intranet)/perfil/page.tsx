import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  UserCircle, Clock, Shield, GraduationCap, Star,
  TrendingUp, Calendar, Phone, Mail, Edit,
} from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"

const GRADE_LABELS: Record<string, string> = {
  aspirante: 'Aspirante', seccionario: 'Seccionario', subteniente: 'Subteniente',
  teniente: 'Teniente', capitan: 'Capitán', teniente_brigadier: 'Ten. Brigadier',
  brigadier: 'Brigadier', brigadier_mayor: 'Brig. Mayor', brigadier_general: 'Brig. General',
}

// NDR Ascensos — requisitos mínimos por grado (h/trimestre + guardias)
const NDR_REQUISITOS: Record<string, { horasTrimestrales: number; guardiasTrimestrales: number }> = {
  aspirante:          { horasTrimestrales: 150, guardiasTrimestrales: 9 },
  seccionario:        { horasTrimestrales: 120, guardiasTrimestrales: 6 },
  subteniente:        { horasTrimestrales: 100, guardiasTrimestrales: 4 },
  teniente:           { horasTrimestrales: 80,  guardiasTrimestrales: 3 },
  capitan:            { horasTrimestrales: 60,  guardiasTrimestrales: 2 },
  teniente_brigadier: { horasTrimestrales: 60,  guardiasTrimestrales: 2 },
  brigadier:          { horasTrimestrales: 40,  guardiasTrimestrales: 1 },
  brigadier_mayor:    { horasTrimestrales: 40,  guardiasTrimestrales: 1 },
}

// Mock stats — en producción: await getProfileStats(profileId)
const MOCK_STATS = {
  horasTrimestrales: 87.5,
  guardiasTrimestrales: 4,
  horasTotales: 1240,
  guardiasTotales: 87,
  incidenciasCreadas: 12,
  esbas: { completadas: 5, total: 30, percentage: 17 },
  especialidades: ['Bombero Básico'],
  joinDate: '2020-03-15',
  section: 'Sección de Máquinas',
  sectionRole: 'miembro',
  phone: '+51 999 001 005',
  email: 'efectivo@cia163.pe',
  bloodType: 'O+',
  birthDate: '1995-08-22',
}

const ROLE_LABELS: Record<string, string> = {
  primer_jefe: 'Primer Jefe', segundo_jefe: 'Segundo Jefe',
  jefe_seccion: 'Jefe de Sección', adjunto: 'Adjunto', miembro: 'Miembro',
}

// TODO Phase 4: editable fields with form + server action
export default async function PerfilPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { name, email, grade, status, permissions } = session.user as {
    name?: string | null
    email?: string | null
    grade?: string
    status?: string
    permissions?: Permission[]
  }

  const gradeKey = grade ?? 'seccionario'
  const requisitos = NDR_REQUISITOS[gradeKey] ?? NDR_REQUISITOS.seccionario
  const horasPct = Math.min(100, (MOCK_STATS.horasTrimestrales / requisitos.horasTrimestrales) * 100)
  const guardiasPct = Math.min(100, (MOCK_STATS.guardiasTrimestrales / requisitos.guardiasTrimestrales) * 100)

  const initials = (name ?? 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  // Años de servicio
  const yearsOfService = Math.floor(
    (new Date().getTime() - new Date(MOCK_STATS.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
  )

  return (
    <div>
      <PageHeader
        icon={UserCircle}
        title="Mi Perfil"
        description="Información personal, estadísticas de servicio y progreso"
      >
        <Button variant="outline" size="sm" disabled>
          <Edit className="h-4 w-4 mr-2" />
          Editar perfil
        </Button>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Columna izquierda: datos personales ───────────────── */}
        <div className="space-y-4">
          {/* Tarjeta de identidad */}
          <Card className="glass border-primary/10">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-lg leading-tight">{name ?? '—'}</p>
                <p className="text-sm text-muted-foreground">{MOCK_STATS.section}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[MOCK_STATS.sectionRole]}</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {grade && (
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {GRADE_LABELS[gradeKey] ?? gradeKey}
                  </Badge>
                )}
                {status && (
                  <Badge variant="outline" className={`text-xs ${
                    status === 'activo' ? 'bg-green-500/10 text-green-700 border-green-500/20' : ''
                  }`}>
                    {status}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Datos de contacto */}
          <Card className="glass border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Datos de contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { icon: Phone, label: MOCK_STATS.phone },
                { icon: Mail, label: MOCK_STATS.email ?? email ?? '—' },
                { icon: Calendar, label: `Incorporación: ${new Date(MOCK_STATS.joinDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}` },
                { icon: Shield, label: `Grupo sanguíneo: ${MOCK_STATS.bloodType}` },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs">{label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Especialidades */}
          {MOCK_STATS.especialidades.length > 0 && (
            <Card className="glass border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Especialidades
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {MOCK_STATS.especialidades.map(spec => (
                  <Badge key={spec} variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                    {spec}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Columna derecha: estadísticas ─────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* KPIs totales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Años de servicio', value: yearsOfService, icon: Calendar, color: 'text-primary' },
              { label: 'Horas totales', value: MOCK_STATS.horasTotales, icon: Clock, color: 'text-blue-600' },
              { label: 'Guardias realizadas', value: MOCK_STATS.guardiasTotales, icon: Shield, color: 'text-indigo-600' },
              { label: 'Incidencias reportadas', value: MOCK_STATS.incidenciasCreadas, icon: TrendingUp, color: 'text-amber-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="glass border-primary/10">
                <CardContent className="pt-4">
                  <Icon className={`h-5 w-5 mb-1 ${color}`} />
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cumplimiento NDR Ascensos (trimestre actual) */}
          <Card className="glass border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Cumplimiento NDR Ascensos — trimestre actual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />Horas de servicio
                    </span>
                    <span className={`font-medium ${horasPct >= 100 ? 'text-green-600' : horasPct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {MOCK_STATS.horasTrimestrales}/{requisitos.horasTrimestrales}h
                    </span>
                  </div>
                  <Progress value={horasPct} className="h-2" />
                  <p className="text-xs text-muted-foreground">{horasPct.toFixed(0)}% del requisito</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5" />Guardias nocturnas
                    </span>
                    <span className={`font-medium ${guardiasPct >= 100 ? 'text-green-600' : guardiasPct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {MOCK_STATS.guardiasTrimestrales}/{requisitos.guardiasTrimestrales}
                    </span>
                  </div>
                  <Progress value={guardiasPct} className="h-2" />
                  <p className="text-xs text-muted-foreground">{guardiasPct.toFixed(0)}% del requisito</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progreso ESBAS */}
          <Card className="glass border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Progreso ESBAS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-primary">{MOCK_STATS.esbas.percentage}%</p>
                <p className="text-sm text-muted-foreground mb-1">
                  {MOCK_STATS.esbas.completadas} de {MOCK_STATS.esbas.total} lecciones
                </p>
              </div>
              <Progress value={MOCK_STATS.esbas.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Promoción activa: ESBAS 2026-I
              </p>
            </CardContent>
          </Card>

          {/* Permisos activos */}
          {(permissions ?? []).length > 0 && (
            <Card className="glass border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Permisos activos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {(permissions ?? []).map(p => (
                    <Badge key={p} variant="secondary" className="text-xs font-mono">{p}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
