"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Filter,
  RefreshCw,
  FileText,
  Truck,
  GraduationCap,
  ImageIcon,
  Users,
  Wrench,
  BarChart2,
} from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Definir tipos de solicitudes por departamento
const solicitudesPorDepartamento = {
  Dashboard: [
    {
      id: "SOL-2024-045",
      title: "Actualización de indicadores en dashboard",
      solicitante: "Cmdte. Roberto Sánchez",
      departamento: "Jefatura",
      fecha: "18/03/2024",
      prioridad: "Alta",
      estado: "Pendiente",
      descripcion:
        "Se requiere actualizar los indicadores del dashboard principal para incluir métricas de tiempo de respuesta por zona.",
    },
    {
      id: "SOL-2024-044",
      title: "Corrección de datos estadísticos",
      solicitante: "Cap. Juan Pérez",
      departamento: "Operaciones",
      fecha: "17/03/2024",
      prioridad: "Media",
      estado: "Pendiente",
      descripcion:
        "Los datos de emergencias atendidas del mes pasado presentan inconsistencias. Se requiere revisión y corrección.",
    },
    {
      id: "SOL-2024-042",
      title: "Integración de alertas en tiempo real",
      solicitante: "Tec. Laura Díaz",
      departamento: "Administración",
      fecha: "15/03/2024",
      prioridad: "Alta",
      estado: "En Proceso",
      asignado: "Ing. Carlos Mendoza",
      descripcion: "Implementar sistema de alertas en tiempo real para emergencias críticas en el dashboard principal.",
    },
  ],
  Jefatura: [
    {
      id: "SOL-2024-043",
      title: "Solicitud de revisión de protocolo",
      solicitante: "Sgto. Carlos López",
      departamento: "Operaciones",
      fecha: "16/03/2024",
      prioridad: "Alta",
      estado: "Pendiente",
      descripcion: "Se requiere revisión y aprobación del nuevo protocolo de respuesta a emergencias químicas.",
    },
    {
      id: "SOL-2024-041",
      title: "Autorización para capacitación externa",
      solicitante: "Tte. María García",
      departamento: "Instrucción",
      fecha: "14/03/2024",
      prioridad: "Media",
      estado: "Pendiente",
      descripcion:
        "Solicitud de autorización para asistir a capacitación internacional sobre rescate en estructuras colapsadas.",
    },
    {
      id: "SOL-2024-039",
      title: "Aprobación de presupuesto adicional",
      solicitante: "Ofl. Ana Martínez",
      departamento: "Administración",
      fecha: "10/03/2024",
      prioridad: "Alta",
      estado: "En Proceso",
      asignado: "Cmdte. Roberto Sánchez",
      descripcion: "Revisión y aprobación de presupuesto adicional para adquisición de equipos de protección personal.",
    },
  ],
  "Guardia Nocturna": [
    {
      id: "SOL-2024-038",
      title: "Mantenimiento de camas",
      solicitante: "Sgto. Carlos López",
      departamento: "Servicios",
      fecha: "09/03/2024",
      prioridad: "Media",
      estado: "Pendiente",
      descripcion: "Se requiere mantenimiento de las camas 6 y 8 por problemas en la estructura.",
    },
    {
      id: "SOL-2024-037",
      title: "Cambio en asignación de guardias",
      solicitante: "Tte. María García",
      departamento: "Operaciones",
      fecha: "08/03/2024",
      prioridad: "Baja",
      estado: "Pendiente",
      descripcion: "Solicitud de cambio en la asignación de guardias para el fin de semana del 20 al 22 de marzo.",
    },
    {
      id: "SOL-2024-036",
      title: "Reparación de iluminación",
      solicitante: "Bro. Roberto Gómez",
      departamento: "Guardia Nocturna",
      fecha: "07/03/2024",
      prioridad: "Media",
      estado: "En Proceso",
      asignado: "Tec. Laura Díaz",
      descripcion: "Reparación de sistema de iluminación en el área de descanso de guardia nocturna.",
    },
  ],
  "Área de Imagen": [
    {
      id: "SOL-2024-035",
      title: "Diseño de material para campaña",
      solicitante: "Cmdte. Roberto Sánchez",
      departamento: "Jefatura",
      fecha: "06/03/2024",
      prioridad: "Alta",
      estado: "Pendiente",
      descripcion: "Diseño de material gráfico para campaña de prevención de incendios en temporada seca.",
    },
    {
      id: "SOL-2024-034",
      title: "Actualización de fotografías institucionales",
      solicitante: "Cap. Juan Pérez",
      departamento: "Administración",
      fecha: "05/03/2024",
      prioridad: "Media",
      estado: "Pendiente",
      descripcion: "Se requiere actualizar las fotografías institucionales del personal para credenciales y sitio web.",
    },
    {
      id: "SOL-2024-033",
      title: "Edición de video de capacitación",
      solicitante: "Tte. María García",
      departamento: "Instrucción",
      fecha: "04/03/2024",
      prioridad: "Media",
      estado: "En Proceso",
      asignado: "Dis. Pedro Ramírez",
      descripcion: "Edición de video instructivo sobre uso de equipos de respiración autónoma.",
    },
  ],
  "Área de Administración": [
    {
      id: "SOL-2024-032",
      title: "Actualización de inventario",
      solicitante: "Sgto. Carlos López",
      departamento: "Operaciones",
      fecha: "03/03/2024",
      prioridad: "Alta",
      estado: "Pendiente",
      descripcion: "Se requiere actualización urgente del inventario de equipos de protección personal.",
    },
    {
      id: "SOL-2024-031",
      title: "Gestión de viáticos",
      solicitante: "Tte. María García",
      departamento: "Instrucción",
      fecha: "02/03/2024",
      prioridad: "Media",
      estado: "Pendiente",
      descripcion: "Procesamiento de viáticos para personal que asistirá a capacitación en ciudad vecina.",
    },
    {
      id: "SOL-2024-030",
      title: "Revisión de contratos de servicios",
      solicitante: "Cmdte. Roberto Sánchez",
      departamento: "Jefatura",
      fecha: "01/03/2024",
      prioridad: "Media",
      estado: "En Proceso",
      asignado: "Lic. Ana Martínez",
      descripcion: "Revisión y actualización de contratos de servicios de mantenimiento de vehículos.",
    },
  ],
  "Área de Operaciones": [
    {
      id: "SOL-2024-029",
      title: "Mantenimiento de vehículo B2",
      solicitante: "Cap. Juan Pérez",
      departamento: "Operaciones",
      fecha: "28/02/2024",
      prioridad: "Alta",
      estado: "Pendiente",
      descripcion:
        "Solicitud de mantenimiento preventivo para autobomba B2 antes de temporada de incendios forestales.",
    },
    {
      id: "SOL-2024-028",
      title: "Reposición de equipos ERA",
      solicitante: "Sgto. Carlos López",
      departamento: "Operaciones",
      fecha: "27/02/2024",
      prioridad: "Alta",
      estado: "Pendiente",
      descripcion: "Reposición urgente de 3 equipos de respiración autónoma dañados en última emergencia.",
    },
    {
      id: "SOL-2024-027",
      title: "Actualización de protocolos",
      solicitante: "Cmdte. Roberto Sánchez",
      departamento: "Jefatura",
      fecha: "26/02/2024",
      prioridad: "Media",
      estado: "En Proceso",
      asignado: "Cap. Juan Pérez",
      descripcion: "Actualización de protocolos de respuesta a emergencias con materiales peligrosos.",
    },
  ],
  Instrucción: [
    {
      id: "SOL-2024-026",
      title: "Solicitud de material didáctico",
      solicitante: "Tte. María García",
      departamento: "Instrucción",
      fecha: "25/02/2024",
      prioridad: "Media",
      estado: "Pendiente",
      descripcion: "Adquisición de material didáctico para curso de primeros auxilios avanzados.",
    },
    {
      id: "SOL-2024-025",
      title: "Programación de simulacro",
      solicitante: "Cap. Juan Pérez",
      departamento: "Operaciones",
      fecha: "24/02/2024",
      prioridad: "Alta",
      estado: "Pendiente",
      descripcion: "Programación de simulacro de rescate vehicular para personal de guardia.",
    },
    {
      id: "SOL-2024-024",
      title: "Actualización de manuales",
      solicitante: "Cmdte. Roberto Sánchez",
      departamento: "Jefatura",
      fecha: "23/02/2024",
      prioridad: "Baja",
      estado: "En Proceso",
      asignado: "Tte. María García",
      descripcion: "Actualización de manuales de procedimientos operativos estándar.",
    },
  ],
  "Área de Servicios": [
    {
      id: "SOL-2024-023",
      title: "Reparación de generador",
      solicitante: "Sgto. Carlos López",
      departamento: "Operaciones",
      fecha: "22/02/2024",
      prioridad: "Alta",
      estado: "Pendiente",
      descripcion: "Reparación urgente del generador principal de la estación central.",
    },
    {
      id: "SOL-2024-022",
      title: "Mantenimiento de aires acondicionados",
      solicitante: "Ofl. Ana Martínez",
      departamento: "Administración",
      fecha: "21/02/2024",
      prioridad: "Media",
      estado: "Pendiente",
      descripcion: "Mantenimiento preventivo de sistemas de aire acondicionado en oficinas administrativas.",
    },
    {
      id: "SOL-2024-021",
      title: "Reparación de sistema hidráulico",
      solicitante: "Cap. Juan Pérez",
      departamento: "Operaciones",
      fecha: "20/02/2024",
      prioridad: "Alta",
      estado: "En Proceso",
      asignado: "Tec. Roberto Gómez",
      descripcion: "Reparación de sistema hidráulico de herramientas de rescate vehicular.",
    },
  ],
  Estadísticas: [
    {
      id: "SOL-2024-020",
      title: "Informe estadístico mensual",
      solicitante: "Cmdte. Roberto Sánchez",
      departamento: "Jefatura",
      fecha: "19/02/2024",
      prioridad: "Media",
      estado: "Pendiente",
      descripcion:
        "Elaboración de informe estadístico mensual de emergencias atendidas para presentación a autoridades.",
    },
    {
      id: "SOL-2024-019",
      title: "Análisis de tiempos de respuesta",
      solicitante: "Cap. Juan Pérez",
      departamento: "Operaciones",
      fecha: "18/02/2024",
      prioridad: "Alta",
      estado: "Pendiente",
      descripcion: "Análisis detallado de tiempos de respuesta por tipo de emergencia y zona geográfica.",
    },
    {
      id: "SOL-2024-018",
      title: "Actualización de dashboard operativo",
      solicitante: "Tte. María García",
      departamento: "Instrucción",
      fecha: "17/02/2024",
      prioridad: "Media",
      estado: "En Proceso",
      asignado: "Ing. Carlos Mendoza",
      descripcion: "Actualización de dashboard operativo con nuevos indicadores de desempeño.",
    },
  ],
}

