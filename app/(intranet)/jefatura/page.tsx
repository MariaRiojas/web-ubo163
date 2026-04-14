import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Shield,
  FileText,
  Calendar,
  MessageSquare,
  Award,
  ChevronRight,
  Star,
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  Megaphone,
} from "lucide-react"
import Link from "next/link"
import type { Permission } from "@/lib/auth/permissions"
import { companyConfig } from "@/company.config"

const MANDO = [
  { name: "Brigadier Sánchez Torres",    cargo: "Primer Jefe",      grade: "brigadier",       initials: "ST" },
  { name: "Teniente Brigadier García V.", cargo: "Segundo Jefe",     grade: "teniente_brigadier", initials: "GV" },
  { name: "Capitán Herrera Vargas",       cargo: "Jefe de Guardia",  grade: "capitan",         initials: "HV" },
  { name: "Capitán Flores Medina",        cargo: "Jefe de Sección",  grade: "capitan",         initials: "FM" },
]

const METRICAS = [
  { label: "Tiempo de respuesta",   value: 85, color: "[&>div]:bg-green-500" },
  { label: "Cumplimiento ESBAS",    value: 72, color: "[&>div]:bg-blue-500" },
  { label: "Operatividad de flota", value: 78, color: "[&>div]:bg-amber-500" },
  { label: "Cobertura de guardias", value: 96, color: "[&>div]:bg-primary" },
]

const RECONOCIMIENTOS = [
  { title: "Excelencia Operativa",    year: "2023", emisor: "Comandancia CGBVP" },
  { title: "Servicio Comunitario",    year: "2022", emisor: "Gobierno Municipal de Ancón" },
  { title: "Innovación en Rescate",   year: "2021", emisor: "Asociación Internacional" },
]

const COMUNICADOS = [
  { title: "Actualización de Protocolos de Emergencia", fecha: "15 Abr 2026", autor: "Brig. Sánchez Torres",    prioridad: "alta" },
  { title: "Calendario de Capacitaciones T2",           fecha: "10 Abr 2026", autor: "Cap. Herrera Vargas",     prioridad: "media" },
  { title: "Reconocimiento al Personal Destacado",      fecha: "05 Abr 2026", autor: "Ten. Brig. García V.",    prioridad: "normal" },
  { title: "Adquisición de Nuevos EPP",                 fecha: "01 Abr 2026", autor: "Brig. Sánchez Torres",    prioridad: "alta" },
]

