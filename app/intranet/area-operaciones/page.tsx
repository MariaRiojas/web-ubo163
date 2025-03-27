import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Truck,
  MapPin,
  PenToolIcon as Tool,
  AlertTriangle,
  Clock,
  Users,
  FileText,
  Radio,
  Flame,
  CheckCircle,
} from "lucide-react"
import SolicitudesPanel from "@/components/solicitudes-panel"

export default function AreaOperaciones() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Área de Operaciones</h1>
          <p className="text-gray-400">Gestión de emergencias y recursos operativos</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Reportar Emergencia
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800">
            <Radio className="mr-2 h-4 w-4" />
            Comunicaciones
          </Button>
        </div>
      </div>

      <Tabs defaultValue="emergencias" className="w-full">
        <TabsList className="bg-gray-800 border-gray-700 w-full justify-start">
          <TabsTrigger value="emergencias" className="data-[state=active]:bg-red-600">
            Emergencias
          </TabsTrigger>
          <TabsTrigger value="vehiculos" className="data-[state=active]:bg-red-600">
            Vehículos
          </TabsTrigger>
          <TabsTrigger value="equipos" className="data-[state=active]:bg-red-600">
            Equipos
          </TabsTrigger>
          <TabsTrigger value="protocolos" className="data-[state=active]:bg-red-600">
            Protocolos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emergencias" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Emergencias Activas</CardTitle>
                  <CardDescription className="text-gray-400">Incidentes en curso y respuesta operativa</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        id: "E-2024-089",
                        type: "Incendio Estructural",
                        location: "Av. Principal 123, Edificio Comercial",
                        status: "En Progreso",
                        time: "14:30",
                        units: ["B1", "B2", "E1"],
                        priority: "Alta",
                      },
                      {
                        id: "E-2024-090",
                        type: "Accidente Vehicular",
                        location: "Carretera Norte Km 5",
                        status: "En Camino",
                        time: "15:15",
                        units: ["R1", "A1"],
                        priority: "Media",
                      },
                    ].map((emergency, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-750 rounded-lg border-l-4 border-red-600 hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-white">{emergency.type}</h3>
                              <Badge
                                className={`${
                                  emergency.priority === "Alta"
                                    ? "bg-red-900/50 text-red-400"
                                    : "bg-amber-900/50 text-amber-400"
                                }`}
                              >
                                {emergency.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{emergency.location}</p>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-gray-500 mr-1" />
                                <span className="text-xs text-gray-400">{emergency.time}</span>
                              </div>
                              <div className="flex items-center">
                                <Truck className="h-4 w-4 text-gray-500 mr-1" />
                                <span className="text-xs text-gray-400">{emergency.units.join(", ")}</span>
                              </div>
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 text-gray-500 mr-1" />
                                <span className="text-xs text-gray-400">{emergency.id}</span>
                              </div>
                            </div>
                          </div>
                          <Badge
                            className={`${
                              emergency.status === "En Progreso"
                                ? "bg-blue-900/50 text-blue-400"
                                : "bg-amber-900/50 text-amber-400"
                            }`}
                          >
                            {emergency.status}
                          </Badge>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                            Ver Detalles
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:text-white"
                          >
                            Actualizar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700 mt-6">
                <CardHeader>
                  <CardTitle className="text-white">Mapa de Operaciones</CardTitle>
                  <CardDescription className="text-gray-400">Ubicación de unidades y emergencias</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-gray-750 rounded-lg flex items-center justify-center">
                    <MapPin className="h-16 w-16 text-gray-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Personal Operativo</CardTitle>
                  <CardDescription className="text-gray-400">Estado del personal en servicio</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "En Servicio", value: 24, color: "bg-green-500" },
                        { label: "En Emergencia", value: 12, color: "bg-red-500" },
                        { label: "En Guardia", value: 8, color: "bg-blue-500" },
                        { label: "Disponibles", value: 4, color: "bg-amber-500" },
                      ].map((stat, index) => (
                        <Card key={index} className="bg-gray-750 border-gray-700">
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-12 h-12 rounded-full ${stat.color} flex items-center justify-center mb-2`}
                              >
                                <Users className="h-6 w-6 text-white" />
                              </div>
                              <p className="text-2xl font-bold text-white">{stat.value}</p>
                              <p className="text-xs text-gray-400">{stat.label}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-300 mb-3">Equipos Operativos</h3>
                      {[
                        { name: "Equipo Alpha", members: 6, status: "Disponible" },
                        { name: "Equipo Bravo", members: 5, status: "En Emergencia" },
                        { name: "Equipo Charlie", members: 6, status: "En Guardia" },
                      ].map((team, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-750 rounded-lg mb-2">
                          <div className="flex items-center">
                            <Users className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-white">{team.name}</p>
                              <p className="text-xs text-gray-500">{team.members} miembros</p>
                            </div>
                          </div>
                          <Badge
                            className={`${
                              team.status === "Disponible"
                                ? "bg-green-900/30 text-green-400"
                                : team.status === "En Emergencia"
                                  ? "bg-red-900/30 text-red-400"
                                  : "bg-blue-900/30 text-blue-400"
                            }`}
                          >
                            {team.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700 mt-6">
                <CardHeader>
                  <CardTitle className="text-white">Estadísticas</CardTitle>
                  <CardDescription className="text-gray-400">Resumen de actividad operativa</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Emergencias Hoy", value: 5, icon: Flame, color: "text-red-400" },
                      { label: "Tiempo Promedio", value: "4.2 min", icon: Clock, color: "text-blue-400" },
                      { label: "Tasa de Éxito", value: "98%", icon: CheckCircle, color: "text-green-400" },
                    ].map((stat, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <stat.icon className={`h-5 w-5 mr-3 ${stat.color}`} />
                          <span className="text-gray-300">{stat.label}</span>
                        </div>
                        <span className="font-bold text-white">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vehiculos" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Estado de Vehículos</CardTitle>
              <CardDescription className="text-gray-400">Flota operativa y estado de mantenimiento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    code: "B1",
                    type: "Autobomba",
                    status: "Operativo",
                    location: "Estación Central",
                    lastMaintenance: "10/03/2024",
                    fuelLevel: 85,
                  },
                  {
                    code: "B2",
                    type: "Autobomba",
                    status: "Operativo",
                    location: "En Emergencia",
                    lastMaintenance: "05/03/2024",
                    fuelLevel: 70,
                  },
                  {
                    code: "E1",
                    type: "Escalera",
                    status: "Operativo",
                    location: "En Emergencia",
                    lastMaintenance: "01/03/2024",
                    fuelLevel: 90,
                  },
                  {
                    code: "R1",
                    type: "Rescate",
                    status: "Operativo",
                    location: "En Camino",
                    lastMaintenance: "15/03/2024",
                    fuelLevel: 95,
                  },
                  {
                    code: "A1",
                    type: "Ambulancia",
                    status: "Operativo",
                    location: "En Camino",
                    lastMaintenance: "12/03/2024",
                    fuelLevel: 80,
                  },
                  {
                    code: "B3",
                    type: "Autobomba",
                    status: "Mantenimiento",
                    location: "Taller",
                    lastMaintenance: "En curso",
                    fuelLevel: 50,
                  },
                ].map((vehicle, index) => (
                  <Card
                    key={index}
                    className={`border-l-4 ${
                      vehicle.status === "Operativo" ? "border-l-green-500" : "border-l-amber-500"
                    } bg-gray-750 hover:bg-gray-700 transition-colors transform hover:scale-105 duration-300`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-white">{vehicle.code}</h3>
                          <p className="text-sm text-gray-400">{vehicle.type}</p>
                        </div>
                        <Badge
                          className={`${
                            vehicle.status === "Operativo"
                              ? "bg-green-900/30 text-green-400"
                              : "bg-amber-900/30 text-amber-400"
                          }`}
                        >
                          {vehicle.status}
                        </Badge>
                      </div>

                      <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Ubicación:</span>
                          <span className="text-xs text-gray-300">{vehicle.location}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Último Mant.:</span>
                          <span className="text-xs text-gray-300">{vehicle.lastMaintenance}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Combustible:</span>
                            <span className="text-xs text-gray-300">{vehicle.fuelLevel}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                vehicle.fuelLevel > 70
                                  ? "bg-green-500"
                                  : vehicle.fuelLevel > 30
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${vehicle.fuelLevel}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipos" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Equipamiento Operativo</CardTitle>
              <CardDescription className="text-gray-400">Inventario y estado de equipos de emergencia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { category: "Equipos de Respiración", total: 25, available: 18, maintenance: 3, inUse: 4 },
                    { category: "Equipos Hidráulicos", total: 12, available: 8, maintenance: 1, inUse: 3 },
                    { category: "Equipos de Comunicación", total: 40, available: 30, maintenance: 2, inUse: 8 },
                  ].map((category, index) => (
                    <Card key={index} className="bg-gray-750 border-gray-700">
                      <CardContent className="p-4">
                        <h3 className="font-medium text-white mb-3">{category.category}</h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Total:</span>
                            <span className="text-xs font-medium text-white">{category.total}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Disponibles:</span>
                            <Badge className="bg-green-900/30 text-green-400">{category.available}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">En Mantenimiento:</span>
                            <Badge className="bg-amber-900/30 text-amber-400">{category.maintenance}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">En Uso:</span>
                            <Badge className="bg-blue-900/30 text-blue-400">{category.inUse}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-white mb-4">Equipos Críticos</h3>
                  <div className="space-y-3">
                    {[
                      {
                        name: "ERA-001",
                        type: "Equipo de Respiración Autónoma",
                        status: "Operativo",
                        lastCheck: "15/03/2024",
                        assignedTo: "Equipo Alpha",
                      },
                      {
                        name: "HYD-005",
                        type: "Separador Hidráulico",
                        status: "En Uso",
                        lastCheck: "12/03/2024",
                        assignedTo: "Equipo Bravo",
                      },
                      {
                        name: "TIC-002",
                        type: "Cámara Térmica",
                        status: "Mantenimiento",
                        lastCheck: "10/03/2024",
                        assignedTo: "Sin asignar",
                      },
                      {
                        name: "COM-015",
                        type: "Radio Portátil",
                        status: "Operativo",
                        lastCheck: "14/03/2024",
                        assignedTo: "Oficial de Guardia",
                      },
                    ].map((equipo, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center">
                          <div
                            className={`p-2 rounded-lg mr-4 ${
                              equipo.status === "Operativo"
                                ? "bg-green-900/30"
                                : equipo.status === "En Uso"
                                  ? "bg-blue-900/30"
                                  : "bg-amber-900/30"
                            }`}
                          >
                            <Tool
                              className={`h-5 w-5 ${
                                equipo.status === "Operativo"
                                  ? "text-green-400"
                                  : equipo.status === "En Uso"
                                    ? "text-blue-400"
                                    : "text-amber-400"
                              }`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center">
                              <h4 className="font-medium text-white">{equipo.name}</h4>
                              <Badge className="ml-2 text-xs py-0 h-5 px-1.5" variant="outline">
                                {equipo.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-gray-400">Último chequeo: {equipo.lastCheck}</span>
                              <span className="text-xs text-gray-400">Asignado: {equipo.assignedTo}</span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          className={`${
                            equipo.status === "Operativo"
                              ? "bg-green-900/30 text-green-400"
                              : equipo.status === "En Uso"
                                ? "bg-blue-900/30 text-blue-400"
                                : "bg-amber-900/30 text-amber-400"
                          }`}
                        >
                          {equipo.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="protocolos" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Protocolos Operativos</CardTitle>
              <CardDescription className="text-gray-400">Procedimientos y protocolos de emergencia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-750 rounded-lg flex items-center justify-center">
                <FileText className="h-24 w-24 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <SolicitudesPanel departamento="Área de Operaciones" />
    </div>
  )
}

