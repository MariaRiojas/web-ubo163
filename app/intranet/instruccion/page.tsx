import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Calendar, GraduationCap, Users, Award, Clock, FileText, Play, Download } from "lucide-react"
import Image from "next/image"
import SolicitudesPanel from "@/components/solicitudes-panel"

export default function Instruccion() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Instrucción</h1>
          <p className="text-gray-400">Capacitación y formación profesional</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Calendar className="mr-2 h-4 w-4" />
            Calendario de Cursos
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800">
            <GraduationCap className="mr-2 h-4 w-4" />
            Mi Formación
          </Button>
        </div>
      </div>

      <Tabs defaultValue="cursos" className="w-full">
        <TabsList className="bg-gray-800 border-gray-700 w-full justify-start">
          <TabsTrigger value="cursos" className="data-[state=active]:bg-red-600">
            Cursos
          </TabsTrigger>
          <TabsTrigger value="materiales" className="data-[state=active]:bg-red-600">
            Materiales
          </TabsTrigger>
          <TabsTrigger value="certificaciones" className="data-[state=active]:bg-red-600">
            Certificaciones
          </TabsTrigger>
          <TabsTrigger value="instructores" className="data-[state=active]:bg-red-600">
            Instructores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cursos" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Cursos Disponibles</CardTitle>
                  <CardDescription className="text-gray-400">Programas de formación y capacitación</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        title: "Técnicas Avanzadas de Rescate",
                        image: "/placeholder.svg?height=150&width=300",
                        instructor: "Cap. Juan Pérez",
                        duration: "40 horas",
                        level: "Avanzado",
                        date: "Inicia: 05/04/2024",
                      },
                      {
                        title: "Manejo de Materiales Peligrosos",
                        image: "/placeholder.svg?height=150&width=300",
                        instructor: "Tte. María García",
                        duration: "30 horas",
                        level: "Intermedio",
                        date: "Inicia: 15/04/2024",
                      },
                      {
                        title: "Primeros Auxilios Avanzados",
                        image: "/placeholder.svg?height=150&width=300",
                        instructor: "Dr. Carlos López",
                        duration: "25 horas",
                        level: "Básico",
                        date: "Inicia: 10/04/2024",
                      },
                      {
                        title: "Comando de Incidentes",
                        image: "/placeholder.svg?height=150&width=300",
                        instructor: "Cmdte. Roberto Sánchez",
                        duration: "35 horas",
                        level: "Avanzado",
                        date: "Inicia: 20/04/2024",
                      },
                    ].map((curso, index) => (
                      <Card
                        key={index}
                        className="bg-gray-750 border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                      >
                        <div className="relative">
                          <Image
                            src={curso.image || "/placeholder.svg"}
                            alt={curso.title}
                            width={300}
                            height={150}
                            className="w-full h-40 object-cover"
                          />
                          <Badge className="absolute top-3 right-3 bg-red-600 text-white">{curso.level}</Badge>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-bold text-white mb-2">{curso.title}</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center">
                              <GraduationCap className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-gray-300">{curso.instructor}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-gray-300">{curso.duration}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-gray-300">{curso.date}</span>
                            </div>
                          </div>
                          <Button className="w-full mt-4 bg-red-600 hover:bg-red-700">Inscribirse</Button>
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
                  <CardTitle className="text-white">Mi Progreso</CardTitle>
                  <CardDescription className="text-gray-400">Seguimiento de formación personal</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">Cursos Completados</h3>
                      <Badge className="bg-green-600">8/12</Badge>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-300">Progreso General</span>
                          <span className="text-sm font-bold text-white">67%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                          <div className="h-2.5 rounded-full bg-red-600" style={{ width: "67%" }}></div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-300">Horas Acumuladas</span>
                          <span className="text-sm font-bold text-white">120/180</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                          <div className="h-2.5 rounded-full bg-amber-500" style={{ width: "67%" }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-white mb-3">Próximas Clases</h3>
                      {[
                        { title: "Rescate en Altura", date: "28/03/2024", time: "09:00 - 13:00" },
                        { title: "Extinción de Incendios", date: "30/03/2024", time: "14:00 - 18:00" },
                      ].map((clase, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-750 rounded-lg mb-2">
                          <div>
                            <p className="text-sm font-medium text-white">{clase.title}</p>
                            <div className="flex items-center mt-1">
                              <Calendar className="h-3 w-3 text-gray-500 mr-1" />
                              <span className="text-xs text-gray-400">{clase.date}</span>
                              <Clock className="h-3 w-3 text-gray-500 ml-2 mr-1" />
                              <span className="text-xs text-gray-400">{clase.time}</span>
                            </div>
                          </div>
                          <Badge className="bg-blue-900/30 text-blue-400">Pendiente</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700 mt-6">
                <CardHeader>
                  <CardTitle className="text-white">Logros</CardTitle>
                  <CardDescription className="text-gray-400">Reconocimientos y certificaciones</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { title: "Especialista en Rescate", date: "15/01/2024", level: "Avanzado" },
                      { title: "Primeros Auxilios", date: "10/12/2023", level: "Intermedio" },
                      { title: "Manejo de Incendios", date: "05/10/2023", level: "Avanzado" },
                    ].map((logro, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-750 rounded-lg">
                        <Award className="h-8 w-8 text-amber-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-white text-sm">{logro.title}</p>
                          <div className="flex items-center mt-1">
                            <Badge className="mr-2 text-xs py-0 h-5 px-1.5 bg-red-900/30 text-red-400">
                              {logro.level}
                            </Badge>
                            <span className="text-xs text-gray-400">{logro.date}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="materiales" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Materiales de Estudio</CardTitle>
              <CardDescription className="text-gray-400">Recursos educativos y documentación</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      title: "Manuales Técnicos",
                      description: "Documentación técnica de equipos y procedimientos",
                      icon: BookOpen,
                      count: 24,
                    },
                    {
                      title: "Videos Formativos",
                      description: "Material audiovisual para capacitación",
                      icon: Play,
                      count: 36,
                    },
                    {
                      title: "Presentaciones",
                      description: "Diapositivas y material de apoyo",
                      icon: FileText,
                      count: 18,
                    },
                  ].map((categoria, index) => (
                    <Card key={index} className="bg-gray-750 border-gray-700 hover:bg-gray-700 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="p-3 bg-red-900/30 rounded-full mb-4">
                            <categoria.icon className="h-8 w-8 text-red-400" />
                          </div>
                          <h3 className="font-bold text-white mb-2">{categoria.title}</h3>
                          <p className="text-sm text-gray-400 mb-4">{categoria.description}</p>
                          <Badge className="bg-gray-700">{categoria.count} archivos</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-medium text-white mb-4">Documentos Recientes</h3>
                  <div className="space-y-3">
                    {[
                      {
                        title: "Manual de Procedimientos Operativos",
                        type: "PDF",
                        size: "4.2 MB",
                        date: "15/03/2024",
                        category: "Manuales",
                      },
                      {
                        title: "Técnicas de Rescate en Espacios Confinados",
                        type: "VIDEO",
                        size: "250 MB",
                        date: "10/03/2024",
                        category: "Videos",
                      },
                      {
                        title: "Curso de Primeros Auxilios 2024",
                        type: "PPTX",
                        size: "15.8 MB",
                        date: "05/03/2024",
                        category: "Presentaciones",
                      },
                      {
                        title: "Guía de Materiales Peligrosos",
                        type: "PDF",
                        size: "8.5 MB",
                        date: "01/03/2024",
                        category: "Manuales",
                      },
                    ].map((documento, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center">
                          <div className="p-2 bg-red-900/50 rounded-lg mr-4">
                            {documento.type === "PDF" && <FileText className="h-5 w-5 text-red-400" />}
                            {documento.type === "VIDEO" && <Play className="h-5 w-5 text-red-400" />}
                            {documento.type === "PPTX" && <BookOpen className="h-5 w-5 text-red-400" />}
                          </div>
                          <div>
                            <p className="font-medium text-white">{documento.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs py-0 px-1.5 h-5 border-gray-600">
                                {documento.type}
                              </Badge>
                              <span className="text-xs text-gray-500">{documento.size}</span>
                              <span className="text-xs text-gray-500">{documento.date}</span>
                            </div>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                          <Download className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificaciones" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Certificaciones</CardTitle>
              <CardDescription className="text-gray-400">Programas de certificación profesional</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-750 rounded-lg flex items-center justify-center">
                <Award className="h-24 w-24 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructores" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Instructores</CardTitle>
              <CardDescription className="text-gray-400">Equipo de formadores y especialistas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-750 rounded-lg flex items-center justify-center">
                <Users className="h-24 w-24 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <SolicitudesPanel departamento="Instrucción" />
    </div>
  )
}

