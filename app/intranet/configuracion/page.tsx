"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { User, Lock, Bell, Shield, Eye, EyeOff, Save, Camera, LogOut, CheckCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

export default function ConfiguracionPerfil() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Estados para formularios
  const [perfil, setPerfil] = useState({
    nombre: "Administrador",
    email: "admin@bomberos.com",
    telefono: "+1234567890",
    rango: "Administrador",
    departamento: "Jefatura",
  })

  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  })

  const [notificaciones, setNotificaciones] = useState({
    email: true,
    sistema: true,
    emergencias: true,
    guardias: true,
    reuniones: false,
  })

  // Función para guardar cambios de perfil
  const handleSavePerfil = () => {
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  // Función para cambiar contraseña
  const handleChangePassword = () => {
    if (password.new === password.confirm && password.current) {
      setPasswordChanged(true)
      setTimeout(() => setPasswordChanged(false), 3000)
      setPassword({
        current: "",
        new: "",
        confirm: "",
      })
    }
  }

  // Función para cerrar sesión
  const handleLogout = () => {
    router.push("/intranet")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Configuración de Perfil</h1>
          <p className="text-gray-400">Gestiona tu información personal y preferencias</p>
        </div>
        <div className="flex gap-3">
          <Button variant="destructive" className="text-white" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6 flex flex-col items-center">
              <div className="relative mb-4">
                <Avatar className="h-32 w-32 border-4 border-red-600">
                  <AvatarImage src="/placeholder.svg?height=128&width=128" alt="Admin" />
                  <AvatarFallback className="bg-red-700 text-white text-4xl">AD</AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full bg-red-600 hover:bg-red-700 h-8 w-8"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="text-xl font-bold text-white mt-2">Administrador</h2>
              <p className="text-gray-400 mb-4">admin@bomberos.com</p>
              <Badge className="bg-red-600 mb-6">Administrador</Badge>

              <div className="w-full space-y-2">
                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-gray-300 hover:text-white justify-start"
                >
                  <User className="mr-2 h-4 w-4" />
                  Ver Perfil Público
                </Button>
                <Button variant="destructive" className="w-full justify-start" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="perfil" className="w-full">
            <TabsList className="bg-gray-800 border-gray-700 w-full justify-start overflow-x-auto">
              <TabsTrigger value="perfil" className="data-[state=active]:bg-red-600">
                <User className="mr-2 h-4 w-4" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="seguridad" className="data-[state=active]:bg-red-600">
                <Lock className="mr-2 h-4 w-4" />
                Seguridad
              </TabsTrigger>
              <TabsTrigger value="notificaciones" className="data-[state=active]:bg-red-600">
                <Bell className="mr-2 h-4 w-4" />
                Notificaciones
              </TabsTrigger>
            </TabsList>

            {/* Pestaña de Perfil */}
            <TabsContent value="perfil" className="mt-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Información Personal</CardTitle>
                  <CardDescription className="text-gray-400">
                    Actualiza tu información personal y de contacto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileSaved && (
                    <Alert className="bg-green-900/30 border-green-800 text-white mb-4">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <AlertTitle>Perfil actualizado</AlertTitle>
                      <AlertDescription>Los cambios en tu perfil han sido guardados correctamente.</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre Completo</Label>
                      <Input
                        id="nombre"
                        className="bg-gray-750 border-gray-700 text-white"
                        value={perfil.nombre}
                        onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input
                        id="email"
                        type="email"
                        className="bg-gray-750 border-gray-700 text-white"
                        value={perfil.email}
                        onChange={(e) => setPerfil({ ...perfil, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono</Label>
                      <Input
                        id="telefono"
                        className="bg-gray-750 border-gray-700 text-white"
                        value={perfil.telefono}
                        onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rango">Rango</Label>
                      <Input
                        id="rango"
                        className="bg-gray-750 border-gray-700 text-white"
                        value={perfil.rango}
                        disabled
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="departamento">Departamento</Label>
                      <Select
                        value={perfil.departamento}
                        onValueChange={(value) => setPerfil({ ...perfil, departamento: value })}
                        disabled
                      >
                        <SelectTrigger id="departamento" className="bg-gray-750 border-gray-700 text-white">
                          <SelectValue placeholder="Seleccionar departamento" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="Jefatura">Jefatura</SelectItem>
                          <SelectItem value="Operaciones">Operaciones</SelectItem>
                          <SelectItem value="Administración">Administración</SelectItem>
                          <SelectItem value="Instrucción">Instrucción</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-gray-700 pt-4">
                  <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleSavePerfil}>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Pestaña de Seguridad */}
            <TabsContent value="seguridad" className="mt-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Cambiar Contraseña</CardTitle>
                  <CardDescription className="text-gray-400">
                    Actualiza tu contraseña para mantener tu cuenta segura
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {passwordChanged && (
                    <Alert className="bg-green-900/30 border-green-800 text-white mb-4">
                      <Shield className="h-4 w-4 text-green-400" />
                      <AlertTitle>Contraseña actualizada</AlertTitle>
                      <AlertDescription>Tu contraseña ha sido cambiada correctamente.</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Contraseña Actual</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showPassword ? "text" : "password"}
                          className="bg-gray-750 border-gray-700 text-white pr-10"
                          value={password.current}
                          onChange={(e) => setPassword({ ...password, current: e.target.value })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nueva Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          className="bg-gray-750 border-gray-700 text-white pr-10"
                          value={password.new}
                          onChange={(e) => setPassword({ ...password, new: e.target.value })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        className="bg-gray-750 border-gray-700 text-white"
                        value={password.confirm}
                        onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-gray-700 pt-4">
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleChangePassword}
                    disabled={!password.current || !password.new || password.new !== password.confirm}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Cambiar Contraseña
                  </Button>
                </CardFooter>
              </Card>

              <Card className="bg-gray-800 border-gray-700 mt-6">
                <CardHeader>
                  <CardTitle className="text-white">Sesiones Activas</CardTitle>
                  <CardDescription className="text-gray-400">
                    Gestiona tus sesiones activas en diferentes dispositivos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { device: "Windows PC", location: "Santiago, Chile", lastActive: "Ahora", current: true },
                      { device: "iPhone 13", location: "Santiago, Chile", lastActive: "Hace 2 horas" },
                      { device: "MacBook Pro", location: "Valparaíso, Chile", lastActive: "Hace 2 días" },
                    ].map((session, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-750 rounded-lg">
                        <div>
                          <div className="flex items-center">
                            <p className="font-medium text-white">{session.device}</p>
                            {session.current && <Badge className="ml-2 bg-green-900/30 text-green-400">Actual</Badge>}
                          </div>
                          <div className="flex items-center text-sm text-gray-400 mt-1">
                            <p>{session.location}</p>
                            <span className="mx-2">•</span>
                            <p>{session.lastActive}</p>
                          </div>
                        </div>
                        {!session.current && (
                          <Button variant="destructive" size="sm">
                            <LogOut className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pestaña de Notificaciones */}
            <TabsContent value="notificaciones" className="mt-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Preferencias de Notificaciones</CardTitle>
                  <CardDescription className="text-gray-400">
                    Configura cómo y cuándo quieres recibir notificaciones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-lg font-medium text-white">Canales de Notificación</h3>

                      <div className="flex items-center justify-between p-3 bg-gray-750 rounded-lg">
                        <div>
                          <p className="font-medium text-white">Correo Electrónico</p>
                          <p className="text-sm text-gray-400">Recibir notificaciones por email</p>
                        </div>
                        <Switch
                          checked={notificaciones.email}
                          onCheckedChange={(checked) => setNotificaciones({ ...notificaciones, email: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-750 rounded-lg">
                        <div>
                          <p className="font-medium text-white">Notificaciones del Sistema</p>
                          <p className="text-sm text-gray-400">Recibir notificaciones en la plataforma</p>
                        </div>
                        <Switch
                          checked={notificaciones.sistema}
                          onCheckedChange={(checked) => setNotificaciones({ ...notificaciones, sistema: checked })}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-lg font-medium text-white">Tipos de Notificaciones</h3>

                      <div className="flex items-center justify-between p-3 bg-gray-750 rounded-lg">
                        <div>
                          <p className="font-medium text-white">Emergencias</p>
                          <p className="text-sm text-gray-400">Alertas de emergencias y despliegues</p>
                        </div>
                        <Switch
                          checked={notificaciones.emergencias}
                          onCheckedChange={(checked) => setNotificaciones({ ...notificaciones, emergencias: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-750 rounded-lg">
                        <div>
                          <p className="font-medium text-white">Guardias</p>
                          <p className="text-sm text-gray-400">Recordatorios de guardias programadas</p>
                        </div>
                        <Switch
                          checked={notificaciones.guardias}
                          onCheckedChange={(checked) => setNotificaciones({ ...notificaciones, guardias: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-750 rounded-lg">
                        <div>
                          <p className="font-medium text-white">Reuniones</p>
                          <p className="text-sm text-gray-400">Recordatorios de reuniones y capacitaciones</p>
                        </div>
                        <Switch
                          checked={notificaciones.reuniones}
                          onCheckedChange={(checked) => setNotificaciones({ ...notificaciones, reuniones: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-gray-700 pt-4">
                  <Button className="bg-red-600 hover:bg-red-700 text-white">
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Preferencias
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

