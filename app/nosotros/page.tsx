"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, Flame, Award, Star, Calendar, Heart, Users, Target, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function NosotrosPage() {
  // Datos para la línea de tiempo
  const timeline = [
    {
      year: "1952",
      title: "Fundación",
      description:
        "Fundación de la compañía de bomberos voluntarios por un grupo de ciudadanos comprometidos con la seguridad de la comunidad.",
    },
    {
      year: "1965",
      title: "Primera Estación",
      description: "Inauguración de la primera estación de bomberos con equipamiento moderno para la época.",
    },
    {
      year: "1978",
      title: "Expansión del Servicio",
      description: "Ampliación de los servicios para incluir rescate vehicular y atención de emergencias médicas.",
    },
    {
      year: "1995",
      title: "Modernización",
      description: "Renovación completa de la flota y equipamiento con tecnología de punta.",
    },
    {
      year: "2010",
      title: "Centro de Capacitación",
      description: "Inauguración del centro de capacitación para bomberos y la comunidad.",
    },
    {
      year: "2022",
      title: "70 Aniversario",
      description: "Celebración de 70 años de servicio ininterrumpido a la comunidad con reconocimiento nacional.",
    },
  ]

  // Valores institucionales
  const values = [
    {
      icon: Heart,
      title: "Vocación de Servicio",
      description: "Compromiso desinteresado con el bienestar y la seguridad de la comunidad.",
      color: "bg-red-500",
    },
    {
      icon: Users,
      title: "Trabajo en Equipo",
      description: "Coordinación y colaboración efectiva para lograr objetivos comunes.",
      color: "bg-blue-500",
    },
    {
      icon: Target,
      title: "Excelencia",
      description: "Búsqueda constante de la perfección en cada acción y procedimiento.",
      color: "bg-amber-500",
    },
    {
      icon: Shield,
      title: "Integridad",
      description: "Actuación basada en principios éticos y morales inquebrantables.",
      color: "bg-green-500",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="relative py-24 bg-gradient-to-r from-red-900 to-red-800 text-white">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="container relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative transform transition-transform duration-300 hover:scale-110 hover:rotate-12">
                <Shield className="h-10 w-10 text-red-400" />
                <Flame className="h-4 w-4 text-amber-500 absolute -right-1 -bottom-1 animate-pulse" />
              </div>
            </Link>
            <Badge variant="secondary" className="bg-red-700/50 text-white px-4 py-1">
              Nosotros
            </Badge>
          </div>
          <h1 className="text-5xl font-bold mb-4">Nuestra Historia</h1>
          <p className="text-xl text-red-100 max-w-3xl">
            Conoce la trayectoria de nuestra institución, nuestros valores y a las personas que lideran nuestro
            compromiso con la comunidad.
          </p>
        </div>
      </header>

      <main className="py-24">
        <div className="container">
          {/* Historia y Línea de Tiempo */}
          <section className="mb-32">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge
                variant="outline"
                className="mb-4 text-red-600 border-red-200 px-4 py-2 transform hover:scale-110 transition-transform duration-300"
              >
                Nuestra Trayectoria
              </Badge>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent">
                Historia de Nuestra Institución
              </h2>
              <p className="text-lg text-gray-600">
                Más de 70 años de servicio ininterrumpido a la comunidad, enfrentando desafíos y evolucionando
                constantemente
              </p>
            </div>

            <div className="relative">
              {/* Línea vertical */}
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-red-200"></div>

              <div className="space-y-24">
                {timeline.map((item, index) => (
                  <div
                    key={index}
                    className={`relative flex items-center ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
                  >
                    {/* Punto en la línea */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full bg-red-600 border-4 border-white shadow-lg z-10"></div>

                    {/* Contenido */}
                    <div className={`w-5/12 ${index % 2 === 0 ? "pr-16" : "pl-16"}`}>
                      <Card className="group hover:shadow-xl transition-all duration-500 transform hover:scale-105 hover:rotate-1">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="bg-red-600 text-white text-xl font-bold px-4 py-2 rounded-lg">
                              {item.year}
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">{item.title}</h3>
                          </div>
                          <p className="text-gray-600">{item.description}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Comandante Actual */}
          <section className="mb-32">
            <div className="bg-gradient-to-r from-gray-900 to-red-900 rounded-2xl overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="p-12 text-white">
                  <Badge
                    variant="outline"
                    className="mb-4 text-red-300 border-red-700 px-4 py-2 transform hover:scale-110 transition-transform duration-300"
                  >
                    Liderazgo
                  </Badge>
                  <h2 className="text-4xl font-bold mb-6">Nuestro Comandante</h2>
                  <div className="space-y-6">
                    <p className="text-xl text-red-100">Comandante General Roberto Martínez</p>
                    <p className="text-gray-300">
                      Con más de 25 años de experiencia en el cuerpo de bomberos, el Comandante Martínez ha liderado
                      nuestra institución durante los últimos 8 años, implementando programas innovadores de prevención
                      y respuesta a emergencias.
                    </p>
                    <p className="text-gray-300">
                      Bajo su liderazgo, hemos modernizado nuestro equipamiento, ampliado nuestras capacidades de
                      respuesta y fortalecido nuestros programas de capacitación comunitaria.
                    </p>
                    <div className="flex gap-4 pt-4">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-400" />
                        <span className="text-red-100">25 años de servicio</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-amber-400" />
                        <span className="text-red-100">Condecoración Nacional</span>
                      </div>
                    </div>
                    <div className="pt-4">
                      <Button className="bg-red-600 hover:bg-red-700 text-white">
                        <Calendar className="mr-2 h-4 w-4" />
                        Solicitar Reunión
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <Image
                    src="/placeholder.svg?height=600&width=600"
                    alt="Comandante Roberto Martínez"
                    width={600}
                    height={600}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-transparent md:bg-none"></div>
                </div>
              </div>
            </div>
          </section>

          {/* Valores Institucionales */}
          <section>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge
                variant="outline"
                className="mb-4 text-red-600 border-red-200 px-4 py-2 transform hover:scale-110 transition-transform duration-300"
              >
                Principios
              </Badge>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent">
                Valores Institucionales
              </h2>
              <p className="text-lg text-gray-600">
                Los principios que guían nuestras acciones y decisiones en el servicio a la comunidad
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <Card
                  key={index}
                  className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:rotate-1 overflow-hidden"
                >
                  <div className={`h-2 ${value.color} w-full`}></div>
                  <CardContent className="p-8 text-center">
                    <div
                      className={`mx-auto w-16 h-16 ${value.color} rounded-full flex items-center justify-center mb-6 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500`}
                    >
                      <value.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{value.title}</h3>
                    <p className="text-gray-600">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center mt-16">
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" asChild>
                <Link href="/equipo">
                  Conoce a Nuestro Equipo <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

