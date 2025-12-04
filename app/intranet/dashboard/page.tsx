"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { IntranetNav } from "@/components/intranet-nav"
import { ProtectRoute } from "@/components/protect-route"
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
  Calendar,
  FileText,
  Award,
  Bell,
} from "lucide-react"
import { User } from "@/lib/auth"
import Link from "next/link"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const currentUser = localStorage.getItem("currentUser")
    if (!currentUser) {
      router.push("/intranet")
      return
    }
    setUser(JSON.parse(currentUser))
  }, [router])

  if (!isClient || !user) return null

  return (
    <ProtectRoute allowedRoles={["comandante", "jefe_area", "jefe_guardia", "efectivo"]}>
      <div className="flex min-h-screen bg-gradient-to-b from-background to-muted/20">
        <IntranetNav />

        <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-8 w-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-bold">Dashboard</h1>
              </div>
              <p className="text-muted-foreground">
                Bienvenido, <span className="font-semibold text-foreground">{user.name}</span>
              </p>
              <Badge className="mt-2 bg-primary/20 text-primary border-primary/30">
                {user.role === "comandante"
                  ? "Comandante General"
                  : user.role === "jefe_area"
                  ? `Jefe de ${user.area.charAt(0).toUpperCase() + user.area.slice(1)}`
                  : user.role === "jefe_guardia"
                  ? "Jefe de Guardia"
                  : "Efectivo"}
              </Badge>
            </div>

            {/* Conditional Dashboard Based on Role */}
            {user.role === "efectivo" && <EfectivoDashboard user={user} />}
            {user.role === "jefe_guardia" && <JefeGuardiaDashboard user={user} />}
            {user.role === "jefe_area" && <JefeAreaDashboard user={user} />}
            {user.role === "comandante" && <ComandanteDashboard user={user} />}
          </div>
        </main>
      </div>
    </ProtectRoute>
  )
}

// Dashboard for Efectivo
function EfectivoDashboard({ user }: { user: User }) {
  const horasTrabajadas = 152
  const horasMes = 40
  const proximaGuardia = "15 Dic 2024 - 19:00h"
  const leccionesCompletadas = 12
  const totalLecciones = 30
  const incidenciasAbiertas = 2

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Horas del Mes</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{horasMes}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total acumulado: {horasTrabajadas}h
            </p>
          </CardContent>
        </Card>

        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Próxima Guardia</CardTitle>
            <Moon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{proximaGuardia}</div>
            <p className="text-xs text-muted-foreground mt-1">Turno nocturno</p>
          </CardContent>
        </Card>

        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ESBAS</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leccionesCompletadas}/{totalLecciones}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((leccionesCompletadas / totalLecciones) * 100)}% completado
            </p>
          </CardContent>
        </Card>

        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Incidencias</CardTitle>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidenciasAbiertas}</div>
            <p className="text-xs text-muted-foreground mt-1">Solicitudes abiertas</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/intranet/guardias">
          <Card className="bento-item glass border-primary/10 hover:border-primary/30 cursor-pointer h-full">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-red-800 rounded-xl flex items-center justify-center mb-3">
                <Moon className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Guardia Nocturna</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Ver horarios de guardia y solicitar cambios
              </p>
              <Button className="w-full bg-gradient-to-r from-primary to-red-800 hover:from-red-700 hover:to-red-900 text-white">
                Ver Guardias
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/intranet/incidencias">
          <Card className="bento-item glass border-primary/10 hover:border-primary/30 cursor-pointer h-full">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-700 rounded-xl flex items-center justify-center mb-3">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Incidencias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Reportar incidencias y hacer solicitudes
              </p>
              <Button className="w-full bg-gradient-to-r from-amber-500 to-red-700 hover:from-amber-600 hover:to-red-800 text-white">
                Ir a Incidencias
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/intranet/esbas">
          <Card className="bento-item glass border-primary/10 hover:border-primary/30 cursor-pointer h-full">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-900 rounded-xl flex items-center justify-center mb-3">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <CardTitle>ESBAS</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Continuar con tu capacitación (Lección {leccionesCompletadas + 1})
              </p>
              <Button className="w-full bg-gradient-to-r from-red-600 to-red-900 hover:from-red-700 hover:to-red-950 text-white">
                Continuar Curso
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card className="glass border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 pb-3 border-b border-primary/10">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Guardia nocturna completada</p>
                <p className="text-xs text-muted-foreground">Hace 2 días</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-3 border-b border-primary/10">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Lección 12 de ESBAS completada</p>
                <p className="text-xs text-muted-foreground">Hace 3 días</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Solicitud de permiso aprobada</p>
                <p className="text-xs text-muted-foreground">Hace 5 días</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Dashboard for Jefe de Guardia
