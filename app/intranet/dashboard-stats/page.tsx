import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  BarChart2,
  PieChart,
  LineChart,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  Flame,
  Clock,
  Users,
  Truck,
  FileText,
} from "lucide-react"
import SolicitudesPanel from "@/components/solicitudes-panel"

export default function DashboardStats() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Dashboard Estadístico</h1>
          <p className="text-gray-400">Análisis y métricas operativas</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Download className="mr-2 h-4 w-4" />
            Exportar Datos
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800">
            <Filter className="mr-2 h-4 w-4" />
            Filtrar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Emergencias",
            value: "128",
            change: "+12%",
            period: "vs. mes anterior",
            icon: Flame,
            color: "bg-red-500",
          },
          {
            title: "Tiempo Respuesta",
            value: "4.2 min",
            change: "-8%",
            period: "vs. mes anterior",
            icon: Clock,
            color: "bg-green-500",
          },
          {
            title: "Personal Activo",
            value: "42",
            change: "+5%",
            period: "vs. mes anterior",
            icon: Users,
            color: "bg-blue-500",
          },
          {
            title: "Vehículos Operativos",
            value: "8/10",
            change: "80%",
            period: "de disponibilidad",
            icon: Truck,
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
                <span className="ml-2 text-gray-400">{stat.period}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="emergencias" className="w-full">
        <TabsList className="bg-gray-800 border-gray-700 w-full justify-start">
          <TabsTrigger value="emergencias" className="data-[state=active]:bg-red-600">
            Emergencias
          </TabsTrigger>
          <TabsTrigger value="operaciones" className="data-[state=active]:bg-red-600">
            Operaciones
          </TabsTrigger>
          <TabsTrigger value="personal" className="data-[state=active]:bg-red-600">
            Personal
          </TabsTrigger>
          <TabsTrigger value="recursos" className="data-[state=active]:bg-red-600">
            Recursos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emergencias" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-white">Emergencias por Tipo</CardTitle>
                    <CardDescription className="text-gray-400">Distribución de emergencias atendidas</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 border-gray-700 text-gray-300 hover:text-white">
                      <Calendar className="mr-2 h-4 w-4" />
                      Marzo 2024
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-gray-750 rounded-lg flex items-center justify-center">
                    <BarChart2 className="h-24 w-24 text-gray-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700 mt-6">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-white">Tiempo de Respuesta</CardTitle>
                    <CardDescription className="text-gray-400">Evolución del tiempo de respuesta</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-gray-750 rounded-lg flex items-center justify-center">
                    <LineChart className="h-24 w-24 text-gray-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Distribución por Zona</CardTitle>
                  <CardDescription className="text-gray-400">Emergencias por ubicación geográfica</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-750 rounded-lg flex items-center justify-center mb-4">
                    <PieChart className="h-16 w-16 text-gray-600" />
                  </div>

                  <div className="space-y-4">
                    {[
                      { zone: "Zona Norte", percentage: 35, color: "bg-red-500" },
                      { zone: "Zona Centro", percentage: 25, color: "bg-blue-500" },
                      { zone: "Zona Sur", percentage: 20, color: "bg-green-500" },
                      { zone: "Zona Este", percentage: 15, color: "bg-amber-500" },
                      { zone: "Zona Oeste", percentage: 5, color: "bg-purple-500" },
                    ].map((zone, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-300">{zone.zone}</span>
                          <span className="text-sm font-bold text-white">{zone.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${zone.color}`}
                            style={{ width: `${zone.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Tendencias</CardTitle>
                  <CardDescription className="text-gray-400">Análisis de tendencias de emergencias</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        title: "Incendios Estructurales",
                        change: "+8%",
                        trend: "up",
                        description: "Aumento en zonas residenciales",
                      },
                      {
                        title: "Accidentes Vehiculares",
                        change: "-5%",
                        trend: "down",
                        description: "Disminución en vías principales",
                      },
                      {
                        title: "Emergencias Médicas",
                        change: "+12%",
                        trend: "up",
                        description: "Incremento significativo",
                      },
                    ].map((trend, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-750 rounded-lg">
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-medium text-white">{trend.title}</h4>
                            <Badge
                              className={`ml-2 ${
                                trend.trend === "up" ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400"
                              }`}
                            >
                              {trend.change}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{trend.description}</p>
                        </div>
                        <TrendingUp className={`h-5 w-5 ${trend.trend === "up" ? "text-red-400" : "text-green-400"}`} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="operaciones" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Estadísticas Operativas</CardTitle>
              <CardDescription className="text-gray-400">Análisis de operaciones y despliegues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-750 rounded-lg flex items-center justify-center">
                <FileText className="h-24 w-24 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Estadísticas de Personal</CardTitle>
              <CardDescription className="text-gray-400">Análisis de recursos humanos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-750 rounded-lg flex items-center justify-center">
                <Users className="h-24 w-24 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recursos" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Estadísticas de Recursos</CardTitle>
              <CardDescription className="text-gray-400">Análisis de equipamiento y vehículos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-750 rounded-lg flex items-center justify-center">
                <Truck className="h-24 w-24 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <SolicitudesPanel departamento="Estadísticas" />
    </div>
  )
}