// Solicitudes en proceso y completadas (comunes para todos los departamentos)
const solicitudesEnProceso = [
  {
    id: "SOL-2024-017",
    title: "Actualización de protocolos de seguridad",
    solicitante: "Cmdte. Roberto Sánchez",
    departamento: "Jefatura",
    fecha: "16/02/2024",
    prioridad: "Alta",
    estado: "En Proceso",
    asignado: "Cap. Juan Pérez",
    descripcion: "Revisión y actualización de protocolos de seguridad para operaciones de alto riesgo.",
  },
  {
    id: "SOL-2024-016",
    title: "Mantenimiento de equipos de comunicación",
    solicitante: "Sgto. Carlos López",
    departamento: "Operaciones",
    fecha: "15/02/2024",
    prioridad: "Media",
    estado: "En Proceso",
    asignado: "Tec. Roberto Gómez",
    descripcion: "Mantenimiento preventivo de equipos de comunicación portátiles.",
  },
]

const solicitudesCompletadas = [
  {
    id: "SOL-2024-015",
    title: "Reparación de sistema eléctrico",
    solicitante: "Ofl. Ana Martínez",
    departamento: "Administración",
    fecha: "14/02/2024",
    completado: "16/02/2024",
    prioridad: "Alta",
    estado: "Completada",
    descripcion: "Reparación de sistema eléctrico en área de estacionamiento de vehículos.",
  },
  {
    id: "SOL-2024-014",
    title: "Actualización de inventario de EPP",
    solicitante: "Tte. María García",
    departamento: "Operaciones",
    fecha: "13/02/2024",
    completado: "15/02/2024",
    prioridad: "Media",
    estado: "Completada",
    descripcion: "Actualización completa del inventario de equipos de protección personal.",
  },
]