function JefeGuardiaDashboard({ user }: { user: User }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Guardias Activas</CardTitle>
            <Moon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground mt-1">Efectivos en guardia</p>
          </CardContent>
        </Card>

        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cambios Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground mt-1">Por aprobar</p>
          </CardContent>
        </Card>

        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Próximo Turno</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">Hoy 19:00h</div>
            <p className="text-xs text-muted-foreground mt-1">Turno nocturno</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link href="/intranet/guardias">
          <Card className="bento-item glass border-primary/10 hover:border-primary/30 cursor-pointer h-full">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-red-800 rounded-xl flex items-center justify-center mb-3">
                <Moon className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Gestión de Guardias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Administrar horarios y turnos de guardia nocturna
              </p>
              <Button className="w-full bg-gradient-to-r from-primary to-red-800 hover:from-red-700 hover:to-red-900 text-white">
                Gestionar Guardias
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Card className="glass border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-sm font-medium">3 solicitudes de cambio pendientes</p>
                <p className="text-xs text-muted-foreground mt-1">Requieren tu aprobación</p>
              </div>
              <div className="p-3 bg-amber-500/5 rounded-lg">
                <p className="text-sm font-medium">Guardia próxima en 2 horas</p>
                <p className="text-xs text-muted-foreground mt-1">Turno del 14 Dic 2024</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Dashboard for Jefe de Área
function JefeAreaDashboard({ user }: { user: User }) {
  const areaName = user.area.charAt(0).toUpperCase() + user.area.slice(1)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Personal en Área</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">Efectivos activos</p>
          </CardContent>
        </Card>

        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Incidencias</CardTitle>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground mt-1">Pendientes</p>
          </CardContent>
        </Card>

        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground mt-1">Este mes</p>
          </CardContent>
        </Card>

        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reportes</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground mt-1">Este mes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link href={`/intranet/areas/${user.area}`}>
          <Card className="bento-item glass border-primary/10 hover:border-primary/30 cursor-pointer h-full">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-red-800 rounded-xl flex items-center justify-center mb-3">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Gestión de {areaName}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Administrar personal y recursos del área
              </p>
              <Button className="w-full bg-gradient-to-r from-primary to-red-800 hover:from-red-700 hover:to-red-900 text-white">
                Ir a {areaName}
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/intranet/incidencias">
          <Card className="bento-item glass border-primary/10 hover:border-primary/30 cursor-pointer h-full">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-700 rounded-xl flex items-center justify-center mb-3">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Incidencias del Área</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Revisar y gestionar incidencias del área
              </p>
              <Button className="w-full bg-gradient-to-r from-amber-500 to-red-700 hover:from-amber-600 hover:to-red-800 text-white">
                Ver Incidencias
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="glass border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Personal de {areaName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Personal Activo</p>
                  <p className="text-xs text-muted-foreground">En servicio hoy</p>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-700 border-green-500/30">10/12</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-500/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Permisos Pendientes</p>
                  <p className="text-xs text-muted-foreground">Requieren aprobación</p>
                </div>
              </div>
              <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">2</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Dashboard for Comandante
function ComandanteDashboard({ user }: { user: User }) {
  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Efectivos</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">50</div>
            <p className="text-xs text-muted-foreground mt-1">48 activos, 2 permisos</p>
          </CardContent>
        </Card>

        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Guardias Activas</CardTitle>
            <Moon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground mt-1">4M / 4F en turno</p>
          </CardContent>
        </Card>

        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Incidencias</CardTitle>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">5 urgentes</p>
          </CardContent>
        </Card>

        <Card className="bento-item glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia General</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">96%</div>
            <p className="text-xs text-muted-foreground mt-1">+3% vs mes anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Areas Overview */}
      <Card className="glass border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Estado por Área
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-primary/5 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Operaciones
              </h4>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Personal: 12</p>
                <p className="text-muted-foreground">Incidencias: 3</p>
                <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-xs">
                  Óptimo
                </Badge>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Sanidad
              </h4>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Personal: 10</p>
                <p className="text-muted-foreground">Incidencias: 2</p>
                <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-xs">
                  Óptimo
                </Badge>
              </div>
            </div>

            <div className="p-4 bg-amber-500/5 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                Servicios
              </h4>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Personal: 8</p>
                <p className="text-muted-foreground">Incidencias: 5</p>
                <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 text-xs">
                  Atención
                </Badge>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Administración
              </h4>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Personal: 6</p>
                <p className="text-muted-foreground">Incidencias: 2</p>
                <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-xs">
                  Óptimo
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/intranet/equipo">
          <Card className="bento-item glass border-primary/10 hover:border-primary/30 cursor-pointer h-full">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-red-800 rounded-xl flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Gestión de Equipo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Ver y administrar todo el personal
              </p>
              <Button className="w-full bg-gradient-to-r from-primary to-red-800 hover:from-red-700 hover:to-red-900 text-white">
                Ver Equipo
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/intranet/reportes">
          <Card className="bento-item glass border-primary/10 hover:border-primary/30 cursor-pointer h-full">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-700 rounded-xl flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Reportes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Informes y estadísticas generales
              </p>
              <Button className="w-full bg-gradient-to-r from-amber-500 to-red-700 hover:from-amber-600 hover:to-red-800 text-white">
                Ver Reportes
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/intranet/configuracion">
          <Card className="bento-item glass border-primary/10 hover:border-primary/30 cursor-pointer h-full">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-900 rounded-xl flex items-center justify-center mb-3">
                <Award className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Configuración</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Ajustes y configuración del sistema
              </p>
              <Button className="w-full bg-gradient-to-r from-red-600 to-red-900 hover:from-red-700 hover:to-red-950 text-white">
                Configurar
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card className="glass border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Actividad Reciente del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 pb-3 border-b border-primary/10">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Nueva incidencia reportada en Servicios</p>
                <p className="text-xs text-muted-foreground">Hace 15 minutos</p>
              </div>
              <Badge variant="outline" className="text-xs">Urgente</Badge>
            </div>
            <div className="flex items-start gap-3 pb-3 border-b border-primary/10">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Guardia nocturna iniciada - 8 efectivos</p>
                <p className="text-xs text-muted-foreground">Hace 1 hora</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Solicitud de permiso aprobada - Efectivo Ramírez</p>
                <p className="text-xs text-muted-foreground">Hace 2 horas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
