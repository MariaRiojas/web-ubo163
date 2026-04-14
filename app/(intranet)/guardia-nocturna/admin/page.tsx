"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Settings, Plus, Trash2, Edit, Save, FileText, BarChart2, Users, Bed } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { PageHeader } from "@/components/intranet/page-header"
import { Moon } from "lucide-react"

// ── Datos mock ────────────────────────────────────────────────────

type BedStatus = "disponible" | "ocupada" | "mantenimiento"

interface Cama {
  id: number
  number: number
  status: BedStatus
  name: string | null
  rank: string | null
  location: string
}

const camasData: Cama[] = [
  { id: 1,  number: 1,  status: "ocupada",       name: "Cárdenas López",  rank: "Seccionario", location: "Sector A" },
  { id: 2,  number: 2,  status: "ocupada",       name: "Quispe Huanca",   rank: "Seccionaria", location: "Sector A" },
  { id: 3,  number: 3,  status: "disponible",    name: null, rank: null,  location: "Sector A" },
  { id: 4,  number: 4,  status: "disponible",    name: null, rank: null,  location: "Sector A" },
  { id: 5,  number: 5,  status: "ocupada",       name: "Ruiz Palomino",   rank: "Subteniente", location: "Sector B" },
  { id: 6,  number: 6,  status: "mantenimiento", name: null, rank: null,  location: "Sector B" },
  { id: 7,  number: 7,  status: "disponible",    name: null, rank: null,  location: "Sector B" },
  { id: 8,  number: 8,  status: "ocupada",       name: "Soto Palacios",   rank: "Teniente",    location: "Sector B" },
  { id: 9,  number: 9,  status: "disponible",    name: null, rank: null,  location: "Sector C" },
  { id: 10, number: 10, status: "disponible",    name: null, rank: null,  location: "Sector C" },
  { id: 11, number: 11, status: "ocupada",       name: "Herrera Vargas",  rank: "Capitán",     location: "Sector C" },
  { id: 12, number: 12, status: "disponible",    name: null, rank: null,  location: "Sector C" },
]

const reservasData = [
  { id: 1, usuario: "Cárdenas López",  rango: "Seccionario", cama: 1,  fechas: ["2026-04-15", "2026-04-16", "2026-04-17"], estado: "Activa" },
  { id: 2, usuario: "Quispe Huanca",   rango: "Seccionaria", cama: 2,  fechas: ["2026-04-15", "2026-04-16"],               estado: "Activa" },
  { id: 3, usuario: "Mendoza Quiroz",  rango: "Seccionario", cama: 7,  fechas: ["2026-04-20", "2026-04-21", "2026-04-22"], estado: "Pendiente" },
  { id: 4, usuario: "Soto Palacios",   rango: "Teniente",    cama: 8,  fechas: ["2026-04-15", "2026-04-16"],               estado: "Activa" },
  { id: 5, usuario: "Flores Medina",   rango: "Teniente",    cama: 9,  fechas: ["2026-04-25", "2026-04-26", "2026-04-27"], estado: "Pendiente" },
]

// ── Status styles ─────────────────────────────────────────────────

