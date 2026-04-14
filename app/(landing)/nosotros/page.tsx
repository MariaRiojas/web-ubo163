"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { MainFooter } from "@/components/main-footer"
import { Shield, Award, Heart, Users, Target, Mail, Phone } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

export default function NosotrosPage() {
  const [visibleTimeline, setVisibleTimeline] = useState<number[]>([])
  const timelineRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers = timelineRefs.current.map((ref, index) => {
      if (!ref) return null

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleTimeline((prev) => {
                if (!prev.includes(index)) {
                  return [...prev, index]
                }
                return prev
              })
            }
          })
        },
        { threshold: 0.2 }
      )

      observer.observe(ref)
      return observer
    })

    return () => {
      observers.forEach((observer) => observer?.disconnect())
    }
  }, [])
  // Línea de tiempo histórica
  const timeline = [
    {
      year: "1952",
      title: "Fundación",
      description: "Fundación de la Compañía de Bomberos Voluntarios Ancón N° 163 por un grupo de ciudadanos comprometidos con la seguridad de la comunidad.",
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
      year: "2023",
      title: "Expansión Digital",
      description: "Implementación de sistemas digitales de gestión y respuesta a emergencias.",
    },
  ]

  // Valores institucionales
  const values = [
    {
      icon: Heart,
      title: "Vocación de Servicio",
      description: "Compromiso desinteresado con el bienestar y la seguridad de la comunidad las 24 horas del día.",
    },
    {
      icon: Users,
      title: "Trabajo en Equipo",
      description: "Coordinación y colaboración efectiva para lograr objetivos comunes en situaciones de emergencia.",
    },
    {
      icon: Target,
      title: "Excelencia",
      description: "Búsqueda constante de la perfección en cada acción, procedimiento y capacitación.",
    },
    {
      icon: Shield,
      title: "Integridad",
      description: "Actuación basada en principios éticos y morales inquebrantables en todo momento.",
    },
  ]

  // Jefatura Principal (solo los 3 principales)
  const jefaturaPrincipal = [
    {
      nombre: "Cap. Juan Pérez Torres",
      cargo: "Primer Jefe - Comandante General",
      grado: "Capitán",
      especialidad: "Comando de Incidentes",
      años: 15,
      imagen: "/placeholder.svg?height=400&width=400",
      email: "j.perez@bomberos163.pe",
      telefono: "+51 999 888 777",
    },
    {
      nombre: "Tte. María García López",
      cargo: "Segundo Jefe - Jefa de Operaciones",
      grado: "Teniente",
      especialidad: "Rescate y Operaciones",
      años: 12,
      imagen: "/placeholder.svg?height=400&width=400",
      email: "m.garcia@bomberos163.pe",
      telefono: "+51 999 888 776",
    },
    {
      nombre: "Brig. Pedro Fernández Luna",
      cargo: "Jefe de Administración",
      grado: "Brigadier",
      especialidad: "Gestión Administrativa",
      años: 7,
      imagen: "/placeholder.svg?height=400&width=400",
      email: "p.fernandez@bomberos163.pe",
      telefono: "+51 999 888 771",
    },
  ]

  // Comandante destacado
  const comandante = {
    nombre: "Cap. Juan Pérez Torres",
    cargo: "Comandante General",
    biografia: "Con más de 15 años de experiencia en el servicio de bomberos, el Capitán Juan Pérez Torres ha liderado nuestra compañía con dedicación y profesionalismo. Especializado en Comando de Incidentes Mayores, ha participado en más de 300 operaciones de emergencia y ha capacitado a más de 200 bomberos en técnicas avanzadas de rescate.",
    logros: [
      "Implementación del Sistema de Comando de Incidentes (SCI)",
      "Certificación Internacional en Materiales Peligrosos (Hazmat)",
      "Reconocimiento Nacional por Labor Humanitaria 2022",
      "Instructor Certificado ESBAS y NFPA",
    ],
    imagen: "/placeholder.svg?height=500&width=500",
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20">
      <MainNav />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-r from-primary to-red-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <Badge className="mb-6 bg-white/20 backdrop-blur-sm border-white/30 text-white text-sm">
            Nuestra Historia
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Bomberos Ancón 163
          </h1>
          <p className="text-lg md:text-xl text-red-100 max-w-3xl leading-relaxed">
            Más de 70 años de servicio ininterrumpido a la comunidad de Ancón. Conoce nuestra trayectoria, valores y al equipo que hace posible nuestra misión cada día.
          </p>
        </div>
      </section>

      <main className="flex-1">
        {/* Línea de Tiempo */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 px-4 py-2">
                Nuestra Trayectoria
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Historia y Legado</h2>
              <p className="text-lg text-muted-foreground">
                Un recorrido por los momentos más importantes de nuestra institución
              </p>
            </div>

            <div className="relative">
              {/* Línea vertical */}
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-red-600 to-primary/20 transform md:-translate-x-1/2"></div>

              <div className="space-y-12">
                {timeline.map((event, index) => (
                  <div
                    key={index}
                    ref={(el) => { timelineRefs.current[index] = el }}
                    className={`relative flex flex-col md:flex-row items-start md:items-center transition-all duration-700 ${
                      index % 2 === 0 ? "md:flex-row-reverse" : ""
                    } ${
                      visibleTimeline.includes(index)
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-8"
                    }`}
                  >
                    {/* Punto en la línea */}
                    <div className={`absolute left-8 md:left-1/2 w-4 h-4 bg-primary rounded-full transform md:-translate-x-1/2 ring-4 ring-background transition-all duration-500 ${
                      visibleTimeline.includes(index) ? "scale-100 opacity-100" : "scale-0 opacity-0"
                    }`}></div>

                    {/* Contenido */}
                    <div className={`ml-16 md:ml-0 md:w-1/2 ${index % 2 === 0 ? "md:pr-12" : "md:pl-12"}`}>
                      <Card className="bento-item glass border-primary/10 hover:border-primary/30">
                        <CardHeader>
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-primary text-white px-3 py-1 text-lg font-bold">
                              {event.year}
                            </Badge>
                            <Award className="h-5 w-5 text-primary" />
                          </div>
                          <CardTitle className="text-xl">{event.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">{event.description}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Perfil del Comandante */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 px-4 py-2">
                Liderazgo
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Comandante General</h2>
            </div>

            <Card className="max-w-5xl mx-auto glass border-primary/10">
              <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
                <div className="relative h-80 md:h-full rounded-2xl overflow-hidden">
                  <Image
                    src={comandante.imagen}
                    alt={comandante.nombre}
                    width={500}
                    height={500}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-white">{comandante.cargo}</Badge>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-2">{comandante.nombre}</h3>
                    <p className="text-primary font-semibold">{comandante.cargo}</p>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{comandante.biografia}</p>
                  <div>
                    <h4 className="font-bold mb-3 flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      Logros Destacados
                    </h4>
                    <ul className="space-y-2">
                      {comandante.logros.map((logro, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1">•</span>
                          {logro}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Jefatura Principal - Cards */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 px-4 py-2">
                Jefatura
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Plana Mayor de la Compañía</h2>
              <p className="text-lg text-muted-foreground">
                Conoce a los principales líderes que dirigen nuestra misión de servicio a la comunidad
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
              {jefaturaPrincipal.map((jefe, index) => (
                <Card
                  key={index}
                  className="bento-item glass border-primary/10 hover:border-primary/30 overflow-hidden group"
                >
                  <div className="relative h-72 overflow-hidden">
                    <Image
                      src={jefe.imagen}
                      alt={jefe.nombre}
                      width={400}
                      height={400}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <div className="text-white space-y-2 w-full">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4" />
                          <span className="text-xs">{jefe.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4" />
                          <span className="text-xs">{jefe.telefono}</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-primary text-white">{jefe.grado}</Badge>
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg leading-tight">{jefe.nombre}</CardTitle>
                    <p className="text-sm text-primary font-semibold">{jefe.cargo}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Especialidad:</span>
                        <span className="font-medium text-right text-xs">{jefe.especialidad}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Experiencia:</span>
                        <Badge variant="outline" className="text-xs">{jefe.años} años</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Botón Ver Más */}
            <div className="text-center">
              <Link href="/equipo">
                <Button size="lg" className="bg-gradient-to-r from-primary to-red-800 hover:from-red-700 hover:to-red-900 text-white px-8">
                  Ver Todo el Equipo
                  <Users className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Valores Institucionales */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 px-4 py-2">
                Principios que nos Guían
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Valores Institucionales</h2>
              <p className="text-lg text-muted-foreground">
                Los pilares fundamentales que sostienen nuestra labor diaria
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <Card
                  key={index}
                  className="bento-item glass border-primary/10 hover:border-primary/30 text-center group"
                >
                  <CardHeader>
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <value.icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <MainFooter />
    </div>
  )
}
