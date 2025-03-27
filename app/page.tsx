"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  PhoneCall,
  Shield,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Lock,
  Flame,
  AlertTriangle,
  Star,
  Calendar,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Bell,
  Newspaper,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"

export default function FireDepartment() {
  const [loadMore, setLoadMore] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  // Datos para el carrusel
  const carouselItems = [
    {
      image: "/placeholder.svg?height=800&width=1600",
      title: "Protegiendo Vidas y Propiedades 24/7",
      description:
        "Servicio profesional de bomberos comprometido con la excelencia y la seguridad de nuestra comunidad",
      badge: "Servicio de Excelencia",
    },
    {
      image: "/placeholder.svg?height=800&width=1600",
      title: "Capacitación Continua",
      description:
        "Nuestro personal se capacita constantemente para ofrecer el mejor servicio en situaciones de emergencia",
      badge: "Profesionales Certificados",
    },
    {
      image: "/placeholder.svg?height=800&width=1600",
      title: "Equipamiento de Última Generación",
      description: "Contamos con tecnología avanzada para responder eficientemente a todo tipo de emergencias",
      badge: "Tecnología Avanzada",
    },
  ]

  // Datos para anuncios
  const announcements = [
    {
      title: "Simulacro de Evacuación",
      date: "15 de Abril, 2023",
      description:
        "Se realizará un simulacro de evacuación en el centro comercial principal. Se invita a la comunidad a participar.",
      icon: Bell,
      color: "bg-amber-500",
    },
    {
      title: "Campaña de Prevención",
      date: "20 de Abril, 2023",
      description:
        "Iniciamos nuestra campaña anual de prevención de incendios en hogares. Solicita tu inspección gratuita.",
      icon: AlertTriangle,
      color: "bg-red-500",
    },
    {
      title: "Curso de Primeros Auxilios",
      date: "5 de Mayo, 2023",
      description: "Abrimos inscripciones para el curso básico de primeros auxilios dirigido a la comunidad.",
      icon: Calendar,
      color: "bg-green-500",
    },
  ]

  // Datos para noticias
  const news = [
    {
      title: "Bomberos rescatan a familia atrapada en inundación",
      date: "10 de Abril, 2023",
      image: "/placeholder.svg?height=300&width=500",
      summary:
        "Nuestro equipo de rescate acuático logró poner a salvo a una familia de cinco integrantes durante las recientes inundaciones.",
      category: "Rescate",
    },
    {
      title: "Nueva unidad de respuesta rápida",
      date: "2 de Abril, 2023",
      image: "/placeholder.svg?height=300&width=500",
      summary:
        "Incorporamos a nuestra flota un nuevo vehículo de respuesta rápida equipado con tecnología de última generación.",
      category: "Equipamiento",
    },
    {
      title: "Reconocimiento internacional a nuestro cuerpo de bomberos",
      date: "25 de Marzo, 2023",
      image: "/placeholder.svg?height=300&width=500",
      summary:
        "Nuestra institución recibió un reconocimiento por su destacada labor en la implementación de protocolos de seguridad.",
      category: "Reconocimientos",
    },
  ]

  // Datos de los miembros del equipo
  const teamMembers = [
    {
      name: "Cap. Juan Pérez",
      role: "Capitán de Bomberos",
      rank: "Elite",
      achievements: 5,
      specialties: ["Rescate", "Comando"],
      image: "/placeholder.svg?height=400&width=400",
      grade: "Capitán",
      profession: "Ingeniero Civil",
      years: 15,
      description:
        "Especialista en rescate en estructuras colapsadas y comando de incidentes. Ha liderado más de 200 operaciones de emergencia.",
    },
    {
      name: "Tte. María García",
      role: "Teniente de Bomberos",
      rank: "Experto",
      achievements: 4,
      specialties: ["Prevención", "Capacitación"],
      image: "/placeholder.svg?height=400&width=400",
      grade: "Teniente",
      profession: "Médico",
      years: 10,
      description:
        "Especialista en atención prehospitalaria y capacitación en primeros auxilios. Coordina el programa de prevención comunitaria.",
    },
    {
      name: "Sgto. Carlos López",
      role: "Sargento de Bomberos",
      rank: "Avanzado",
      achievements: 3,
      specialties: ["Emergencias", "Primeros Auxilios"],
      image: "/placeholder.svg?height=400&width=400",
      grade: "Sargento",
      profession: "Técnico en Emergencias",
      years: 8,
      description:
        "Experto en manejo de materiales peligrosos y rescate vehicular. Instructor certificado en primeros auxilios avanzados.",
    },
    {
      name: "Ofl. Ana Martínez",
      role: "Oficial de Bomberos",
      rank: "Especialista",
      achievements: 3,
      specialties: ["Rescate", "Emergencias"],
      image: "/placeholder.svg?height=400&width=400",
      grade: "Oficial",
      profession: "Arquitecta",
      years: 7,
      description:
        "Especializada en evaluación estructural post-incendio y rescate en espacios confinados. Coordinadora de seguridad operativa.",
    },
    {
      name: "Brig. Roberto Sánchez",
      role: "Brigadier",
      rank: "Avanzado",
      achievements: 2,
      specialties: ["Incendios Forestales", "Comunicaciones"],
      image: "/placeholder.svg?height=400&width=400",
      grade: "Brigadier",
      profession: "Ingeniero Forestal",
      years: 5,
      description:
        "Especialista en control de incendios forestales y sistemas de comunicación en emergencias. Coordinador de brigadas forestales.",
    },
    {
      name: "Secc. Laura Díaz",
      role: "Seccionario",
      rank: "Intermedio",
      achievements: 2,
      specialties: ["Logística", "Administración"],
      image: "/placeholder.svg?height=400&width=400",
      grade: "Seccionario",
      profession: "Administradora",
      years: 4,
      description:
        "Encargada de logística y administración de recursos en emergencias. Coordinadora de voluntariado y reclutamiento.",
    },
    {
      name: "Cap. Javier Morales",
      role: "Capitán de Bomberos",
      rank: "Elite",
      achievements: 5,
      specialties: ["Hazmat", "Instrucción"],
      image: "/placeholder.svg?height=400&width=400",
      grade: "Capitán",
      profession: "Químico",
      years: 12,
      description:
        "Especialista en materiales peligrosos (Hazmat) e instructor principal de la academia. Ha desarrollado protocolos de seguridad química.",
    },
    {
      name: "Tte. Patricia Vega",
      role: "Teniente de Bomberos",
      rank: "Experto",
      achievements: 4,
      specialties: ["Rescate Acuático", "Buceo"],
      image: "/placeholder.svg?height=400&width=400",
      grade: "Teniente",
      profession: "Bióloga Marina",
      years: 9,
      description:
        "Especialista en rescate acuático y operaciones de buceo. Coordinadora del equipo de respuesta a emergencias acuáticas.",
    },
  ]

  // Carrusel automático
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === carouselItems.length - 1 ? 0 : prev + 1))
    }, 5000)
    return () => clearInterval(interval)
  }, [carouselItems.length])

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)

    // Simulamos el envío del formulario
    setTimeout(() => {
      setFormSubmitting(false)
      setFormSubmitted(true)

      // Resetear el formulario después de 3 segundos
      setTimeout(() => {
        setFormSubmitted(false)
        const form = e.target as HTMLFormElement
        form.reset()
      }, 3000)
    }, 1500)
  }

  // Mostrar solo los primeros 4 miembros inicialmente
  const visibleMembers = loadMore ? teamMembers : teamMembers.slice(0, 4)

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header - Added red accent */}
      <header className="sticky top-0 z-50 w-full border-b border-red-100 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-20 items-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative transform transition-transform duration-300 hover:scale-110 hover:rotate-12">
              <Shield className="h-10 w-10 text-red-600" />
              <Flame className="h-4 w-4 text-amber-500 absolute -right-1 -bottom-1 animate-pulse" />
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                Bomberos Voluntarios
              </span>
              <span className="text-xs text-gray-500 block">Excelencia en Servicio</span>
            </div>
          </Link>
          <nav className="ml-auto flex items-center gap-8">
            {/* Navigation links with 3D hover effect */}
            <Link
              href="/"
              className="text-sm font-medium text-red-600 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 hover:shadow-lg"
            >
              Inicio
            </Link>
            <Link
              href="/nosotros"
              className="text-sm font-medium text-gray-600 hover:text-red-600 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 hover:shadow-lg"
            >
              Nosotros
            </Link>
            <Link
              href="/servicios"
              className="text-sm font-medium text-gray-600 hover:text-red-600 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 hover:shadow-lg"
            >
              Servicios
            </Link>
            <Link
              href="/equipo"
              className="text-sm font-medium text-gray-600 hover:text-red-600 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 hover:shadow-lg"
            >
              Equipo
            </Link>
            <Link
              href="/contacto"
              className="text-sm font-medium text-gray-600 hover:text-red-600 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 hover:shadow-lg"
            >
              Contacto
            </Link>
            <Link
              href="/intranet"
              className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 px-6 py-2.5 rounded-full text-sm font-medium text-white hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transform hover:scale-105 hover:-translate-y-1"
            >
              <Lock className="h-4 w-4" />
              <span>Intranet</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Carrusel de Presentación */}
        <section className="relative overflow-hidden">
          {carouselItems.map((item, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${currentSlide === index ? "opacity-100 z-10" : "opacity-0 z-0"}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-900/95 via-red-800/90 to-sky-900/80 z-10" />
              <Image
                src={item.image || "/placeholder.svg"}
                alt={item.title}
                width={1600}
                height={800}
                className="w-full h-[800px] object-cover transform scale-105 animate-ken-burns"
                priority
              />
              <div className="container relative z-20 py-40">
                <div className="max-w-3xl space-y-8">
                  <div className="flex items-center gap-4 animate-fade-in transform hover:scale-105 transition-transform duration-300">
                    <Badge
                      variant="secondary"
                      className="bg-red-500/20 text-white hover:bg-red-500/30 transition-colors py-2 px-4 backdrop-blur-sm"
                    >
                      <Star className="h-4 w-4 mr-2 text-amber-400 animate-pulse" />
                      {item.badge}
                    </Badge>
                  </div>
                  <h1 className="text-6xl font-bold tracking-tighter text-white sm:text-7xl xl:text-8xl transform hover:scale-105 transition-transform duration-300">
                    {item.title}
                  </h1>
                  <p className="text-xl text-gray-200 leading-relaxed max-w-2xl">{item.description}</p>
                  <div className="flex gap-6 items-center">
                    <Button
                      size="lg"
                      className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 h-14 shadow-lg shadow-red-600/30 hover:shadow-red-600/40 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1"
                    >
                      <PhoneCall className="mr-2 h-5 w-5" />
                      Emergencias: 911
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-white border-white/30 hover:bg-white/10 text-lg px-8 h-14 backdrop-blur-sm transform hover:scale-105 hover:-translate-y-1 transition-all duration-300"
                      asChild
                    >
                      <Link href="/contacto">Contactar</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Controles del carrusel */}
          <div className="absolute bottom-10 left-0 right-0 z-30 flex justify-center gap-3">
            {carouselItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentSlide === index ? "bg-white scale-125" : "bg-white/50 hover:bg-white/80"
                }`}
                aria-label={`Ir a diapositiva ${index + 1}`}
              />
            ))}
          </div>

          {/* Botones de navegación */}
          <button
            onClick={() => setCurrentSlide((prev) => (prev === 0 ? carouselItems.length - 1 : prev - 1))}
            className="absolute left-5 top-1/2 z-30 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-300"
            aria-label="Diapositiva anterior"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev === carouselItems.length - 1 ? 0 : prev + 1))}
            className="absolute right-5 top-1/2 z-30 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-300"
            aria-label="Siguiente diapositiva"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
        </section>

        {/* Anuncios a la Comunidad */}
        <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge
                variant="outline"
                className="mb-4 text-red-600 border-red-200 px-4 py-2 transform hover:scale-110 transition-transform duration-300"
              >
                Información Importante
              </Badge>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent">
                Anuncios a la Comunidad
              </h2>
              <p className="text-lg text-gray-600">
                Mantente informado sobre nuestras actividades y eventos importantes para la comunidad
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {announcements.map((announcement, index) => (
                <Card
                  key={index}
                  className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:rotate-1 overflow-hidden"
                >
                  <div className={`h-2 ${announcement.color} w-full`}></div>
                  <CardHeader className="pb-0">
                    <div className="flex justify-between items-start">
                      <div className={`p-3 ${announcement.color} rounded-xl text-white`}>
                        <announcement.icon className="h-6 w-6" />
                      </div>
                      <Badge variant="outline" className="text-gray-500 border-gray-200">
                        {announcement.date}
                      </Badge>
                    </div>
                    <CardTitle className="mt-4 text-xl">{announcement.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-gray-600">{announcement.description}</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 p-0">
                      Más información <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Sección de Noticias */}
        <section className="py-24 bg-gradient-to-b from-gray-100 to-white">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge
                variant="outline"
                className="mb-4 text-red-600 border-red-200 px-4 py-2 transform hover:scale-110 transition-transform duration-300"
              >
                Últimas Actualizaciones
              </Badge>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent">
                Noticias Destacadas
              </h2>
              <p className="text-lg text-gray-600">
                Conoce las últimas novedades y logros de nuestro cuerpo de bomberos
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {news.map((item, index) => (
                <Card
                  key={index}
                  className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                >
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.title}
                      width={500}
                      height={300}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-red-600 text-white border-0">{item.category}</Badge>
                    </div>
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="outline" className="text-gray-500 border-gray-200">
                        {item.date}
                      </Badge>
                      <Newspaper className="h-4 w-4 text-red-600" />
                    </div>
                    <CardTitle className="line-clamp-2">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 line-clamp-3">{item.summary}</p>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                      Leer más <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            <div className="flex justify-center mt-12">
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" asChild>
                <Link href="/noticias">
                  Ver todas las noticias <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gradient-to-b from-gray-900 to-red-900 text-white py-20">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 group">
                <div className="relative transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                  <Shield className="h-10 w-10 text-red-400" />
                  <Flame className="h-4 w-4 text-amber-400 absolute -right-1 -bottom-1 animate-pulse" />
                </div>
                <span className="text-xl font-bold">Bomberos Voluntarios</span>
              </div>
              <p className="text-red-200">
                Comprometidos con la excelencia y el servicio a nuestra comunidad las 24 horas del día, los 365 días del
                año.
              </p>
              <div className="flex gap-4 pt-4">
                {[Facebook, Twitter, Instagram].map((Icon, index) => (
                  <Link
                    key={index}
                    href="#"
                    className="bg-red-800/30 p-3 rounded-full hover:bg-red-700/50 transition-all duration-300 transform hover:scale-110 hover:rotate-12"
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-6">Enlaces Rápidos</h3>
              <nav className="space-y-4">
                {[
                  { name: "Inicio", path: "/" },
                  { name: "Nosotros", path: "/nosotros" },
                  { name: "Servicios", path: "/servicios" },
                  { name: "Equipo", path: "/equipo" },
                  { name: "Contacto", path: "/contacto" },
                  { name: "Intranet", path: "/intranet" },
                ].map((item) => (
                  <Link
                    key={item.name}
                    href={item.path}
                    className="block text-red-200 hover:text-white transition-colors transform hover:translate-x-2 duration-300"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-6">Servicios</h3>
              <nav className="space-y-4">
                {["Emergencias", "Prevención", "Capacitación", "Inspecciones"].map((item) => (
                  <Link
                    key={item}
                    href={`/servicios#${item.toLowerCase()}`}
                    className="block text-red-200 hover:text-white transition-colors transform hover:translate-x-2 duration-300"
                  >
                    {item}
                  </Link>
                ))}
              </nav>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-6">Contacto Rápido</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <PhoneCall className="h-5 w-5 text-red-400" />
                  <span>Emergencias: 911</span>
                </div>
                <div className="flex items-center gap-3">
                  <PhoneCall className="h-5 w-5 text-red-400" />
                  <span>Central: 116</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-red-400" />
                  <span>contacto@bomberos.com</span>
                </div>
                <Button className="w-full bg-red-700 hover:bg-red-800 mt-4" asChild>
                  <Link href="/contacto">
                    Contactar <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t border-red-800/50 text-center text-red-200">
            <p>&copy; {new Date().getFullYear()} Bomberos Voluntarios. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