const STATUS_STYLE: Record<BedStatus, { badge: string; border: string }> = {
  ocupada:       { badge: "bg-destructive/10 text-destructive border-destructive/20", border: "border-l-4 border-l-destructive" },
  disponible:    { badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", border: "border-l-4 border-l-green-500" },
  mantenimiento: { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", border: "border-l-4 border-l-amber-500" },
}

const STATUS_LABEL: Record<BedStatus, string> = {
  ocupada: "Ocupada", disponible: "Disponible", mantenimiento: "Mantenimiento",
}

const RESERVA_STYLE: Record<string, string> = {
  Activa:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Cancelada: "bg-destructive/10 text-destructive",
}

// ── Component ─────────────────────────────────────────────────────

export default function AdminGuardiaNocturna() {
  const [camas, setCamas] = useState(camasData)
  const [reservas, setReservas] = useState(reservasData)
  const [editingCama, setEditingCama] = useState<Cama | null>(null)
  const [newCama, setNewCama] = useState({ number: "", location: "Sector A", status: "disponible" })
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [camaToDelete, setCamaToDelete] = useState<number | null>(null)

  const handleAddCama = () => {
    if (!newCama.number) return
    const newId = Math.max(...camas.map((c) => c.id)) + 1
    setCamas([...camas, {
      id: newId,
      number: parseInt(newCama.number),
      status: newCama.status as BedStatus,
      name: null, rank: null,
      location: newCama.location,
    }])
    setNewCama({ number: "", location: "Sector A", status: "disponible" })
    setIsAddOpen(false)
  }

  const handleEditCama = () => {
    if (!editingCama) return
    setCamas(camas.map((c) => (c.id === editingCama.id ? editingCama : c)))
    setEditingCama(null)
  }

  const handleDeleteCama = () => {
    if (!camaToDelete) return
    setCamas(camas.filter((c) => c.id !== camaToDelete))
    setCamaToDelete(null)
  }

  const approveReservation = (id: number) =>
    setReservas(reservas.map((r) => (r.id === id ? { ...r, estado: "Activa" } : r)))

  const cancelReservation = (id: number) =>
    setReservas(reservas.map((r) => (r.id === id ? { ...r, estado: "Cancelada" } : r)))

  const ocupadas = camas.filter((c) => c.status === "ocupada").length
  const disponibles = camas.filter((c) => c.status === "disponible").length
  const ocupacionPct = Math.round((ocupadas / camas.length) * 100)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Moon}
        title="Administración — Guardia Nocturna"
        description="Panel de control para gestión de camas y reservas"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Camas</span>
            <Bed className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{camas.length}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">{disponibles} libres</Badge>
              <Badge className="bg-destructive/10 text-destructive text-xs">{ocupadas} ocupadas</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Reservas activas</span>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reservas.filter((r) => r.estado === "Activa").length}</div>
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs mt-2">
              {reservas.filter((r) => r.estado === "Pendiente").length} pendientes
            </Badge>
          </CardContent>
        </Card>
        <Card className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Personal hoy</span>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reservas.filter((r) => r.estado === "Activa" && r.fechas.includes(new Date().toISOString().split("T")[0])).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">En guardia activa</p>
          </CardContent>
        </Card>
        <Card className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Ocupación</span>
            <BarChart2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ocupacionPct}%</div>
            <Progress value={ocupacionPct} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reservas">
        <TabsList className="w-full justify-start flex-wrap h-auto">
          <TabsTrigger value="reservas">Reservas</TabsTrigger>
          <TabsTrigger value="camas">Gestión de Camas</TabsTrigger>
          <TabsTrigger value="configuracion">Configuración</TabsTrigger>
        </TabsList>

        {/* ── Reservas ── */}
        <TabsContent value="reservas" className="mt-6">
          <Card className="glass border-primary/10">
            <CardHeader>
              <CardTitle className="text-base">Gestión de Reservas</CardTitle>
              <CardDescription>Administración de reservas de guardia nocturna</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Efectivo</TableHead>
                      <TableHead>Grado</TableHead>
                      <TableHead>Cama</TableHead>
                      <TableHead>Fechas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservas.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.id}</TableCell>
                        <TableCell>{r.usuario}</TableCell>
                        <TableCell className="text-muted-foreground">{r.rango}</TableCell>
                        <TableCell>{r.cama}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {r.fechas.map((f, i) => (
                              <Badge key={i} variant="outline" className="text-xs justify-start">
                                {new Date(f).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" })}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${RESERVA_STYLE[r.estado]} text-xs`}>{r.estado}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {r.estado === "Pendiente" && (
                              <Button size="sm" className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => approveReservation(r.id)}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {r.estado !== "Cancelada" && (
                              <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => cancelReservation(r.id)}>
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border pt-4 flex justify-between">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                Exportar
              </Button>
              <Button size="sm" className="bg-primary text-white gap-2">
                <Plus className="h-4 w-4" />
                Nueva Reserva
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ── Camas ── */}
        <TabsContent value="camas" className="mt-6">
          <Card className="glass border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Gestión de Camas</CardTitle>
                <CardDescription>Administración de camas para guardia nocturna</CardDescription>
              </div>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary text-white gap-2">
                    <Plus className="h-4 w-4" />
                    Añadir Cama
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Añadir Nueva Cama</DialogTitle>
                    <DialogDescription>Complete los detalles para añadir una nueva cama.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Número de Cama</Label>
                      <Input placeholder="Ej: 13" className="glass" value={newCama.number} onChange={(e) => setNewCama({ ...newCama, number: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ubicación</Label>
                      <Select value={newCama.location} onValueChange={(v) => setNewCama({ ...newCama, location: v })}>
                        <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sector A">Sector A</SelectItem>
                          <SelectItem value="Sector B">Sector B</SelectItem>
                          <SelectItem value="Sector C">Sector C</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estado Inicial</Label>
                      <Select value={newCama.status} onValueChange={(v) => setNewCama({ ...newCama, status: v })}>
                        <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disponible">Disponible</SelectItem>
                          <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="bg-primary text-white" onClick={handleAddCama}>Añadir Cama</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {camas.map((cama) => (
                  <Card key={cama.id} className={`glass ${STATUS_STYLE[cama.status].border}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-lg font-bold">Cama {cama.number}</p>
                          <p className="text-xs text-muted-foreground">{cama.location}</p>
                        </div>
                        <Badge className={`${STATUS_STYLE[cama.status].badge} text-xs`}>
                          {STATUS_LABEL[cama.status]}
                        </Badge>
                      </div>
                      {cama.status === "ocupada" && cama.name && (
                        <div className="mb-3 p-2 rounded-md bg-muted/50">
                          <p className="text-sm font-medium">{cama.name}</p>
                          <p className="text-xs text-muted-foreground">{cama.rank}</p>
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        {/* Editar */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setEditingCama(cama)}>
                              <Edit className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Cama {cama.number}</DialogTitle>
                            </DialogHeader>
                            {editingCama && (
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Número</Label>
                                  <Input className="glass" type="number" value={editingCama.number}
                                    onChange={(e) => setEditingCama({ ...editingCama, number: parseInt(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Ubicación</Label>
                                  <Select value={editingCama.location} onValueChange={(v) => setEditingCama({ ...editingCama, location: v })}>
                                    <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sector A">Sector A</SelectItem>
                                      <SelectItem value="Sector B">Sector B</SelectItem>
                                      <SelectItem value="Sector C">Sector C</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Estado</Label>
                                  <Select value={editingCama.status} onValueChange={(v) => setEditingCama({ ...editingCama, status: v as BedStatus })}>
                                    <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="disponible">Disponible</SelectItem>
                                      <SelectItem value="ocupada">Ocupada</SelectItem>
                                      <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                            <DialogFooter>
                              <Button className="bg-primary text-white" onClick={handleEditCama}>
                                <Save className="h-4 w-4 mr-2" />
                                Guardar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        {/* Eliminar */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="gap-1.5 h-8" onClick={() => setCamaToDelete(cama.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Eliminar Cama {cama.number}</DialogTitle>
                              <DialogDescription>¿Confirmas la eliminación de la cama {cama.number}? Esta acción no se puede deshacer.</DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setCamaToDelete(null)}>Cancelar</Button>
                              <Button variant="destructive" onClick={handleDeleteCama}>Eliminar</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Configuración ── */}
        <TabsContent value="configuracion" className="mt-6">
          <Card className="glass border-primary/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Configuración del Sistema
              </CardTitle>
              <CardDescription>Ajustes generales del módulo de guardia nocturna</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">General</h3>
                {[
                  { label: "Aprobación automática", desc: "Aprobar automáticamente las reservas de guardia", defaultChecked: false },
                  { label: "Notificaciones por email", desc: "Enviar email de confirmación al reservar",       defaultChecked: true },
                ].map(({ label, desc, defaultChecked }) => (
                  <div key={label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch defaultChecked={defaultChecked} />
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium">Límite de reserva anticipada</p>
                    <p className="text-xs text-muted-foreground">Días máximos de antelación para reservar</p>
                  </div>
                  <Select defaultValue="7">
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 días</SelectItem>
                      <SelectItem value="5">5 días</SelectItem>
                      <SelectItem value="7">7 días</SelectItem>
                      <SelectItem value="14">14 días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Horarios</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hora-inicio">Hora de inicio</Label>
                    <Select defaultValue="20:00">
                      <SelectTrigger id="hora-inicio" className="glass"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="19:00">19:00</SelectItem>
                        <SelectItem value="20:00">20:00</SelectItem>
                        <SelectItem value="21:00">21:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hora-fin">Hora de fin</Label>
                    <Select defaultValue="08:00">
                      <SelectTrigger id="hora-fin" className="glass"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="07:00">07:00</SelectItem>
                        <SelectItem value="08:00">08:00</SelectItem>
                        <SelectItem value="09:00">09:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border pt-4">
              <Button className="ml-auto bg-primary text-white gap-2">
                <Save className="h-4 w-4" />
                Guardar Configuración
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