const PRIORIDAD_STYLE: Record<string, string> = {
  alta:   "bg-destructive/10 text-destructive border-destructive/20",
  media:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

const GRADE_LABEL: Record<string, string> = {
  brigadier:          "Brigadier",
  teniente_brigadier: "Ten. Brigadier",
  capitan:            "Capitán",
}

export default async function JefaturaPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canManage = permissions.includes("company.manage") || permissions.includes("company.view_all")

  if (!canManage) redirect("/dashboard")

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title="Jefatura"
        description={`${companyConfig.shortName} — Gestión de mando y dirección institucional`}
      />

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users,        label: "Efectivos activos",   value: "24",  sub: "Este mes" },
          { icon: Clock,        label: "Horas promedio",      value: "70h", sub: "Por efectivo / T2" },
          { icon: AlertTriangle,label: "Incidencias abiertas",value: "3",   sub: "Pendientes" },
          { icon: TrendingUp,   label: "Cumplimiento NDR",    value: "57%", sub: "Trimestre actual" },
        ].map(({ icon: Icon, label, value, sub }) => (
          <Card key={label} className="glass border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="directiva">
        <TabsList className="w-full justify-start flex-wrap h-auto">
          <TabsTrigger value="directiva" className="gap-2">
            <Shield className="h-4 w-4" />
            Directiva
          </TabsTrigger>
          <TabsTrigger value="comunicados" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Comunicados
          </TabsTrigger>
          <TabsTrigger value="metricas" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Métricas
          </TabsTrigger>
        </TabsList>

        {/* ── Directiva ── */}
        <TabsContent value="directiva" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="glass border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base">Estructura de Mando</CardTitle>
                  <CardDescription>Organigrama y jerarquía institucional</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {MANDO.map((oficial) => (
                      <Card key={oficial.name} className="glass border-primary/10 hover:border-primary/30 transition-colors">
                        <CardContent className="pt-4 flex items-center gap-4">
                          <Avatar className="h-12 w-12 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {oficial.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{oficial.name}</p>
                            <p className="text-xs text-muted-foreground">{oficial.cargo}</p>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {GRADE_LABEL[oficial.grade] ?? oficial.grade}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="glass border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base">Reconocimientos</CardTitle>
                  <CardDescription>Distinciones institucionales</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {RECONOCIMIENTOS.map((r) => (
                    <div key={r.title} className="flex items-start gap-3">
                      <Award className="h-8 w-8 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.year} · {r.emisor}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="glass border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base">Accesos Rápidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "Ver Personal", href: "/personal", icon: Users },
                    { label: "Ver Reportes", href: "/reportes", icon: FileText },
                    { label: "Ver Secciones", href: "/secciones", icon: Shield },
                    { label: "Comunicados", href: "/comunicados", icon: Megaphone },
                  ].map(({ label, href, icon: Icon }) => (
                    <Button key={href} asChild variant="ghost" className="w-full justify-between h-9">
                      <Link href={href}>
                        <span className="flex items-center gap-2 text-sm">
                          <Icon className="h-4 w-4" />
                          {label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Comunicados ── */}
        <TabsContent value="comunicados" className="mt-6">
          <Card className="glass border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Comunicados Oficiales</CardTitle>
                <CardDescription>Comunicaciones emitidas por la jefatura</CardDescription>
              </div>
              <Button asChild size="sm" className="bg-primary text-white gap-2">
                <Link href="/comunicados">
                  <Megaphone className="h-4 w-4" />
                  Ver todos
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {COMUNICADOS.map((c, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-lg ${PRIORIDAD_STYLE[c.prioridad].split(" ").slice(0, 1).join(" ")}`}>
                    <MessageSquare className={`h-4 w-4 ${PRIORIDAD_STYLE[c.prioridad].split(" ")[1]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">Por: {c.autor}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge className={`text-xs ${PRIORIDAD_STYLE[c.prioridad]}`}>
                        {c.prioridad.charAt(0).toUpperCase() + c.prioridad.slice(1)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{c.fecha}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Métricas ── */}
        <TabsContent value="metricas" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass border-primary/10">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  Indicadores de Gestión
                </CardTitle>
                <CardDescription>Métricas de desempeño institucional este trimestre</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {METRICAS.map((m) => (
                  <div key={m.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm">{m.label}</span>
                      <span className="text-sm font-bold">{m.value}%</span>
                    </div>
                    <Progress value={m.value} className={`h-2 ${m.color}`} />
                  </div>
                ))}
                <Button asChild variant="outline" className="w-full mt-2">
                  <Link href="/reportes">Ver reportes completos</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="glass border-primary/10">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Próximas Actividades
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { fecha: "22 Abr", evento: "Reunión mensual de compañía", tipo: "institucional" },
                  { fecha: "26 Abr", evento: "Mantenimiento de unidades",    tipo: "mantenimiento" },
                  { fecha: "15 May", evento: "Aniversario de la compañía",   tipo: "institucional" },
                  { fecha: "14 Jun", evento: "Simulacro intercompañías",     tipo: "operativo" },
                ].map((a, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 text-center leading-tight">
                      {a.fecha}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.evento}</p>
                      <Badge variant="secondary" className="text-xs">{a.tipo}</Badge>
                    </div>
                  </div>
                ))}
                <Button asChild variant="outline" className="w-full mt-2">
                  <Link href="/cronograma">Ver cronograma completo</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
