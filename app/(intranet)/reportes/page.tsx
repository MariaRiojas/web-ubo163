import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3,
  Download,
  Users,
  Moon,
  Clock,
  GraduationCap,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"

// ── Mock data — en producción: await db.query... ─────────────────

const MOCK_HORAS_TRIMESTRE = [
  { name: "Ruiz Palomino",   grade: "subteniente", horas: 110, required: 100, guardias: 5, reqGuardias: 4 },
  { name: "Soto Palacios",   grade: "teniente",    horas: 91,  required: 80,  guardias: 4, reqGuardias: 3 },
  { name: "Cárdenas López",  grade: "seccionario", horas: 87,  required: 120, guardias: 4, reqGuardias: 6 },
  { name: "Herrera Vargas",  grade: "capitan",     horas: 72,  required: 60,  guardias: 3, reqGuardias: 2 },
  { name: "Flores Medina",   grade: "teniente",    horas: 45,  required: 80,  guardias: 2, reqGuardias: 3 },
  { name: "Mendoza Quiroz",  grade: "seccionario", horas: 54,  required: 120, guardias: 2, reqGuardias: 6 },
  { name: "Quispe Huanca",   grade: "seccionario", horas: 32,  required: 120, guardias: 1, reqGuardias: 6 },
]

const MOCK_ESBAS = [
  { name: "Ruiz Palomino",  completadas: 18, total: 30 },
  { name: "Cárdenas López", completadas: 12, total: 30 },
  { name: "Quispe Huanca",  completadas: 8,  total: 30 },
  { name: "Mendoza Quiroz", completadas: 5,  total: 30 },
]

const MOCK_INCIDENCIAS = [
  { tipo: "Accidente vehicular", qty: 8, color: "bg-red-500" },
  { tipo: "Incendio estructural", qty: 5, color: "bg-amber-500" },
  { tipo: "Rescate",              qty: 4, color: "bg-blue-500" },
  { tipo: "Emergencia médica",    qty: 6, color: "bg-pink-500" },
  { tipo: "Incendio forestal",    qty: 3, color: "bg-orange-500" },
  { tipo: "Otros",                qty: 2, color: "bg-muted" },
]

const MOCK_KPI = {
  efectivosActivos: 24,
  horasPromedio: 70,
  cumplimientoNDR: 57, // % de efectivos que cumplen NDR
  guardiasCubiertas: 14,
  incidenciasEsteMes: 7,
  tendenciaHoras: "up" as "up" | "down" | "flat",
}

const GRADE_LABELS: Record<string, string> = {
  seccionario: "Seccionario",
  subteniente: "Subteniente",
  teniente: "Teniente",
  capitan: "Capitán",
}

// ── Helpers ───────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" />
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

// ── Page ──────────────────────────────────────────────────────────

export default async function ReportesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canView    = permissions.includes("reports.view_section") || permissions.includes("reports.view_all")
  const canViewAll = permissions.includes("reports.view_all")

  if (!canView) {
    return (
      <div>
        <PageHeader icon={BarChart3} title="Reportes" description="Informes y estadísticas institucionales" />
        <Card className="glass border-primary/10">
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Sin permisos para ver reportes.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const today = new Date()
  const quarter = `T${Math.ceil((today.getMonth() + 1) / 3)} ${today.getFullYear()}`
  const totalHoras = MOCK_HORAS_TRIMESTRE.reduce((s, e) => s + e.horas, 0)
  const incidenciasTotal = MOCK_INCIDENCIAS.reduce((s, e) => s + e.qty, 0)
  const maxIncidencias = Math.max(...MOCK_INCIDENCIAS.map((e) => e.qty))

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Reportes"
        description={`Informes institucionales — ${quarter}`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Efectivos activos</span>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{MOCK_KPI.efectivosActivos}</div>
            <p className="text-xs text-muted-foreground">Este trimestre</p>
          </CardContent>
        </Card>
        <Card className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Horas promedio</span>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {MOCK_KPI.horasPromedio}h
              <TrendIcon trend={MOCK_KPI.tendenciaHoras} />
            </div>
            <p className="text-xs text-muted-foreground">Por efectivo / trimestre</p>
          </CardContent>
        </Card>
        <Card className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Cumplimiento NDR</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{MOCK_KPI.cumplimientoNDR}%</div>
            <Progress value={MOCK_KPI.cumplimientoNDR} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Incidencias mes</span>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{MOCK_KPI.incidenciasEsteMes}</div>
            <p className="text-xs text-muted-foreground">Atendidas este mes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Horas de servicio por efectivo */}
        <Card className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Horas de Servicio — {quarter}
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_HORAS_TRIMESTRE.map((e) => {
              const pct = Math.min((e.horas / e.required) * 100, 100)
              const cumple = e.horas >= e.required
              return (
                <div key={e.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{e.name}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {GRADE_LABELS[e.grade] ?? e.grade}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={cumple ? "text-green-600 dark:text-green-400 font-semibold" : "text-destructive font-semibold"}>
                        {e.horas}h
                      </span>
                      <span className="text-muted-foreground text-xs">/ {e.required}h</span>
                    </div>
                  </div>
                  <Progress
                    value={pct}
                    className={`h-1.5 ${cumple ? "[&>div]:bg-green-500" : "[&>div]:bg-destructive"}`}
                  />
                </div>
              )
            })}
            <div className="pt-2 border-t border-border text-xs text-muted-foreground flex justify-between">
              <span>Total: {totalHoras}h entre {MOCK_HORAS_TRIMESTRE.length} efectivos</span>
              <span>Promedio: {Math.round(totalHoras / MOCK_HORAS_TRIMESTRE.length)}h</span>
            </div>
          </CardContent>
        </Card>

        {/* Incidencias por tipo */}
        <Card className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Incidencias por Tipo
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_INCIDENCIAS.map((e) => (
              <div key={e.tipo}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="truncate">{e.tipo}</span>
                  <span className="font-semibold shrink-0 ml-2">{e.qty}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${e.color}`}
                    style={{ width: `${(e.qty / maxIncidencias) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-border text-xs text-muted-foreground">
              Total: {incidenciasTotal} incidencias atendidas este trimestre
            </div>
          </CardContent>
        </Card>

        {/* Progreso ESBAS */}
        <Card className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Progreso ESBAS — Aspirantes
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_ESBAS.map((e) => {
              const pct = Math.round((e.completadas / e.total) * 100)
              return (
                <div key={e.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{e.name}</span>
                    <span className="text-muted-foreground text-xs">{e.completadas}/{e.total} lecciones</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium w-8 text-right">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Guardias nocturnas */}
        <Card className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Moon className="h-4 w-4 text-primary" />
              Guardias Nocturnas — {quarter}
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">14</p>
                <p className="text-xs text-muted-foreground">Guardias realizadas</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">168h</p>
                <p className="text-xs text-muted-foreground">Total horas guardia</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">96%</p>
                <p className="text-xs text-muted-foreground">Cobertura</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Camas disponibles: {12} · Promedio ocupación: 8.3/noche</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nota BD */}
      <p className="text-xs text-muted-foreground text-center pt-2">
        Datos de ejemplo. En producción se conectan al módulo de base de datos PostgreSQL.
      </p>
    </div>
  )
}
