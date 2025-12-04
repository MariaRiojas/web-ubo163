"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { IntranetNav } from "@/components/intranet-nav"
import { ProtectRoute } from "@/components/protect-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Users,
  Search,
  Filter,
  UserCircle,
  Shield,
  Mail,
  Phone,
} from "lucide-react"
import { User, getUserPermissions } from "@/lib/auth"

// Datos de ejemplo del equipo
const EQUIPO_EJEMPLO = [
  {
    nombre: "Comandante General Torres",
    rol: "comandante",
    area: "comandancia",
    email: "comandante@bomberos163.cl",
    telefono: "+56 9 1234 5678",
    genero: "masculino"
  },
  {
    nombre: "Jefe Administración Pérez",
    rol: "jefe_area",
    area: "administracion",
    email: "admin@bomberos163.cl",
    telefono: "+56 9 2345 6789",
    genero: "masculino"
  },
  {
    nombre: "Jefa Servicios Generales García",
    rol: "jefe_area",
    area: "servicios",
    email: "servicios@bomberos163.cl",
    telefono: "+56 9 3456 7890",
    genero: "femenino"
  },
  {
    nombre: "Jefe Operaciones Martínez",
    rol: "jefe_area",
    area: "operaciones",
    email: "operaciones@bomberos163.cl",
    telefono: "+56 9 4567 8901",
    genero: "masculino"
  },
  {
    nombre: "Jefa Sanidad López",
    rol: "jefe_area",
    area: "sanidad",
    email: "sanidad@bomberos163.cl",
    telefono: "+56 9 5678 9012",
    genero: "femenino"
  },
  {
    nombre: "Jefe Imagen Rojas",
    rol: "jefe_area",
    area: "imagen",
    email: "imagen@bomberos163.cl",
    telefono: "+56 9 6789 0123",
    genero: "masculino"
  },
  {
    nombre: "Jefe de Guardia Sánchez",
    rol: "jefe_guardia",
    area: "jefatura",
    email: "guardia@bomberos163.cl",
    telefono: "+56 9 7890 1234",
    genero: "masculino"
  },
]

export default function EquipoPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [filtro, setFiltro] = useState("")
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

  // Filtrar equipo según permisos
  const equipoFiltrado = EQUIPO_EJEMPLO.filter(miembro => {
    const coincideBusqueda = miembro.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
                             miembro.area.toLowerCase().includes(filtro.toLowerCase())

    if (permissions.canManageAllAreas) {
      return coincideBusqueda
    } else if (user.role === 'jefe_area') {
      return coincideBusqueda && miembro.area === user.area
    }
    return false
  })

  const getRolBadge = (rol: string) => {
    const badges = {
      comandante: "bg-red-500/20 text-red-700 border-red-500/30",
      jefe_area: "bg-blue-500/20 text-blue-700 border-blue-500/30",
      jefe_guardia: "bg-amber-500/20 text-amber-700 border-amber-500/30",
      efectivo: "bg-green-500/20 text-green-700 border-green-500/30",
    }
    return badges[rol as keyof typeof badges] || badges.efectivo
  }

  const getRolNombre = (rol: string) => {
    const nombres = {
      comandante: "Comandante",
      jefe_area: "Jefe de Área",
      jefe_guardia: "Jefe de Guardia",
      efectivo: "Efectivo",
    }
    return nombres[rol as keyof typeof nombres] || "Efectivo"
  }

  return (
    <ProtectRoute requiredModule="equipo">
      <div className="flex min-h-screen bg-gradient-to-b from-background to-muted/20">
        <IntranetNav />

        <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-8 w-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-bold">Equipo</h1>
              </div>
              <p className="text-muted-foreground">
                {permissions.canManageAllAreas
                  ? "Personal de todas las áreas"
                  : `Personal del área de ${user.area}`
                }
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="glass border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Personal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{equipoFiltrado.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Miembros activos</p>
                </CardContent>
              </Card>

              <Card className="glass border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Jefes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {equipoFiltrado.filter(m => m.rol.includes('jefe')).length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">En funciones</p>
                </CardContent>
              </Card>

              <Card className="glass border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Efectivos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {equipoFiltrado.filter(m => m.rol === 'efectivo').length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">En servicio</p>
                </CardContent>
              </Card>

              <Card className="glass border-amber-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Áreas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {permissions.canManageAllAreas ? "7" : "1"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Activas</p>
                </CardContent>
              </Card>
            </div>

            {/* Búsqueda */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o área..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Lista de Equipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipoFiltrado.map((miembro, index) => (
                <Card key={index} className="glass border-primary/10 hover:border-primary/30 transition-all">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserCircle className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{miembro.nombre}</CardTitle>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge className={getRolBadge(miembro.rol)}>
                            {getRolNombre(miembro.rol)}
                          </Badge>
                          <Badge className="bg-primary/20 text-primary border-primary/30 capitalize">
                            {miembro.area}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{miembro.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{miembro.telefono}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {equipoFiltrado.length === 0 && (
                <div className="col-span-full">
                  <Card className="glass border-primary/10">
                    <CardContent className="p-12 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No se encontraron miembros del equipo</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectRoute>
  )
}
