"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Settings, Plus, Trash2, Edit, Save, FileText, BarChart2, Users, Bed } from "lucide-react"
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
import SolicitudesPanel from "@/components/solicitudes-panel"

// Datos estáticos para las camas
const camasData = [
  { id: 1, number: 1, status: "ocupada", name: "Juan Pérez", rank: "Capitán", location: "Sector A" },
  { id: 2, number: 2, status: "ocupada", name: "María García", rank: "Teniente", location: "Sector A" },
  { id: 3, number: 3, status: "disponible", name: null, rank: null, location: "Sector A" },
  { id: 4, number: 4, status: "disponible", name: null, rank: null, location: "Sector A" },
  { id: 5, number: 5, status: "ocupada", name: "Carlos López", rank: "Sargento", location: "Sector B" },
  { id: 6, number: 6, status: "mantenimiento", name: null, rank: null, location: "Sector B" },
  { id: 7, number: 7, status: "disponible", name: null, rank: null, location: "Sector B" },
  { id: 8, number: 8, status: "ocupada", name: "Ana Martínez", rank: "Oficial", location: "Sector B" },
  { id: 9, number: 9, status: "disponible", name: null, rank: null, location: "Sector C" },
  { id: 10, number: 10, status: "disponible", name: null, rank: null, location: "Sector C" },
  { id: 11, number: 11, status: "ocupada", name: "Roberto Sánchez", rank: "Bombero", location: "Sector C" },
  { id: 12, number: 12, status: "disponible", name: null, rank: null, location: "Sector C" },
]

// Datos estáticos para las reservas
const reservasData = [
  {
    id: 1,
    usuario: "Juan Pérez",
    rango: "Capitán",
    cama: 1,
    fechas: ["2024-03-25", "2024-03-26", "2024-03-27"],
    estado: "Activa",
  },
  {
    id: 2,
    usuario: "María García",
    rango: "Teniente",
    cama: 2,
    fechas: ["2024-03-25", "2024-03-26"],
    estado: "Activa",
  },
  {
    id: 3,
    usuario: "Carlos López",
    rango: "Sargento",
    cama: 5,
    fechas: ["2024-03-28", "2024-03-29", "2024-03-30"],
    estado: "Pendiente",
  },
  {
    id: 4,
    usuario: "Ana Martínez",
    rango: "Oficial",
    cama: 8,
    fechas: ["2024-04-01", "2024-04-02"],
    estado: "Activa",
  },
  {
    id: 5,
    usuario: "Roberto Sánchez",
    rango: "Bombero",
    cama: 11,
    fechas: ["2024-04-05", "2024-04-06", "2024-04-07"],
    estado: "Pendiente",
  },
]

