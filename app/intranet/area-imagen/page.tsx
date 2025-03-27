import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ImageIcon, Upload, FileImage, Camera, Video, Share2, Download, Eye, Edit } from "lucide-react"
import Image from "next/image"
import SolicitudesPanel from "@/components/solicitudes-panel"

export default function AreaImagen() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Área de Imagen</h1>
          <p className="text-gray-400">Gestión de contenido multimedia y comunicación</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Upload className="mr-2 h-4 w-4" />
            Subir Contenido
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800">
            <Share2 className="mr-2 h-4 w-4" />
            Compartir
          </Button>
        </div>
      </div>

      <Tabs defaultValue="galeria" className="w-full">
        <TabsList className="bg-gray-800 border-gray-700 w-full justify-start">
          <TabsTrigger value="galeria" className="data-[state=active]:bg-red-600">
            Galería
          </TabsTrigger>
          <TabsTrigger value="comunicacion" className="data-[state=active]:bg-red-600">
            Comunicación
          </TabsTrigger>
          <TabsTrigger value="redes" className="data-[state=active]:bg-red-600">
            Redes Sociales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="galeria" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Galería de Imágenes</CardTitle>
                  <CardDescription className="text-gray-400">
                    Biblioteca de imágenes para uso institucional
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <div
                        key={index}
                        className="group relative aspect-square rounded-lg overflow-hidden bg-gray-750 transform hover:scale-105 transition-all duration-300"
                      >
                        <Image
                          src={`/placeholder.svg?height=200&width=200&text=Imagen+${index + 1}`}
                          alt={`Imagen ${index + 1}`}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                          <p className="text-white text-sm font-medium">Imagen {index + 1}</p>
                          <p className="text-gray-300 text-xs">Emergencia #{index + 100}</p>
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full bg-white/20 hover:bg-white/30"
                            >
                              <Eye className="h-3.5 w-3.5 text-white" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full bg-white/20 hover:bg-white/30"
                            >
                              <Download className="h-3.5 w-3.5 text-white" />
                            </Button>
                          </div>
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
                  <CardTitle className="text-white">Subir Contenido</CardTitle>
                  <CardDescription className="text-gray-400">Añadir nuevos archivos multimedia</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-red-500 transition-colors cursor-pointer">
                      <FileImage className="h-10 w-10 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-300 text-sm">Arrastra archivos aquí o haz clic para seleccionar</p>
                      <p className="text-gray-500 text-xs mt-2">PNG, JPG, GIF hasta 10MB</p>
                    </div>

                    <div className="space-y-3">
                      <Button className="w-full bg-gray-700 hover:bg-gray-650 text-white">
                        <Camera className="mr-2 h-4 w-4" />
                        Fotos
                      </Button>
                      <Button className="w-full bg-gray-700 hover:bg-gray-650 text-white">
                        <Video className="mr-2 h-4 w-4" />
                        Videos
                      </Button>
                      <Button className="w-full bg-gray-700 hover:bg-gray-650 text-white">
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Documentos
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comunicacion" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Comunicación Institucional</CardTitle>
              <CardDescription className="text-gray-400">Gestión de comunicados y material oficial</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "Comunicado Oficial", date: "15/03/2024", status: "Publicado" },
                  { title: "Nota de Prensa", date: "10/03/2024", status: "Publicado" },
                  { title: "Comunicado Interno", date: "05/03/2024", status: "Borrador" },
                  { title: "Informe Mensual", date: "01/03/2024", status: "Publicado" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="p-2 bg-red-900/50 rounded-lg mr-4">
                        <FileImage className="h-5 w-5 text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="text-sm text-gray-400">{item.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={item.status === "Publicado" ? "bg-green-600" : "bg-amber-600"}>
                        {item.status}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                        <Edit className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redes" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Redes Sociales</CardTitle>
              <CardDescription className="text-gray-400">Gestión de contenido para redes sociales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-750 rounded-lg flex items-center justify-center">
                <Share2 className="h-24 w-24 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <SolicitudesPanel departamento="Área de Imagen" />
    </div>
  )
}

