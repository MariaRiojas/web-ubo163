import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart2,
  Users,
  Truck,
  Bell,
  Calendar,
  Clock,
  Flame,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  XCircle,
  FileText,
  Activity,
} from "lucide-react"
import SolicitudesPanel from "@/components/solicitudes-panel"

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-gray-400">Bienvenido al sistema de gestión interna</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Bell className="mr-2 h-4 w-4" />
            Alertas
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800">
            <Calendar className="mr-2 h-4 w-4" />
            Calendario
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Personal Activo",
            value: "42",
            change: "+2",
            icon: Users,
            color: "bg-blue-500",
          },
          {
            title: "Emergencias Hoy",
            value: "3",
            change: "-1",
            icon: Flame,
            color: "bg-red-500",
          },
          {
            title: "Vehículos Operativos",
            value: "8/10",
            change: "80%",
            icon: Truck,
            color: "bg-green-500",
          },
          {
            title: "Tiempo Respuesta",
            value: "4.2 min",
            change: "-0.3",
            icon: Clock,
            color: "bg-amber-500",
          },
        ].map((stat, index) => (
          <Card key={index} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                  <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Badge variant="outline" className="text-green-400 border-green-800 bg-green-900/20">
                  {stat.change}
                </Badge>
                <span className="ml-2 text-gray-400">vs. semana anterior</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Actividad Reciente</CardTitle>
                <Tabs defaultValue="emergencias">
                  <TabsList className="bg-gray-700">
                    <TabsTrigger value="emergencias" className="data-[state=active]:bg-red-600">
                      Emergencias
                    </TabsTrigger>
                    <TabsTrigger value="guardias" className="data-[state=active]:bg-red-600">
                      Guardias
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <CardDescription className="text-gray-400">Últimas actividades registradas en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: "Incendio Estructural",
                    description: "Av. Principal 123 - Edificio Comercial",
                    time: "Hoy, 14:30",
                    status: "Completado",
                    statusColor: "text-green-400",
                  },
                  {
                    title: "Rescate Vehicular",
                    description: "Carretera Norte Km 5 - Colisión múltiple",
                    time: "Hoy, 10:15",
                    status: "Completado",
                    statusColor: "text-green-400",
                  },
                  {
                    title: "Emergencia Médica",
                    description: "Plaza Central - Persona con paro cardíaco",
                    time: "Ayer, 18:45",
                    status: "Completado",
                    statusColor: "text-green-400",
                  },
                  {
                    title: "Fuga de Gas",
                    description: "Calle Secundaria 45 - Edificio Residencial",
                    time: "Ayer, 12:20",
                    status: "Completado",
                    statusColor: "text-green-400",
                  },
                ].map((activity, index) => (
                  <div key={index} className="flex items-start p-3 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="p-2 bg-red-900/50 rounded-lg mr-4">
                      <Flame className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-white">{activity.title}</h4>
                        <span className={`text-xs font-medium ${activity.statusColor}`}>{activity.status}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{activity.description}</p>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {activity.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-gray-400 hover:text-white hover:bg-gray-700">
                Ver todas las actividades
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Guardia Nocturna</CardTitle>
              <CardDescription className="text-gray-400">Reserva de camas para la guardia de hoy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { number: 1, status: "ocupada", name: "Juan Pérez" },
                  { number: 2, status: "ocupada", name: "María García" },
                  { number: 3, status: "disponible", name: null },
                  { number: 4, status: "disponible", name: null },
                  { number: 5, status: "ocupada", name: "Carlos López" },
                  { number: 6, status: "mantenimiento", name: null },
                  { number: 7, status: "disponible", name: null },
                  { number: 8, status: "ocupada", name: "Ana Martínez" },
                ].map((cama) => (
                  <div
                    key={cama.number}
                    className={`p-4 rounded-lg border ${
                      cama.status === "ocupada"
                        ? "bg-red-900/30 border-red-800"
                        : cama.status === "disponible"
                          ? "bg-green-900/30 border-green-800"
                          : "bg-gray-700 border-gray-600"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-white">Cama {cama.number}</span>
                      {cama.status === "ocupada" && <XCircle className="h-4 w-4 text-red-400" />}
                      {cama.status === "disponible" && <CheckCircle className="h-4 w-4 text-green-400" />}
                      {cama.status === "mantenimiento" && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                    </div>
                    <p className="text-xs text-gray-300">
                      {cama.status === "ocupada"
                        ? cama.name
                        : cama.status === "disponible"
                          ? "Disponible"
                          : "En mantenimiento"}
                    </p>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-6 bg-red-600 hover:bg-red-700">Reservar Cama</Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Alertas Pendientes</CardTitle>
              <CardDescription className="text-gray-400">Notificaciones que requieren atención</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: "Mantenimiento Vehículo B2",
                    description: "Programado para mañana 09:00",
                    icon: Truck,
                    color: "bg-amber-500",
                  },
                  {
                    title: "Actualización Protocolo",
                    description: "Nuevas directrices operativas",
                    icon: FileText,
                    color: "bg-blue-500",
                  },
                  {
                    title: "Inspección Equipos",
                    description: "Pendiente verificación ERA",
                    icon: AlertTriangle,
                    color: "bg-red-500",
                  },
                ].map((alerta, index) => (
                  <div
                    key={index}
                    className="flex items-start p-3 rounded-lg bg-gray-750 hover:bg-gray-700 transition-colors"
                  >
                    <div className={`p-2 rounded-lg mr-3 ${alerta.color}`}>
                      <alerta.icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white text-sm">{alerta.title}</h4>
                      <p className="text-xs text-gray-400 mt-1">{alerta.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Estadísticas Mensuales</CardTitle>
              <CardDescription className="text-gray-400">Resumen de actividad del mes actual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: "Emergencias Atendidas", value: 28, icon: Flame, color: "text-red-400" },
                  { label: "Personal en Guardia", value: 45, icon: Users, color: "text-blue-400" },
                  { label: "Capacitaciones", value: 12, icon: Activity, color: "text-green-400" },
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
              <div className="h-40 mt-6 flex items-center justify-center bg-gray-750 rounded-lg">
                <BarChart2 className="h-24 w-24 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <SolicitudesPanel departamento="Dashboard" />
    </div>
  )
}

