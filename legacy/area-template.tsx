"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { IntranetNav } from "@/components/intranet-nav"
import { ProtectRoute } from "@/components/protect-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  Activity,
  Plus,
  type LucideIcon,
} from "lucide-react"
import { User, getUserPermissions, Area } from "@/lib/auth"

interface AreaTemplateProps {
  areaName: string
  areaKey: Area
  icon: LucideIcon
  description: string
  stats: {
    personal: number
    documentos?: number
    presupuesto?: number
    tareas: number
  }
}

export function AreaTemplate({ areaName, areaKey, icon: Icon, description, stats }: AreaTemplateProps) {
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

  return (
    <ProtectRoute requiredModule="areas" requireArea={areaKey}>
      <div className="flex min-h-screen bg-gradient-to-b from-background to-muted/20">
        <IntranetNav />

        <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Icon className="h-8 w-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-bold">{areaName}</h1>
              </div>
              <p className="text-muted-foreground">{description}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="glass border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Personal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.personal}</div>
                  <p className="text-xs text-muted-foreground mt-1">Miembros activos</p>
                </CardContent>
              </Card>

              {stats.documentos !== undefined && (
                <Card className="glass border-primary/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Documentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.documentos}</div>
                    <p className="text-xs text-muted-foreground mt-1">En archivo</p>
                  </CardContent>
                </Card>
              )}

              {stats.presupuesto !== undefined && (
                <Card className="glass border-primary/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Presupuesto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.presupuesto}%</div>
                    <p className="text-xs text-muted-foreground mt-1">Ejecutado</p>
                  </CardContent>
                </Card>
              )}

              <Card className="glass border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tareas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.tareas}</div>
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
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Personal del área {areaName}</p>
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
                        <p className="text-sm font-medium">Última actualización</p>
                        <p className="text-xs text-muted-foreground">Hace 2 horas</p>
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