export default function AdminGuardiaNocturna() {
  const [camas, setCamas] = useState(camasData)
  const [reservas, setReservas] = useState(reservasData)
  const [editingCama, setEditingCama] = useState<any>(null)
  const [newCama, setNewCama] = useState({
    number: "",
    location: "Sector A",
    status: "disponible",
  })
  const [isAddCamaDialogOpen, setIsAddCamaDialogOpen] = useState(false)
  const [isEditCamaDialogOpen, setIsEditCamaDialogOpen] = useState(false)
  const [isDeleteCamaDialogOpen, setIsDeleteCamaDialogOpen] = useState(false)
  const [camaToDelete, setCamaToDelete] = useState<number | null>(null)

  // Función para añadir una nueva cama
  const handleAddCama = () => {
    if (newCama.number) {
      const newId = Math.max(...camas.map((c) => c.id)) + 1
      setCamas([
        ...camas,
        {
          id: newId,
          number: Number.parseInt(newCama.number),
          status: newCama.status,
          name: null,
          rank: null,
          location: newCama.location,
        },
      ])
      setNewCama({
        number: "",
        location: "Sector A",
        status: "disponible",
      })
      setIsAddCamaDialogOpen(false)
    }
  }

  // Función para editar una cama
  const handleEditCama = () => {
    if (editingCama) {
      setCamas(camas.map((cama) => (cama.id === editingCama.id ? editingCama : cama)))
      setIsEditCamaDialogOpen(false)
      setEditingCama(null)
    }
  }

  // Función para eliminar una cama
  const handleDeleteCama = () => {
    if (camaToDelete) {
      setCamas(camas.filter((cama) => cama.id !== camaToDelete))
      setIsDeleteCamaDialogOpen(false)
      setCamaToDelete(null)
    }
  }

  // Función para cambiar el estado de una cama
  const toggleCamaStatus = (id: number, newStatus: string) => {
    setCamas(camas.map((cama) => (cama.id === id ? { ...cama, status: newStatus } : cama)))
  }

  // Función para aprobar una reserva
  const approveReservation = (id: number) => {
    setReservas(reservas.map((reserva) => (reserva.id === id ? { ...reserva, estado: "Activa" } : reserva)))
  }

  // Función para cancelar una reserva
  const cancelReservation = (id: number) => {
    setReservas(reservas.map((reserva) => (reserva.id === id ? { ...reserva, estado: "Cancelada" } : reserva)))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Administración de Guardia Nocturna</h1>
          <p className="text-gray-400">Panel de control para gestión de guardias y camas</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <FileText className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Generar Informe</span>
            <span className="sm:hidden">Informe</span>
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800">
            <Settings className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Configuración</span>
            <span className="sm:hidden">Config</span>
          </Button>
        </div>
      </div>

      {/* Resumen de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Camas</p>
                <p className="text-3xl font-bold text-white mt-1">{camas.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500">
                <Bed className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge className="bg-green-900/30 text-green-400">
                {camas.filter((c) => c.status === "disponible").length} disponibles
              </Badge>
              <Badge className="bg-red-900/30 text-red-400">
                {camas.filter((c) => c.status === "ocupada").length} ocupadas
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-400">Reservas Activas</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {reservas.filter((r) => r.estado === "Activa").length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge className="bg-amber-900/30 text-amber-400">
                {reservas.filter((r) => r.estado === "Pendiente").length} pendientes
              </Badge>
              <Badge className="bg-gray-700 text-gray-300">Este mes</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-400">Personal en Guardia</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {
                    reservas.filter(
                      (r) => r.estado === "Activa" && r.fechas.includes(new Date().toISOString().split("T")[0]),
                    ).length
                  }
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge className="bg-blue-900/30 text-blue-400">Hoy</Badge>
              <Badge className="bg-gray-700 text-gray-300">
                {new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-400">Ocupación</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {Math.round((camas.filter((c) => c.status === "ocupada").length / camas.length) * 100)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-500">
                <BarChart2 className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full bg-red-600"
                  style={{ width: `${(camas.filter((c) => c.status === "ocupada").length / camas.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reservas" className="w-full">
        <TabsList className="bg-gray-800 border-gray-700 w-full justify-start overflow-x-auto">
          <TabsTrigger value="reservas" className="data-[state=active]:bg-red-600">
            Reservas
          </TabsTrigger>
          <TabsTrigger value="camas" className="data-[state=active]:bg-red-600">
            Gestión de Camas
          </TabsTrigger>
          <TabsTrigger value="calendario" className="data-[state=active]:bg-red-600">
            Calendario
          </TabsTrigger>
          <TabsTrigger value="configuracion" className="data-[state=active]:bg-red-600">
            Configuración
          </TabsTrigger>
        </TabsList>

        {/* Pestaña de Reservas */}
        <TabsContent value="reservas" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Gestión de Reservas</CardTitle>
              <CardDescription className="text-gray-400">
                Administración de reservas de guardia nocturna
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-gray-700">
                <Table>
                  <TableHeader className="bg-gray-750">
                    <TableRow className="hover:bg-gray-700 border-gray-700">
                      <TableHead className="text-gray-400">ID</TableHead>
                      <TableHead className="text-gray-400">Usuario</TableHead>
                      <TableHead className="text-gray-400">Rango</TableHead>
                      <TableHead className="text-gray-400">Cama</TableHead>
                      <TableHead className="text-gray-400">Fechas</TableHead>
                      <TableHead className="text-gray-400">Estado</TableHead>
                      <TableHead className="text-gray-400">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservas.map((reserva) => (
                      <TableRow key={reserva.id} className="hover:bg-gray-750 border-gray-700">
                        <TableCell className="font-medium text-white">{reserva.id}</TableCell>
                        <TableCell className="text-gray-300">{reserva.usuario}</TableCell>
                        <TableCell className="text-gray-300">{reserva.rango}</TableCell>
                        <TableCell className="text-gray-300">{reserva.cama}</TableCell>
                        <TableCell className="text-gray-300">
                          <div className="flex flex-col gap-1">
                            {reserva.fechas.map((fecha, idx) => (
                              <Badge key={idx} variant="outline" className="justify-start border-gray-600">
                                {new Date(fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              reserva.estado === "Activa"
                                ? "bg-green-900/30 text-green-400"
                                : reserva.estado === "Pendiente"
                                  ? "bg-amber-900/30 text-amber-400"
                                  : "bg-red-900/30 text-red-400"
                            }
                          >
                            {reserva.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {reserva.estado === "Pendiente" && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 h-8 px-2"
                                onClick={() => approveReservation(reserva.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {reserva.estado !== "Cancelada" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 px-2"
                                onClick={() => cancelReservation(reserva.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-8 px-2 border-gray-600">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-gray-700 pt-4">
              <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white">
                Exportar Reservas
              </Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Reserva
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Pestaña de Gestión de Camas */}
        <TabsContent value="camas" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-white">Gestión de Camas</CardTitle>
                <CardDescription className="text-gray-400">
                  Administración de camas para guardia nocturna
                </CardDescription>
              </div>
              <Dialog open={isAddCamaDialogOpen} onOpenChange={setIsAddCamaDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-red-600 hover:bg-red-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir Cama
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 text-white border-gray-700">
                  <DialogHeader>
                    <DialogTitle>Añadir Nueva Cama</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Complete los detalles para añadir una nueva cama.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="number">Número de Cama</Label>
                      <Input
                        id="number"
                        placeholder="Ej: 13"
                        className="bg-gray-750 border-gray-700 text-white"
                        value={newCama.number}
                        onChange={(e) => setNewCama({ ...newCama, number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Ubicación</Label>
                      <Select
                        value={newCama.location}
                        onValueChange={(value) => setNewCama({ ...newCama, location: value })}
                      >
                        <SelectTrigger className="bg-gray-750 border-gray-700 text-white">
                          <SelectValue placeholder="Seleccione ubicación" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="Sector A">Sector A</SelectItem>
                          <SelectItem value="Sector B">Sector B</SelectItem>
                          <SelectItem value="Sector C">Sector C</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Estado Inicial</Label>
                      <Select
                        value={newCama.status}
                        onValueChange={(value) => setNewCama({ ...newCama, status: value })}
                      >
                        <SelectTrigger className="bg-gray-750 border-gray-700 text-white">
                          <SelectValue placeholder="Seleccione estado" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="disponible">Disponible</SelectItem>
                          <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleAddCama}>
                      Añadir Cama
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {camas.map((cama) => (
                  <Card
                    key={cama.id}
                    className={`bg-gray-750 border-gray-700 hover:bg-gray-700 transition-all ${
                      cama.status === "ocupada"
                        ? "border-l-4 border-l-red-600"
                        : cama.status === "disponible"
                          ? "border-l-4 border-l-green-600"
                          : "border-l-4 border-l-amber-600"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-white">Cama {cama.number}</h3>
                          <p className="text-sm text-gray-400">{cama.location}</p>
                        </div>
                        <Badge
                          className={`${
                            cama.status === "ocupada"
                              ? "bg-red-900/30 text-red-400"
                              : cama.status === "disponible"
                                ? "bg-green-900/30 text-green-400"
                                : "bg-amber-900/30 text-amber-400"
                          }`}
                        >
                          {cama.status === "ocupada"
                            ? "Ocupada"
                            : cama.status === "disponible"
                              ? "Disponible"
                              : "Mantenimiento"}
                        </Badge>
                      </div>

                      {cama.status === "ocupada" && (
                        <div className="mb-3 p-2 bg-gray-800 rounded-md">
                          <p className="text-sm font-medium text-white">{cama.name}</p>
                          <p className="text-xs text-gray-400">{cama.rank}</p>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-600 text-gray-300 hover:text-white"
                              onClick={() => setEditingCama(cama)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-800 text-white border-gray-700">
                            <DialogHeader>
                              <DialogTitle>Editar Cama {cama.number}</DialogTitle>
                              <DialogDescription className="text-gray-400">
                                Modifique los detalles de la cama.
                              </DialogDescription>
                            </DialogHeader>
                            {editingCama && (
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-number">Número de Cama</Label>
                                  <Input
                                    id="edit-number"
                                    className="bg-gray-750 border-gray-700 text-white"
                                    value={editingCama.number}
                                    onChange={(e) =>
                                      setEditingCama({ ...editingCama, number: Number.parseInt(e.target.value) })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-location">Ubicación</Label>
                                  <Select
                                    value={editingCama.location}
                                    onValueChange={(value) => setEditingCama({ ...editingCama, location: value })}
                                  >
                                    <SelectTrigger className="bg-gray-750 border-gray-700 text-white">
                                      <SelectValue placeholder="Seleccione ubicación" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                      <SelectItem value="Sector A">Sector A</SelectItem>
                                      <SelectItem value="Sector B">Sector B</SelectItem>
                                      <SelectItem value="Sector C">Sector C</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-status">Estado</Label>
                                  <Select
                                    value={editingCama.status}
                                    onValueChange={(value) => setEditingCama({ ...editingCama, status: value })}
                                  >
                                    <SelectTrigger className="bg-gray-750 border-gray-700 text-white">
                                      <SelectValue placeholder="Seleccione estado" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                      <SelectItem value="disponible">Disponible</SelectItem>
                                      <SelectItem value="ocupada">Ocupada</SelectItem>
                                      <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                            <DialogFooter>
                              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleEditCama}>
                                <Save className="mr-2 h-4 w-4" />
                                Guardar Cambios
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="destructive" onClick={() => setCamaToDelete(cama.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-800 text-white border-gray-700">
                            <DialogHeader>
                              <DialogTitle>Eliminar Cama</DialogTitle>
                              <DialogDescription className="text-gray-400">
                                ¿Está seguro que desea eliminar la cama {cama.number}?
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                className="border-gray-600 text-gray-300 hover:text-white"
                                onClick={() => setCamaToDelete(null)}
                              >
                                Cancelar
                              </Button>
                              <Button variant="destructive" onClick={handleDeleteCama}>
                                Eliminar Cama
                              </Button>
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

        {/* Pestaña de Calendario */}
        <TabsContent value="calendario" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Calendario de Guardias</CardTitle>
              <CardDescription className="text-gray-400">
                Vista general de todas las guardias programadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                {/* Cabecera de días de la semana */}
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day, index) => (
                  <div key={index} className="text-center p-2 font-medium text-gray-400">
                    {day}
                  </div>
                ))}

                {/* Días del mes (ejemplo para marzo 2024) */}
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  // Determinar si el día tiene guardias asignadas (datos estáticos)
                  const guardias = reservas.filter(
                    (r) => r.fechas.includes(`2024-03-${day.toString().padStart(2, "0")}`) && r.estado === "Activa",
                  )

                  const isWeekend = (day + 4) % 7 === 0 || (day + 4) % 7 === 1 // Sábado o domingo

                  return (
                    <div
                      key={day}
                      className={`p-2 rounded-lg border text-center min-h-[100px] flex flex-col ${
                        guardias.length > 0
                          ? "bg-red-900/20 border-red-800/50"
                          : isWeekend
                            ? "bg-gray-750 border-gray-700"
                            : "bg-gray-800 border-gray-700"
                      }`}
                    >
                      <span className={`text-sm font-medium ${isWeekend ? "text-gray-500" : "text-white"}`}>{day}</span>
                      {guardias.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {guardias.map((guardia, idx) => (
                            <Badge
                              key={idx}
                              className="bg-red-800/50 text-red-300 text-xs w-full"
                              title={guardia.usuario}
                            >
                              Cama {guardia.cama}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-center mt-6 gap-4">
                <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white">
                  Mes Anterior
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white">Hoy</Button>
                <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white">
                  Mes Siguiente
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña de Configuración */}
        <TabsContent value="configuracion" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Configuración del Sistema</CardTitle>
              <CardDescription className="text-gray-400">
                Ajustes generales del sistema de guardia nocturna
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-white">Configuración General</h3>

                  <div className="flex items-center justify-between p-3 bg-gray-750 rounded-lg">
                    <div>
                      <p className="font-medium text-white">Aprobación Automática</p>
                      <p className="text-sm text-gray-400">Aprobar automáticamente las reservas de guardia</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-750 rounded-lg">
                    <div>
                      <p className="font-medium text-white">Notificaciones por Email</p>
                      <p className="text-sm text-gray-400">Enviar notificaciones por email al reservar</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-750 rounded-lg">
                    <div>
                      <p className="font-medium text-white">Límite de Reservas</p>
                      <p className="text-sm text-gray-400">Número máximo de días que se pueden reservar</p>
                    </div>
                    <Select defaultValue="7">
                      <SelectTrigger className="w-24 bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        <SelectItem value="3">3 días</SelectItem>
                        <SelectItem value="5">5 días</SelectItem>
                        <SelectItem value="7">7 días</SelectItem>
                        <SelectItem value="14">14 días</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-white">Horarios</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hora-inicio">Hora de Inicio</Label>
                      <Select defaultValue="20:00">
                        <SelectTrigger id="hora-inicio" className="bg-gray-750 border-gray-700 text-white">
                          <SelectValue placeholder="Seleccionar hora" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="19:00">19:00</SelectItem>
                          <SelectItem value="20:00">20:00</SelectItem>
                          <SelectItem value="21:00">21:00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hora-fin">Hora de Fin</Label>
                      <Select defaultValue="08:00">
                        <SelectTrigger id="hora-fin" className="bg-gray-750 border-gray-700 text-white">
                          <SelectValue placeholder="Seleccionar hora" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="07:00">07:00</SelectItem>
                          <SelectItem value="08:00">08:00</SelectItem>
                          <SelectItem value="09:00">09:00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t border-gray-700 pt-4">
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <SolicitudesPanel departamento="Guardia Nocturna" />
    </div>
  )
}

