import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Wrench,
  PenToolIcon as Tool,
  ShoppingCart,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
} from "lucide-react"

import SolicitudesPanel from "@/components/solicitudes-panel"

export default function AreaServicios() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Área de Servicios</h1>
          <p className="text-gray-400">Gestión de mantenimiento y servicios generales</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Tool className="mr-2 h-4 w-4" />
            Solicitar Servicio
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Solicitar Compra
          </Button>
        </div>
      </div>

      <Tabs defaultValue="mantenimiento" className="w-full">
        <TabsList className="bg-gray-800 border-gray-700 w-full justify-start">
          <TabsTrigger value="mantenimiento" className="data-[state=active]:bg-red-600">
            Mantenimiento
          </TabsTrigger>
          <TabsTrigger value="compras" className="data-[state=active]:bg-red-600">
            Compras
          </TabsTrigger>
          <TabsTrigger value="almacen" className="data-[state=active]:bg-red-600">
            Almacén
          </TabsTrigger>
          <TabsTrigger value="servicios" className="data-[state=active]:bg-red-600">
            Servicios Generales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mantenimiento" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Órdenes de Mantenimiento</CardTitle>
                  <CardDescription className="text-gray-400">Solicitudes de mantenimiento y reparación</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        id: "OM-2024-045",
                        title: "Mantenimiento Autobomba B2",
                        description: "Revisión de sistema hidráulico y bomba",
                        requestedBy: "Cap. Juan Pérez",
                        date: "15/03/2024",
                        priority: "Alta",
                        status: "Programado",
                      },
                      {
                        id: "OM-2024-044",
                        title: "Reparación Equipo ERA",
                        description: "Falla en válvula de regulación",
                        requestedBy: "Tte. María García",
                        date: "14/03/2024",
                        priority: "Media",
                        status: "En Proceso",
                      },
                      {
                        id: "OM-2024-043",
                        title: "Mantenimiento Generador",
                        description: "Servicio preventivo y cambio de aceite",
                        requestedBy: "Sgto. Carlos López",
                        date: "12/03/2024",
                        priority: "Baja",
                        status: "Completado",
                      },
                      {
                        id: "OM-2024-042",
                        title: "Reparación Radio Portátil",
                        description: "No enciende, posible problema de batería",
                        requestedBy: "Ofl. Ana Martínez",
                        date: "10/03/2024",
                        priority: "Media",
                        status: "Completado",
                      },
                    ].map((orden, index) => (
                      <div key={index} className="p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                orden.status === "Completado"
                                  ? "bg-green-900/50"
                                  : orden.status === "En Proceso"
                                    ? "bg-blue-900/50"
                                    : "bg-amber-900/50"
                              }`}
                            >
                              <Wrench
                                className={`h-5 w-5 ${
                                  orden.status === "Completado"
                                    ? "text-green-400"
                                    : orden.status === "En Proceso"
                                      ? "text-blue-400"
                                      : "text-amber-400"
                                }`}
                              />
                            </div>
                            <div>
                              <div className="flex items-center">
                                <h3 className="font-medium text-white">{orden.title}</h3>
                                <Badge className="ml-2 text-xs py-0 h-5 px-1.5" variant="outline">
                                  {orden.id}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-400 mt-1">{orden.description}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs text-gray-500">Solicitado por: {orden.requestedBy}</span>
                                <span className="text-xs text-gray-500">Fecha: {orden.date}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge
                              className={`${
                                orden.priority === "Alta"
                                  ? "bg-red-900/50 text-red-400"
                                  : orden.priority === "Media"
                                    ? "bg-amber-900/50 text-amber-400"
                                    : "bg-blue-900/50 text-blue-400"
                              }`}
                            >
                              {orden.priority}
                            </Badge>
                            <Badge
                              className={`${
                                orden.status === "Completado"
                                  ? "bg-green-900/50 text-green-400"
                                  : orden.status === "En Proceso"
                                    ? "bg-blue-900/50 text-blue-400"
                                    : "bg-amber-900/50 text-amber-400"
                              }`}
                            >
                              {orden.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" className="bg-gray-700 hover:bg-gray-650 text-white">
                            Ver Detalles
                          </Button>
                          {orden.status !== "Completado" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-600 text-gray-300 hover:text-white"
                            >
                              Actualizar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Resumen de Mantenimiento</CardTitle>
                  <CardDescription className="text-gray-400">Estado de las órdenes de servicio</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Pendientes", value: 5, icon: Clock, color: "bg-amber-500" },
                        { label: "En Proceso", value: 3, icon: Tool, color: "bg-blue-500" },
                        { label: "Completadas", value: 12, icon: CheckCircle, color: "bg-green-500" },
                        { label: "Canceladas", value: 2, icon: XCircle, color: "bg-red-500" },
                      ].map((stat, index) => (
                        <Card key={index} className="bg-gray-750 border-gray-700">
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-12 h-12 rounded-full ${stat.color} flex items-center justify-center mb-2`}
                              >
                                <stat.icon className="h-6 w-6 text-white" />
                              </div>
                              <p className="text-2xl font-bold text-white">{stat.value}</p>
                              <p className="text-xs text-gray-400">{stat.label}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-300 mb-3">Próximos Mantenimientos</h3>
                      {[
                        {
                          item: "Autobomba B1",
                          type: "Preventivo",
                          date: "25/03/2024",
                          technician: "Tec. Roberto Gómez",
                        },
                        {
                          item: "Equipo Hidráulico",
                          type: "Preventivo",
                          date: "28/03/2024",
                          technician: "Tec. Laura Díaz",
                        },
                        {
                          item: "Generador Principal",
                          type: "Preventivo",
                          date: "01/04/2024",
                          technician: "Tec. Roberto Gómez",
                        },
                      ].map((mant, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-750 rounded-lg mb-2">
                          <div>
                            <p className="text-sm font-medium text-white">{mant.item}</p>
                            <div className="flex items-center mt-1">
                              <Calendar className="h-3 w-3 text-gray-500 mr-1" />
                              <span className="text-xs text-gray-400">{mant.date}</span>
                              <span className="text-xs text-gray-500 mx-2">•</span>
                              <span className="text-xs text-gray-400">{mant.technician}</span>
                            </div>
                          </div>
                          <Badge className="bg-blue-900/30 text-blue-400">{mant.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700 mt-6">
                <CardHeader>
                  <CardTitle className="text-white">Nueva Solicitud</CardTitle>
                  <CardDescription className="text-gray-400">Crear orden de mantenimiento</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                    <Tool className="mr-2 h-4 w-4" />
                    Solicitar Mantenimiento
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="compras" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Solicitudes de Compra</CardTitle>
              <CardDescription className="text-gray-400">Gestión de adquisiciones y compras</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    id: "SC-2024-028",
                    title: "Equipos de Protección Personal",
                    items: "10 trajes de aproximación, 15 cascos",
                    requestedBy: "Cap. Juan Pérez",
                    date: "15/03/2024",
                    status: "Aprobada",
                    amount: "$12,500",
                  },
                  {
                    id: "SC-2024-027",
                    title: "Repuestos Vehículos",
                    items: "Filtros, aceite, pastillas de freno",
                    requestedBy: "Tec. Roberto Gómez",
                    date: "12/03/2024",
                    status: "En Revisión",
                    amount: "$3,200",
                  },
                  {
                    id: "SC-2024-026",
                    title: "Material de Capacitación",
                    items: "Manuales, proyector, pantalla",
                    requestedBy: "Tte. María García",
                    date: "10/03/2024",
                    status: "Completada",
                    amount: "$2,800",
                  },
                ].map((solicitud, index) => (
                  <div key={index} className="p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            solicitud.status === "Completada"
                              ? "bg-green-900/50"
                              : solicitud.status === "Aprobada"
                                ? "bg-blue-900/50"
                                : "bg-amber-900/50"
                          }`}
                        >
                          <ShoppingCart
                            className={`h-5 w-5 ${
                              solicitud.status === "Completada"
                                ? "text-green-400"
                                : solicitud.status === "Aprobada"
                                  ? "text-blue-400"
                                  : "text-amber-400"
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center">
                            <h3 className="font-medium text-white">{solicitud.title}</h3>
                            <Badge className="ml-2 text-xs py-0 h-5 px-1.5" variant="outline">
                              {solicitud.id}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400 mt-1">{solicitud.items}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-500">Solicitado por: {solicitud.requestedBy}</span>
                            <span className="text-xs text-gray-500">Fecha: {solicitud.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-bold text-white">{solicitud.amount}</span>
                        <Badge
                          className={`${
                            solicitud.status === "Completada"
                              ? "bg-green-900/50 text-green-400"
                              : solicitud.status === "Aprobada"
                                ? "bg-blue-900/50 text-blue-400"
                                : "bg-amber-900/50 text-amber-400"
                          }`}
                        >
                          {solicitud.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="almacen" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Gestión de Almacén</CardTitle>
              <CardDescription className="text-gray-400">Inventario y control de suministros</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      category: "Equipos de Protección",
                      items: 120,
                      status: "Óptimo",
                      alert: false,
                    },
                    {
                      category: "Herramientas",
                      items: 85,
                      status: "Óptimo",
                      alert: false,
                    },
                    {
                      category: "Repuestos",
                      items: 45,
                      status: "Bajo",
                      alert: true,
                    },
                  ].map((categoria, index) => (
                    <Card
                      key={index}
                      className={`bg-gray-750 border-gray-700 ${
                        categoria.alert ? "border-l-4 border-l-amber-500" : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-white">{categoria.category}</h3>
                            <p className="text-sm text-gray-400 mt-1">{categoria.items} items</p>
                          </div>
                          <Badge
                            className={`${
                              categoria.status === "Óptimo"
                                ? "bg-green-900/30 text-green-400"
                                : "bg-amber-900/30 text-amber-400"
                            }`}
                          >
                            {categoria.status}
                          </Badge>
                        </div>
                        {categoria.alert && (
                          <div className="flex items-center mt-3 p-2 bg-amber-900/20 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-amber-400 mr-2" />
                            <span className="text-xs text-amber-400">Nivel bajo de inventario</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-white mb-4">Movimientos Recientes</h3>
                  <div className="space-y-3">
                    {[
                      {
                        type: "Entrada",
                        description: "Recepción de EPP",
                        quantity: "+15 items",
                        date: "15/03/2024",
                        user: "Tec. Laura Díaz",
                      },
                      {
                        type: "Salida",
                        description: "Entrega de herramientas",
                        quantity: "-8 items",
                        date: "14/03/2024",
                        user: "Cap. Juan Pérez",
                      },
                      {
                        type: "Entrada",
                        description: "Recepción de repuestos",
                        quantity: "+24 items",
                        date: "12/03/2024",
                        user: "Tec. Roberto Gómez",
                      },
                      {
                        type: "Salida",
                        description: "Entrega de EPP",
                        quantity: "-10 items",
                        date: "10/03/2024",
                        user: "Tte. María García",
                      },
                    ].map((movimiento, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center">
                          <div
                            className={`p-2 rounded-lg mr-4 ${
                              movimiento.type === "Entrada" ? "bg-green-900/30" : "bg-red-900/30"
                            }`}
                          >
                            {movimiento.type === "Entrada" ? (
                              <Package className="h-5 w-5 text-green-400" />
                            ) : (
                              <Truck className="h-5 w-5 text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{movimiento.description}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-gray-400">{movimiento.date}</span>
                              <span className="text-xs text-gray-400">{movimiento.user}</span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`font-medium ${movimiento.type === "Entrada" ? "text-green-400" : "text-red-400"}`}
                        >
                          {movimiento.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicios" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Servicios Generales</CardTitle>
              <CardDescription className="text-gray-400">Gestión de servicios e instalaciones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-750 rounded-lg flex items-center justify-center">
                <Wrench className="h-24 w-24 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SolicitudesPanel departamento="Área de Servicios" />
    </div>
  )
}

