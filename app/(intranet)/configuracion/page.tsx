"use client"

import { useState } from "react"
import { signOut, useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PageHeader } from "@/components/intranet/page-header"
import {
  Settings,
  User,
  Lock,
  Bell,
  Shield,
  Eye,
  EyeOff,
  Save,
  LogOut,
  CheckCircle2,
  Building2,
  Key,
  Database,
  Globe,
} from "lucide-react"
import { companyConfig } from "@/company.config"

export default function ConfiguracionPage() {
  const { data: session } = useSession()

  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [password, setPassword] = useState({ current: "", nuevo: "", confirm: "" })
  const [notif, setNotif] = useState({
    emergencias: true,
    guardias: true,
    comunicados: true,
    reuniones: false,
    esbas: true,
  })

  const initials = session?.user?.name
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("") ?? "?"

  const gradeLabels: Record<string, string> = {
    aspirante: "Aspirante",
    seccionario: "Seccionario",
    subteniente: "Subteniente",
    teniente: "Teniente",
    capitan: "Capitán",
    teniente_brigadier: "Ten. Brigadier",
    brigadier: "Brigadier",
    brigadier_mayor: "Brig. Mayor",
    brigadier_general: "Brig. General",
  }

  const handleSaveProfile = () => {
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  const handleChangePassword = () => {
    if (!password.current || !password.nuevo || password.nuevo !== password.confirm) return
    setPwSaved(true)
    setPassword({ current: "", nuevo: "", confirm: "" })
    setTimeout(() => setPwSaved(false), 3000)
  }

  const pwValid = password.current && password.nuevo && password.nuevo === password.confirm && password.nuevo.length >= 8

  return (
    <div>
      <PageHeader
        icon={Settings}
        title="Configuración"
        description="Ajustes de cuenta, seguridad y preferencias del sistema"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tarjeta lateral de perfil */}
        <Card className="glass border-primary/10 h-fit">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-3">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-lg">{session?.user?.name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email ?? "—"}</p>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {gradeLabels[session?.user?.grade ?? ""] ?? session?.user?.grade ?? "—"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive hover:text-white mt-2"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </CardContent>
        </Card>

        {/* Tabs principales */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="cuenta">
            <TabsList className="w-full justify-start mb-6 flex-wrap h-auto">
              <TabsTrigger value="cuenta" className="gap-2">
                <User className="h-4 w-4" />
                Cuenta
              </TabsTrigger>
              <TabsTrigger value="seguridad" className="gap-2">
                <Lock className="h-4 w-4" />
                Seguridad
              </TabsTrigger>
              <TabsTrigger value="notificaciones" className="gap-2">
                <Bell className="h-4 w-4" />
                Notificaciones
              </TabsTrigger>
              <TabsTrigger value="sistema" className="gap-2">
                <Building2 className="h-4 w-4" />
                Sistema
              </TabsTrigger>
            </TabsList>

            {/* ── Cuenta ── */}
            <TabsContent value="cuenta" className="space-y-4">
              <Card className="glass border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base">Información Personal</CardTitle>
                  <CardDescription>Los cambios requieren validación del primer jefe.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileSaved && (
                    <Alert className="border-green-500/30 bg-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-700 dark:text-green-400">
                        Solicitud de cambio enviada correctamente.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre completo</Label>
                      <Input defaultValue={session?.user?.name ?? ""} className="glass" />
                    </div>
                    <div className="space-y-2">
                      <Label>Correo electrónico</Label>
                      <Input type="email" defaultValue={session?.user?.email ?? ""} className="glass" />
                    </div>
                    <div className="space-y-2">
                      <Label>Grado</Label>
                      <Input
                        value={gradeLabels[session?.user?.grade ?? ""] ?? session?.user?.grade ?? ""}
                        disabled
                        className="glass opacity-60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>DNI</Label>
                      <Input placeholder="No registrado" disabled className="glass opacity-60" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border pt-4">
                  <Button onClick={handleSaveProfile} className="ml-auto bg-primary text-white">
                    <Save className="h-4 w-4 mr-2" />
                    Solicitar Cambio
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* ── Seguridad ── */}
            <TabsContent value="seguridad" className="space-y-4">
              <Card className="glass border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" />
                    Cambiar Contraseña
                  </CardTitle>
                  <CardDescription>Mínimo 8 caracteres. Se recomienda usar letras, números y símbolos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pwSaved && (
                    <Alert className="border-green-500/30 bg-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-700 dark:text-green-400">
                        Contraseña actualizada correctamente.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label>Contraseña actual</Label>
                    <div className="relative">
                      <Input
                        type={showCurrentPw ? "text" : "password"}
                        value={password.current}
                        onChange={(e) => setPassword({ ...password, current: e.target.value })}
                        className="glass pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                      >
                        {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nueva contraseña</Label>
                    <div className="relative">
                      <Input
                        type={showNewPw ? "text" : "password"}
                        value={password.nuevo}
                        onChange={(e) => setPassword({ ...password, nuevo: e.target.value })}
                        className="glass pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowNewPw(!showNewPw)}
                      >
                        {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {password.nuevo && password.nuevo.length < 8 && (
                      <p className="text-xs text-destructive">Mínimo 8 caracteres</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar nueva contraseña</Label>
                    <Input
                      type="password"
                      value={password.confirm}
                      onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                      className="glass"
                    />
                    {password.confirm && password.nuevo !== password.confirm && (
                      <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border pt-4">
                  <Button
                    onClick={handleChangePassword}
                    disabled={!pwValid}
                    className="ml-auto bg-primary text-white"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Actualizar Contraseña
                  </Button>
                </CardFooter>
              </Card>

              <Card className="glass border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Permisos Activos
                  </CardTitle>
                  <CardDescription>Permisos asignados según cargo y grado.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {((session?.user?.permissions as string[]) ?? []).map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs font-mono">
                        {p}
                      </Badge>
                    ))}
                    {!session?.user?.permissions && (
                      <p className="text-sm text-muted-foreground">Cargando permisos…</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Notificaciones ── */}
            <TabsContent value="notificaciones">
              <Card className="glass border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base">Preferencias de Notificaciones</CardTitle>
                  <CardDescription>Controla qué alertas recibirás dentro del sistema.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(
                    [
                      { key: "emergencias", label: "Emergencias", desc: "Alertas de despliegue y emergencias activas" },
                      { key: "guardias", label: "Guardias Nocturnas", desc: "Recordatorios de guardia asignada" },
                      { key: "comunicados", label: "Comunicados", desc: "Nuevos comunicados de jefatura" },
                      { key: "esbas", label: "ESBAS", desc: "Disponibilidad de nuevas lecciones" },
                      { key: "reuniones", label: "Reuniones", desc: "Recordatorios de reuniones mensuales" },
                    ] as const
                  ).map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={notif[key]}
                        onCheckedChange={(v) => setNotif({ ...notif, [key]: v })}
                      />
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="border-t border-border pt-4">
                  <Button className="ml-auto bg-primary text-white">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Preferencias
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* ── Sistema ── */}
            <TabsContent value="sistema" className="space-y-4">
              <Card className="glass border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Información de la Compañía
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  {[
                    { label: "Nombre", value: companyConfig.name },
                    { label: "ID / UBO", value: companyConfig.id },
                    { label: "Distrito", value: companyConfig.location.district },
                    { label: "Provincia", value: companyConfig.location.province },
                    { label: "Departamento", value: companyConfig.location.department },
                    { label: "Fundación", value: String(companyConfig.foundedYear) },
                    { label: "Comandancia", value: companyConfig.departmental.name },
                    { label: "Email", value: companyConfig.contact.email },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="glass border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    Estado del Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  {[
                    { label: "Versión", value: "1.0.0-beta" },
                    { label: "Framework", value: "Next.js 15" },
                    { label: "Base de datos", value: "PostgreSQL (pendiente conexión)" },
                    { label: "Auth", value: "NextAuth v5" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium font-mono text-xs">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