// Iconos por departamento
const iconosPorDepartamento = {
  Dashboard: BarChart2,
  Jefatura: Users,
  "Guardia Nocturna": Clock,
  "Área de Imagen": ImageIcon,
  "Área de Administración": FileText,
  "Área de Operaciones": Truck,
  Instrucción: GraduationCap,
  "Área de Servicios": Wrench,
  Estadísticas: BarChart2,
}

interface SolicitudesPanelProps {
  departamento: string
}

export default function SolicitudesPanel({ departamento }: SolicitudesPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null)
  const [nuevaSolicitud, setNuevaSolicitud] = useState({
    titulo: "",
    descripcion: "",
    prioridad: "Media",
  })

  // Obtener el icono correspondiente al departamento
  const DepartmentIcon = iconosPorDepartamento[departamento] || MessageSquare

  // Obtener las solicitudes específicas para este departamento
  const solicitudesPendientes = solicitudesPorDepartamento[departamento] || []

  const verDetalles = (solicitud: any) => {
    setSolicitudSeleccionada(solicitud)
    setIsDialogOpen(true)
  }

  const handleNuevaSolicitud = () => {
    // Simulamos la creación de una nueva solicitud
    alert(`Nueva solicitud creada: ${nuevaSolicitud.titulo}`)
    setNuevaSolicitud({
      titulo: "",
      descripcion: "",
      prioridad: "Media",
    })
  }

  return (
    <Card className="bg-gray-800 border-gray-700 mt-6">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-2 gap-4">
        <div className="space-y-1">
          <CardTitle className="text-white flex items-center gap-2">
            <DepartmentIcon className="h-5 w-5 text-red-400" />
            Solicitudes y Requerimientos
          </CardTitle>
          <CardDescription className="text-gray-400">
            Gestión de solicitudes para el área de {departamento}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Nueva Solicitud</span>
                <span className="sm:hidden">Nueva</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 text-white border-gray-700">
              <DialogHeader>
                <DialogTitle>Nueva Solicitud</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Complete los detalles para crear una nueva solicitud.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    placeholder="Título de la solicitud"
                    className="bg-gray-750 border-gray-700 text-white"
                    value={nuevaSolicitud.titulo}
                    onChange={(e) => setNuevaSolicitud({ ...nuevaSolicitud, titulo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Describa su solicitud en detalle"
                    className="bg-gray-750 border-gray-700 text-white min-h-[100px]"
                    value={nuevaSolicitud.descripcion}
                    onChange={(e) => setNuevaSolicitud({ ...nuevaSolicitud, descripcion: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prioridad">Prioridad</Label>
                  <Select
                    value={nuevaSolicitud.prioridad}
                    onValueChange={(value) => setNuevaSolicitud({ ...nuevaSolicitud, prioridad: value })}
                  >
                    <SelectTrigger className="bg-gray-750 border-gray-700 text-white">
                      <SelectValue placeholder="Seleccione la prioridad" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Media">Media</SelectItem>
                      <SelectItem value="Baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleNuevaSolicitud}>
                  Crear Solicitud
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button size="sm" variant="outline" className="border-gray-700 text-gray-300 hover:text-white">
            <Filter className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Filtrar</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pendientes" className="w-full">
          <TabsList className="bg-gray-750 border-gray-700 w-full justify-start mb-4 overflow-x-auto flex-nowrap">
            <TabsTrigger value="pendientes" className="data-[state=active]:bg-red-600">
              Pendientes
            </TabsTrigger>
            <TabsTrigger value="en-proceso" className="data-[state=active]:bg-red-600">
              En Proceso
            </TabsTrigger>
            <TabsTrigger value="completadas" className="data-[state=active]:bg-red-600">
              Completadas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendientes">
            <div className="space-y-3">
              {solicitudesPendientes
                .filter((s) => s.estado === "Pendiente")
                .map((solicitud, index) => (
                  <div key={index} className="p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            solicitud.prioridad === "Alta"
                              ? "bg-red-900/50"
                              : solicitud.prioridad === "Media"
                                ? "bg-amber-900/50"
                                : "bg-blue-900/50"
                          }`}
                        >
                          <MessageSquare
                            className={`h-5 w-5 ${
                              solicitud.prioridad === "Alta"
                                ? "text-red-400"
                                : solicitud.prioridad === "Media"
                                  ? "text-amber-400"
                                  : "text-blue-400"
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <h3 className="font-medium text-white">{solicitud.title}</h3>
                            <Badge className="text-xs py-0 h-5 px-1.5" variant="outline">
                              {solicitud.id}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                            <span className="text-gray-400">De: {solicitud.solicitante}</span>
                            <span className="text-gray-400 hidden sm:inline">•</span>
                            <span className="text-gray-400">Área: {solicitud.departamento}</span>
                            <span className="text-gray-400 hidden sm:inline">•</span>
                            <span className="text-gray-400">Fecha: {solicitud.fecha}</span>
                          </div>
                        </div>
                      </div>
                      <Badge
                        className={`${
                          solicitud.prioridad === "Alta"
                            ? "bg-red-900/50 text-red-400"
                            : solicitud.prioridad === "Media"
                              ? "bg-amber-900/50 text-amber-400"
                              : "bg-blue-900/50 text-blue-400"
                        } self-start md:self-auto`}
                      >
                        {solicitud.prioridad}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                        Atender
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:text-white"
                        onClick={() => verDetalles(solicitud)}
                      >
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                ))}
              {solicitudesPendientes.filter((s) => s.estado === "Pendiente").length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No hay solicitudes pendientes</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="en-proceso">
            <div className="space-y-3">
              {[...solicitudesPendientes.filter((s) => s.estado === "En Proceso"), ...solicitudesEnProceso].map(
                (solicitud, index) => (
                  <div key={index} className="p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-900/50">
                          <Clock className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <h3 className="font-medium text-white">{solicitud.title}</h3>
                            <Badge className="text-xs py-0 h-5 px-1.5" variant="outline">
                              {solicitud.id}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                            <span className="text-gray-400">De: {solicitud.solicitante}</span>
                            <span className="text-gray-400 hidden sm:inline">•</span>
                            <span className="text-gray-400">Área: {solicitud.departamento}</span>
                            <span className="text-gray-400 hidden sm:inline">•</span>
                            <span className="text-gray-400">Asignado: {solicitud.asignado}</span>
                          </div>
                        </div>
                      </div>
                      <Badge
                        className={`${
                          solicitud.prioridad === "Alta"
                            ? "bg-red-900/50 text-red-400"
                            : "bg-amber-900/50 text-amber-400"
                        } self-start md:self-auto`}
                      >
                        {solicitud.prioridad}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Completar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:text-white"
                        onClick={() => verDetalles(solicitud)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Actualizar
                      </Button>
                    </div>
                  </div>
                ),
              )}
              {[...solicitudesPendientes.filter((s) => s.estado === "En Proceso"), ...solicitudesEnProceso].length ===
                0 && (
                <div className="p-8 text-center text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>No hay solicitudes en proceso</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completadas">
            <div className="space-y-3">
              {[...solicitudesPendientes.filter((s) => s.estado === "Completada"), ...solicitudesCompletadas].map(
                (solicitud, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-green-900/50">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <div className="flex items-center flex-wrap gap-2">
                          <h3 className="font-medium text-white">{solicitud.title}</h3>
                          <Badge className="text-xs py-0 h-5 px-1.5" variant="outline">
                            {solicitud.id}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                          <span className="text-gray-400">De: {solicitud.solicitante}</span>
                          <span className="text-gray-400 hidden sm:inline">•</span>
                          <span className="text-gray-400">Completado: {solicitud.completado}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-900/50 text-green-400">Completada</Badge>
                  </div>
                ),
              )}
              {[...solicitudesPendientes.filter((s) => s.estado === "Completada"), ...solicitudesCompletadas].length ===
                0 && (
                <div className="p-8 text-center text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No hay solicitudes completadas</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Diálogo de detalles de solicitud */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle>Detalles de Solicitud</DialogTitle>
            <DialogDescription className="text-gray-400">{solicitudSeleccionada?.id}</DialogDescription>
          </DialogHeader>
          {solicitudSeleccionada && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-white">{solicitudSeleccionada.title}</h3>
                <Badge
                  className={`${
                    solicitudSeleccionada.prioridad === "Alta"
                      ? "bg-red-900/50 text-red-400"
                      : solicitudSeleccionada.prioridad === "Media"
                        ? "bg-amber-900/50 text-amber-400"
                        : "bg-blue-900/50 text-blue-400"
                  }`}
                >
                  {solicitudSeleccionada.prioridad}
                </Badge>
                <Badge
                  className={`ml-2 ${
                    solicitudSeleccionada.estado === "Pendiente"
                      ? "bg-amber-900/50 text-amber-400"
                      : solicitudSeleccionada.estado === "En Proceso"
                        ? "bg-blue-900/50 text-blue-400"
                        : "bg-green-900/50 text-green-400"
                  }`}
                >
                  {solicitudSeleccionada.estado}
                </Badge>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-400">Descripción</Label>
                <div className="p-3 bg-gray-750 rounded-lg text-white">{solicitudSeleccionada.descripcion}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-gray-400">Solicitante</Label>
                  <div className="p-2 bg-gray-750 rounded-lg text-white text-sm">
                    {solicitudSeleccionada.solicitante}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Departamento</Label>
                  <div className="p-2 bg-gray-750 rounded-lg text-white text-sm">
                    {solicitudSeleccionada.departamento}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Fecha</Label>
                  <div className="p-2 bg-gray-750 rounded-lg text-white text-sm">{solicitudSeleccionada.fecha}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">
                    {solicitudSeleccionada.estado === "Completada" ? "Completado" : "Asignado"}
                  </Label>
                  <div className="p-2 bg-gray-750 rounded-lg text-white text-sm">
                    {solicitudSeleccionada.estado === "Completada"
                      ? solicitudSeleccionada.completado
                      : solicitudSeleccionada.asignado || "Sin asignar"}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {solicitudSeleccionada?.estado === "Pendiente" && (
              <Button className="bg-red-600 hover:bg-red-700 text-white">Atender Solicitud</Button>
            )}
            {solicitudSeleccionada?.estado === "En Proceso" && (
              <Button className="bg-green-600 hover:bg-green-700 text-white">Marcar como Completada</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

