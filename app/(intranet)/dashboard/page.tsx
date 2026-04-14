import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  Users,
  Moon,
  AlertTriangle,
  GraduationCap,
  Clock,
  Activity,
  TrendingUp,
  FileText,
  Award,
  Bell,
  Building2,
  Calendar,
  Megaphone,
} from "lucide-react"
import Link from "next/link"
import type { Permission } from "@/lib/auth/permissions"

const GRADE_LABELS: Record<string, string> = {
  aspirante: "Aspirante",
  seccionario: "Seccionario",
  subteniente: "Subteniente",
  teniente: "Teniente",
  capitan: "Capitán",
  teniente_brigadier: "Teniente Brigadier",
  brigadier: "Brigadier",
  brigadier_mayor: "Brigadier Mayor",
  brigadier_general: "Brigadier General",
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { name, grade, permissions: rawPermissions } = session.user
  const permissions = rawPermissions as Permission[]
  const gradeLabel = GRADE_LABELS[grade] ?? grade

  const isJefatura =
    permissions.includes("company.manage") ||
    permissions.includes("company.view_all")
  const isJefeSeccion = permissions.includes("section.manage") && !isJefatura
  const isEfectivo = !isJefatura && !isJefeSeccion

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Bienvenido, <span className="font-semibold text-foreground">{name}</span>
        </p>
        <Badge className="mt-2 bg-primary/10 text-primary border-primary/20">
          {gradeLabel}
        </Badge>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isJefatura && <JefaturaKPIs />}
        {isJefeSeccion && <JefeSeccionKPIs />}
        {isEfectivo && <EfectivoKPIs />}
      </div>

      {/* Acciones principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Guardia nocturna — todos */}
        <ActionCard
          href="/guardia-nocturna"
          icon={Moon}
          title="Guardia Nocturna"
          description="Ver calendario y gestionar reservas"
          gradient="from-primary to-red-800"
        />

        {/* Incidencias — todos */}
        <ActionCard
          href="/incidencias"
          icon={AlertTriangle}
          title="Incidencias"
          description="Reportar problemas y hacer solicitudes"
          gradient="from-amber-500 to-red-700"
        />

        {/* ESBAS — todos */}
        <ActionCard
          href="/esbas"
          icon={GraduationCap}
          title="ESBAS"
          description="Capacitación y malla curricular"
          gradient="from-red-600 to-red-900"
          normativeRef="NDR Malla Curricular"
        />

        {/* Personal — jefes */}
        {permissions.includes("personnel.view_section") && (
          <ActionCard
            href="/personal"
            icon={Users}
            title="Personal"
            description="Directorio y gestión de efectivos"
            gradient="from-primary to-red-800"
          />
        )}

        {/* Secciones — jefes */}
        {permissions.includes("section.manage") && (
          <ActionCard
            href="/secciones"
            icon={Building2}
            title="Secciones"
            description="Gestión de secciones (Art. 112 RIF)"
            gradient="from-red-700 to-red-900"
            normativeRef="Art. 112 RIF CGBVP"
          />
        )}

        {/* Reportes — jefes */}
        {permissions.includes("reports.view_section") && (
          <ActionCard
            href="/reportes"
            icon={FileText}
            title="Reportes"
            description="Informes y estadísticas"
            gradient="from-amber-600 to-red-800"
          />
        )}

        {/* Contenido — imagen */}
        {permissions.includes("content.view") && (
          <ActionCard
            href="/contenido"
            icon={Calendar}
            title="Contenido e Imagen"
            description="Calendario de publicaciones"
            gradient="from-primary to-red-800"
          />
        )}

        {/* Configuración — primer jefe */}
        {permissions.includes("system.admin") && (
          <ActionCard
            href="/configuracion"
            icon={Award}
            title="Configuración"
            description="Ajustes del sistema"
            gradient="from-red-800 to-red-950"
          />
        )}
      </div>

      {/* Panel de estado secciones — solo jefatura */}
      {isJefatura && (
        <Card className="glass border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Estado por Sección
              <span className="text-xs font-normal text-muted-foreground ml-1">Art. 112 RIF</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { key: "maquinas", label: "Máquinas", ref: "116a", status: "verde" },
                { key: "servicios_generales", label: "Servicios Gen.", ref: "116b", status: "amarillo" },
                { key: "instruccion", label: "Instrucción", ref: "116c", status: "verde" },
                { key: "prehospitalaria", label: "Prehospitalaria", ref: "116d", status: "verde" },
                { key: "administracion", label: "Administración", ref: "117a", status: "verde" },
                { key: "imagen", label: "Imagen", ref: "117b", status: "verde" },
              ].map((s) => (
                <Link key={s.key} href={`/secciones/${s.key}`}>
                  <div className="p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          s.status === "verde"
                            ? "bg-green-500"
                            : s.status === "amarillo"
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">Art. {s.ref}</span>
                    </div>
                    <p className="text-sm font-medium">{s.label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actividad reciente */}
      <Card className="glass border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground italic">
            <p>Los registros de actividad aparecerán aquí una vez conectado a la base de datos.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Subcomponentes ────────────────────────────────────────────────

function JefaturaKPIs() {
  return (
    <>
      <StatCard icon={Users} label="Total Efectivos" value="—" sub="Conectar BD" />
      <StatCard icon={Moon} label="Guardias Activas" value="—" sub="Esta noche" />
      <StatCard icon={AlertTriangle} label="Incidencias" value="—" sub="Pendientes" />
      <StatCard icon={TrendingUp} label="Eficiencia" value="—%" sub="Este mes" />
    </>
  )
}

function JefeSeccionKPIs() {
  return (
    <>
      <StatCard icon={Users} label="Personal Sección" value="—" sub="Activos" />
      <StatCard icon={AlertTriangle} label="Incidencias" value="—" sub="Pendientes" />
      <StatCard icon={Clock} label="Horas del Mes" value="—h" sub="Sección" />
      <StatCard icon={FileText} label="Reportes" value="—" sub="Este mes" />
    </>
  )
}

function EfectivoKPIs() {
  return (
    <>
      <StatCard icon={Clock} label="Horas del Mes" value="—h" sub="Conectar BD" />
      <StatCard icon={Moon} label="Próxima Guardia" value="—" sub="Reservar" />
      <StatCard icon={GraduationCap} label="ESBAS" value="—/30" sub="Lecciones" />
      <StatCard icon={AlertTriangle} label="Incidencias" value="—" sub="Abiertas" />
    </>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub: string
}) {
  return (
    <Card className="bento-item glass border-primary/10">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
  gradient,
  normativeRef,
}: {
  href: string
  icon: React.ElementType
  title: string
  description: string
  gradient: string
  normativeRef?: string
}) {
  return (
    <Link href={href}>
      <Card className="bento-item glass border-primary/10 hover:border-primary/30 cursor-pointer h-full transition-all">
        <CardHeader>
          <div
            className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-3`}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
          {normativeRef && (
            <p className="text-xs text-muted-foreground">{normativeRef}</p>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <Button
            className={`w-full bg-gradient-to-r ${gradient} hover:opacity-90 text-white`}
          >
            Acceder
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}
