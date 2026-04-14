"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { IntranetNav } from "@/components/intranet-nav"
import { ProtectRoute } from "@/components/protect-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  UserCircle,
  Shield,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Edit,
  Save,
  X,
  Award,
  Clock,
} from "lucide-react"
import { User } from "@/lib/auth"

export default function PerfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
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
    <ProtectRoute requiredModule="perfil">
      <div className="flex min-h-screen bg-gradient-to-b from-background to-muted/20">
        <IntranetNav />

        <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <UserCircle className="h-8 w-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-bold">Mi Perfil</h1>
              </div>
              <p className="text-muted-foreground">
                Información personal y configuración de cuenta
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <Card className="lg:col-span-2 glass border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5 text-primary" />
                    Información Personal
                  </CardTitle>
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(false)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Guardar
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary to-red-800 rounded-full flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{user.name}</h3>
                      <Badge className="mt-1 bg-primary/20 text-primary border-primary/30">
                        {user.role === "comandante"
                          ? "Comandante General"
                          : user.role === "jefe_area"
                          ? `Jefe de ${user.area.charAt(0).toUpperCase() + user.area.slice(1)}`
                          : user.role === "jefe_guardia"
                          ? "Jefe de Guardia"
                          : "Efectivo"}
                      </Badge>
                    </div>
                  </div>

                  {/* Personal Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="username">Usuario</Label>
                      <Input
                        id="username"
                        value={user.username}
                        disabled
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="name">Nombre Completo</Label>
                      <Input
                        id="name"
                        value={user.name}
                        disabled={!isEditing}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="correo@bomberos163.com"
                        disabled={!isEditing}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+591 XXXXXXXX"
                        disabled={!isEditing}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="area">Área</Label>
                      <Input
                        id="area"
                        value={user.area.charAt(0).toUpperCase() + user.area.slice(1)}
                        disabled
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="gender">Género</Label>
                      <Input
                        id="gender"
                        value={user.gender === "masculino" ? "Masculino" : "Femenino"}
                        disabled
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Card */}
              <div className="space-y-6">
                {user.role === "efectivo" && (
                  <>
                    <Card className="glass border-primary/10">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-primary" />
                          Progreso ESBAS
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Lecciones completadas</span>
                              <span className="font-bold">12/30</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-red-800"
                                style={{ width: "40%" }}
                              />
                            </div>
                          </div>
                          <div className="pt-2 border-t border-primary/10">
                            <p className="text-xs text-muted-foreground mb-2">
                              Especialidades desbloqueadas
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="text-xs">
                                Básico
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Rescate
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass border-primary/10">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-primary" />
                          Estadísticas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Horas este mes
                            </span>
                            <span className="font-bold">40h</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Total acumulado
                            </span>
                            <span className="font-bold">152h</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Guardias completadas
                            </span>
                            <span className="font-bold">8</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                <Card className="glass border-primary/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Información del Sistema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Último acceso</span>
                        <span className="font-medium">Hoy</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Miembro desde</span>
                        <span className="font-medium">Ene 2024</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectRoute>
  )
}
