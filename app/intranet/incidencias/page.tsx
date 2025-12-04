"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { IntranetNav } from "@/components/intranet-nav"
import { ProtectRoute } from "@/components/protect-route"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
} from "lucide-react"
import { User, getUserPermissions } from "@/lib/auth"
import Link from "next/link"

interface Incidencia {
  id: number
  titulo: string
  descripcion: string
  estado: 'pendiente' | 'en_proceso' | 'resuelta' | 'rechazada'
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  reportadoPor: string
  area: string
  fecha: string
}

// Datos de ejemplo
const INCIDENCIAS_EJEMPLO: Incidencia[] = [
  {
    id: 1,
    titulo: "Falta de equipos de protección",
    descripcion: "Necesitamos reposición de cascos y guantes",
    estado: "pendiente",
    prioridad: "alta",
    reportadoPor: "Carlos Ramírez",
    area: "operaciones",
    fecha: "2024-12-04"
  },
  {
    id: 2,
    titulo: "Mantenimiento de vehículo",
    descripcion: "El camión de bomberos requiere revisión de frenos",
    estado: "en_proceso",
    prioridad: "urgente",
    reportadoPor: "Pedro Castro",
    area: "servicios",
    fecha: "2024-12-03"
  },
  {
    id: 3,
    titulo: "Actualización de botiquín",
    descripcion: "Medicamentos vencidos en el botiquín de emergencia",
    estado: "resuelta",
    prioridad: "media",
    reportadoPor: "María González",
    area: "sanidad",
    fecha: "2024-12-02"
  }
]

export default function IncidenciasPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [incidencias, setIncidencias] = useState<Incidencia[]>(INCIDENCIAS_EJEMPLO)
  const [filtro, setFiltro] = useState<string>("")
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

  const getEstadoBadge = (estado: string) => {
    const badges = {
      pendiente: { color: "bg-amber-500/20 text-amber-700 border-amber-500/30", icon: Clock },
      en_proceso: { color: "bg-blue-500/20 text-blue-700 border-blue-500/30", icon: AlertTriangle },
      resuelta: { color: "bg-green-500/20 text-green-700 border-green-500/30", icon: CheckCircle2 },
      rechazada: { color: "bg-red-500/20 text-red-700 border-red-500/30", icon: XCircle },
    }
    return badges[estado as keyof typeof badges] || badges.pendiente
  }

  const getPrioridadBadge = (prioridad: string) => {
    const colors = {
      baja: "bg-gray-500/20 text-gray-700 border-gray-500/30",
      media: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
      alta: "bg-orange-500/20 text-orange-700 border-orange-500/30",
      urgente: "bg-red-500/20 text-red-700 border-red-500/30",
    }
    return colors[prioridad as keyof typeof colors] || colors.media
  }

  const incidenciasFiltradas = incidencias.filter(inc =>
    inc.titulo.toLowerCase().includes(filtro.toLowerCase()) ||
    inc.descripcion.toLowerCase().includes(filtro.toLowerCase())
  )

  return (
    <ProtectRoute requiredModule="incidencias">
      <div className="flex min-h-screen bg-gradient-to-b from-background to-muted/20">
        <IntranetNav />

        <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-8 w-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-bold">Incidencias</h1>
              </div>
              <p className="text-muted-foreground">
                Gestiona y da seguimiento a las incidencias reportadas
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="glass border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{incidencias.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Incidencias registradas</p>
                </CardContent>
              </Card>

              <Card className="glass border-amber-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {incidencias.filter(i => i.estado === 'pendiente').length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Por atender</p>
                </CardContent>
              </Card>

              <Card className="glass border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {incidencias.filter(i => i.estado === 'en_proceso').length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">En atención</p>
                </CardContent>
              </Card>

              <Card className="glass border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Resueltas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {incidencias.filter(i => i.estado === 'resuelta').length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Completadas</p>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar incidencias..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="pl-10"
                />
              </div>
              {permissions.canCreateIncident && (
                <Button className="bg-gradient-to-r from-primary to-red-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Incidencia
                </Button>
              )}
            </div>

            {/* Lista de Incidencias */}
            <div className="space-y-4">
              {incidenciasFiltradas.map((incidencia) => {
                const estadoBadge = getEstadoBadge(incidencia.estado)
                const EstadoIcon = estadoBadge.icon

                return (
                  <Card key={incidencia.id} className="glass border-primary/10 hover:border-primary/30 transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">{incidencia.titulo}</CardTitle>
                            <Badge className={getPrioridadBadge(incidencia.prioridad)}>
                              {incidencia.prioridad.toUpperCase()}
                            </Badge>
                          </div>
                          <CardDescription>{incidencia.descripcion}</CardDescription>
                        </div>
                        <Badge className={estadoBadge.color}>
                          <EstadoIcon className="h-3 w-3 mr-1" />
                          {incidencia.estado.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          <span>Área: {incidencia.area}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Reportado por: {incidencia.reportadoPor}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(incidencia.fecha).toLocaleDateString('es-ES')}</span>
                        </div>
                      </div>
                      {permissions.canManageIncidents && (
                        <div className="mt-4 flex gap-2">
                          <Button variant="outline" size="sm">Ver Detalles</Button>
                          {incidencia.estado !== 'resuelta' && (
                            <Button variant="outline" size="sm">Actualizar Estado</Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}

              {incidenciasFiltradas.length === 0 && (
                <Card className="glass border-primary/10">
                  <CardContent className="p-12 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No se encontraron incidencias</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectRoute>
  )
}
