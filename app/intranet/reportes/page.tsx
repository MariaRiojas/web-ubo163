"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { IntranetNav } from "@/components/intranet-nav"
import { ProtectRoute } from "@/components/protect-route"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Download,
  TrendingUp,
  Users,
  Activity,
  Calendar,
  BarChart3,
  PieChart,
} from "lucide-react"
import { User, getUserPermissions } from "@/lib/auth"

export default function ReportesPage() {
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

  const permissions = getUserPermissions(user)
  const areaName = user.role === 'jefe_area' ? user.area : 'General'

  return (
    <ProtectRoute requiredModule="reportes">
      <div className="flex min-h-screen bg-gradient-to-b from-background to-muted/20">
        <IntranetNav />

        <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="h-8 w-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-bold">Reportes</h1>
              </div>
              <p className="text-muted-foreground">
                {permissions.canManageAllAreas
                  ? "Informes y estadísticas generales de todas las áreas"
                  : `Informes y estadísticas del área de ${areaName}`
                }
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="glass border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Reportes Generados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground mt-1">Este mes</p>
                </CardContent>
              </Card>

              <Card className="glass border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">94%</div>
                  <p className="text-xs text-muted-foreground mt-1">Promedio mensual</p>
                </CardContent>
              </Card>

              <Card className="glass border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Personal Activo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {permissions.canManageAllAreas ? "50" : "12"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">En servicio</p>
                </CardContent>
              </Card>

              <Card className="glass border-amber-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">8</div>
                  <p className="text-xs text-muted-foreground mt-1">Por revisar</p>
                </CardContent>
              </Card>
            </div>

            {/* Reportes Disponibles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <Card className="glass border-primary/10 hover:border-primary/30 transition-all cursor-pointer">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-red-800 rounded-xl flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle>Reporte de Personal</CardTitle>
                  <CardDescription>
                    Estadísticas y asistencia del personal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-gradient-to-r from-primary to-red-800">
                    <Download className="h-4 w-4 mr-2" />
                    Generar Reporte
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass border-primary/10 hover:border-primary/30 transition-all cursor-pointer">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-700 rounded-xl flex items-center justify-center mb-3">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle>Reporte de Actividades</CardTitle>
                  <CardDescription>
                    Resumen de actividades mensuales
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-red-700">
                    <Download className="h-4 w-4 mr-2" />
                    Generar Reporte
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass border-primary/10 hover:border-primary/30 transition-all cursor-pointer">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-900 rounded-xl flex items-center justify-center mb-3">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle>Reporte de Eficiencia</CardTitle>
                  <CardDescription>
                    Métricas de rendimiento del área
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-gradient-to-r from-red-600 to-red-900">
                    <Download className="h-4 w-4 mr-2" />
                    Generar Reporte
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Últimos Reportes */}
            <Card className="glass border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Últimos Reportes Generados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { titulo: "Reporte Mensual de Personal", fecha: "04/12/2024", tipo: "Personal" },
                    { titulo: "Estadísticas de Eficiencia", fecha: "03/12/2024", tipo: "Eficiencia" },
                    { titulo: "Resumen de Actividades", fecha: "01/12/2024", tipo: "Actividades" },
                  ].map((reporte, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{reporte.titulo}</p>
                          <p className="text-xs text-muted-foreground">{reporte.fecha}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          {reporte.tipo}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectRoute>
  )
}
