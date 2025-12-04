"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { IntranetNav } from "@/components/intranet-nav"
import { ProtectRoute } from "@/components/protect-route"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  Users,
  FileText,
  TrendingUp,
  Calendar,
  Activity,
  Settings,
  Plus,
} from "lucide-react"
import { User, getUserPermissions } from "@/lib/auth"

export default function AdministracionPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser")
    if (!currentUser) {
      router.push("/intranet")
      return
    }
    setUser(JSON.parse(currentUser))
  }, [router])

  if (!user) return null

  const permissions = getUserPermissions(user)

  return (
    <ProtectRoute requiredModule="areas" requireArea="administracion">
      <div className="flex min-h-screen bg-gradient-to-b from-background to-muted/20">
        <IntranetNav />

        <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-bold">Área de Administración</h1>
              </div>
              <p className="text-muted-foreground">
                Gestión administrativa y recursos del área
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="glass border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Personal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">6</div>
                  <p className="text-xs text-muted-foreground mt-1">Miembros activos</p>
                </CardContent>
              </Card>

              <Card className="glass border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Documentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">124</div>
                  <p className="text-xs text-muted-foreground mt-1">En archivo</p>
                </CardContent>
              </Card>

              <Card className="glass border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Presupuesto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">85%</div>
                  <p className="text-xs text-muted-foreground mt-1">Ejecutado</p>
                </CardContent>
              </Card>

              <Card className="glass border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tareas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground mt-1">Pendientes</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass border-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Personal del Área
                    </CardTitle>
                    {permissions.canManageAllAreas && (
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Jefe Administración Pérez</p>
                          <p className="text-xs text-muted-foreground">Jefe de Área</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Activo</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Laura Vega</p>
                          <p className="text-xs text-muted-foreground">Efectivo</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Activo</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                        <p className="text-sm font-medium">Documento procesado</p>
                        <p className="text-xs text-muted-foreground">Hace 2 horas</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pb-3 border-b border-primary/10">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Presupuesto actualizado</p>
                        <p className="text-xs text-muted-foreground">Hace 5 horas</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Nueva tarea asignada</p>
                        <p className="text-xs text-muted-foreground">Hace 1 día</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </ProtectRoute>
  )
}
