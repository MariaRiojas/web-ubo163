import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Shield, FileText, ClipboardCheck, Calendar, MessageSquare, Award, Star, ChevronRight } from "lucide-react"
import Image from "next/image"
import SolicitudesPanel from "@/components/solicitudes-panel"

export default function Jefatura() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Jefatura</h1>
          <p className="text-gray-400">Gestión de mando y dirección institucional</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <FileText className="mr-2 h-4 w-4" />
            Nuevo Comunicado
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800">
            <Calendar className="mr-2 h-4 w-4" />
            Agendar Reunión
          </Button>
        </div>
      </div>

      <Tabs defaultValue="directiva" className="w-full">
        <TabsList className="bg-gray-800 border-gray-700 w-full justify-start">
          <TabsTrigger value="directiva" className="data-[state=active]:bg-red-600">
            Directiva
          </TabsTrigger>
          <TabsTrigger value="comunicados" className="data-[state=active]:bg-red-600">
            Comunicados
          </TabsTrigger>
          <TabsTrigger value="reuniones" className="data-[state=active]:bg-red-600">
            Reuniones
          </TabsTrigger>
          <TabsTrigger value="proyectos" className="data-[state=active]:bg-red-600">
            Proyectos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directiva" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Estructura de Mando</CardTitle>
                  <CardDescription className="text-gray-400">Organigrama y jerarquía institucional</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      {
                        name: "Cmdte. Roberto Sánchez",
                        position: "Comandante General",
                        image: "/placeholder.svg?height=100&width=100",
                        stars: 5,
                        contact: "comandante@bomberos.com",
                      },
                      {
                        name: "Subcmdte. María García",
                        position: "Subcomandante",
                        image: "/placeholder.svg?height=100&width=100",
                        stars: 4,
                        contact: "subcomandante@bomberos.com",
                      },
                      {
                        name: "Insp. Juan Pérez",
                        position: "Inspector General",
                        image: "/placeholder.svg?height=100&width=100",
                        stars: 3,
                        contact: "inspector@bomberos.com",
                      },
                      {
                        name: "Cap. Ana Martínez",
                        position: "Capitán de Guardia",
                        image: "/placeholder.svg?height=100&width=100",
                        stars: 3,
                        contact: "capitan@bomberos.com",
                      },
                    ].map((oficial, index) => (
                      <Card
                        key={index}
                        className="bg-gray-750 border-gray-700 hover:bg-gray-700 transition-all duration-300 transform hover:scale-105"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Image
                                src={oficial.image || "/placeholder.svg"}
                                alt={oficial.name}
                                width={80}
                                height={80}
                                className="rounded-full border-2 border-red-600"
                              />
                              <div className="absolute -bottom-2 -right-2 bg-red-600 rounded-full p-1">
                                <Shield className="h-4 w-4 text-white" />
                              </div>
                            </div>
                            <div>
                              <h3 className="font-bold text-white">{oficial.name}</h3>
                              <p className="text-sm text-gray-400">{oficial.position}</p>
                              <div className="flex mt-1">
                                {Array.from({ length: oficial.stars }).map((_, i) => (
                                  <Star key={i} className="h-4 w-4 text-amber-400" />
                                ))}
                              </div>
                              <p className="text-xs text-gray-500 mt-2">{oficial.contact}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Indicadores de Gestión</CardTitle>
                  <CardDescription className="text-gray-400">Métricas de desempeño institucional</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {[
                      { label: "Tiempo de Respuesta", value: 85, color: "bg-green-500" },
                      { label: "Capacitación", value: 92, color: "bg-blue-500" },
                      { label: "Operatividad", value: 78, color: "bg-amber-500" },
                      { label: "Satisfacción", value: 95, color: "bg-red-500" },
                    ].map((metric, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-300">{metric.label}</span>
                          <span className="text-sm font-bold text-white">{metric.value}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${metric.color}`}
                            style={{ width: `${metric.value}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}

                    <Button className="w-full mt-4 bg-gray-700 hover:bg-gray-650 text-white">
                      Ver Informe Completo
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700 mt-6">
                <CardHeader>
                  <CardTitle className="text-white">Reconocimientos</CardTitle>
                  <CardDescription className="text-gray-400">Logros y distinciones institucionales</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { title: "Excelencia Operativa", year: "2023", issuer: "Ministerio de Interior" },
                      { title: "Servicio Comunitario", year: "2022", issuer: "Gobierno Municipal" },
                      { title: "Innovación en Rescate", year: "2021", issuer: "Asociación Internacional" },
                    ].map((award, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-750 rounded-lg">
                        <Award className="h-8 w-8 text-amber-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-white text-sm">{award.title}</p>
                          <p className="text-xs text-gray-400">
                            {award.year} - {award.issuer}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comunicados" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Comunicados Oficiales</CardTitle>
              <CardDescription className="text-gray-400">Comunicaciones emitidas por la jefatura</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: "Actualización de Protocolos de Emergencia",
                    date: "15/03/2024",
                    author: "Cmdte. Roberto Sánchez",
                    priority: "Alta",
                  },
                  {
                    title: "Calendario de Capacitaciones Q2",
                    date: "10/03/2024",
                    author: "Insp. Juan Pérez",
                    priority: "Media",
                  },
                  {
                    title: "Reconocimiento al Personal Destacado",
                    date: "05/03/2024",
                    author: "Subcmdte. María García",
                    priority: "Normal",
                  },
                  {
                    title: "Adquisición de Nuevos Equipos",
                    date: "01/03/2024",
                    author: "Cmdte. Roberto Sánchez",
                    priority: "Alta",
                  },
                ].map((comunicado, index) => (
                  <div key={index} className="p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            comunicado.priority === "Alta"
                              ? "bg-red-900/50"
                              : comunicado.priority === "Media"
                                ? "bg-amber-900/50"
                                : "bg-blue-900/50"
                          }`}
                        >
                          <MessageSquare
                            className={`h-5 w-5 ${
                              comunicado.priority === "Alta"
                                ? "text-red-400"
                                : comunicado.priority === "Media"
                                  ? "text-amber-400"
                                  : "text-blue-400"
                            }`}
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{comunicado.title}</h3>
                          <p className="text-sm text-gray-400 mt-1">Por: {comunicado.author}</p>
                          <div className="flex items-center mt-2">
                            <Badge
                              className={`${
                                comunicado.priority === "Alta"
                                  ? "bg-red-900/50 text-red-400"
                                  : comunicado.priority === "Media"
                                    ? "bg-amber-900/50 text-amber-400"
                                    : "bg-blue-900/50 text-blue-400"
                              }`}
                            >
                              {comunicado.priority}
                            </Badge>
                            <span className="text-xs text-gray-500 ml-2">{comunicado.date}</span>
                          </div>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="rounded-full h-8 w-8">
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reuniones" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Calendario de Reuniones</CardTitle>
              <CardDescription className="text-gray-400">Agenda de reuniones y juntas directivas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-750 rounded-lg flex items-center justify-center">
                <Calendar className="h-24 w-24 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proyectos" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Proyectos Estratégicos</CardTitle>
              <CardDescription className="text-gray-400">Iniciativas y proyectos en desarrollo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-750 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="h-24 w-24 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <SolicitudesPanel departamento="Jefatura" />
    </div>
  )
}

