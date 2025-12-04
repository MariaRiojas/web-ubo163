"use client";

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MainNav } from "@/components/main-nav"
import { MainFooter } from "@/components/main-footer"
import {
  PhoneCall,
  AlertTriangle,
  Star,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Bell,
  Newspaper,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)

  // Datos para el carrusel
  const carouselItems = [
    {
      image: "/placeholder.svg?height=800&width=1600",
      title: "Bomberos Ancón 163",
      description:
        "Protegiendo vidas y propiedades 24/7 con excelencia y compromiso con nuestra comunidad",
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
      date: "15 de Abril, 2024",
      description:
        "Se realizará un simulacro de evacuación en el centro comercial principal. Se invita a la comunidad a participar.",
      icon: Bell,
      color: "bg-amber-500",
    },
    {
      title: "Campaña de Prevención",
      date: "20 de Abril, 2024",
      description:
        "Iniciamos nuestra campaña anual de prevención de incendios en hogares. Solicita tu inspección gratuita.",
      icon: AlertTriangle,
      color: "bg-red-500",
    },
    {
      title: "Curso de Primeros Auxilios",
      date: "5 de Mayo, 2024",
      description: "Abrimos inscripciones para el curso básico de primeros auxilios dirigido a la comunidad.",
      icon: Calendar,
      color: "bg-cyan-500",
    },
  ]

  // Datos para noticias
  const news = [
    {
      title: "Bomberos rescatan a familia atrapada en inundación",
      date: "10 de Abril, 2024",
      image: "/placeholder.svg?height=300&width=500",
      summary:
        "Nuestro equipo de rescate acuático logró poner a salvo a una familia de cinco integrantes durante las recientes inundaciones.",
      category: "Rescate",
    },
    {
      title: "Nueva unidad de respuesta rápida",
      date: "2 de Abril, 2024",
      image: "/placeholder.svg?height=300&width=500",
      summary:
        "Incorporamos a nuestra flota un nuevo vehículo de respuesta rápida equipado con tecnología de última generación.",
      category: "Equipamiento",
    },
    {
      title: "Reconocimiento internacional a nuestro cuerpo de bomberos",
      date: "25 de Marzo, 2024",
      image: "/placeholder.svg?height=300&width=500",
      summary:
        "Nuestra institución recibió un reconocimiento por su destacada labor en la implementación de protocolos de seguridad.",
      category: "Reconocimientos",
    },
  ]

  // Carrusel automático
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === carouselItems.length - 1 ? 0 : prev + 1))
    }, 5000)
    return () => clearInterval(interval)
  }, [carouselItems.length])

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20">
      <MainNav />

      <main className="flex-1">
        {/* Carrusel Hero con glassmorfismo */}
        <section className="relative overflow-hidden h-[600px] md:h-[800px]">
          {carouselItems.map((item, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${currentSlide === index ? "opacity-100 z-10" : "opacity-0 z-0"}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-secondary/80 to-primary/90 z-10" />
              <Image
                src={item.image || "/placeholder.svg"}
                alt={item.title}
                width={1600}
                height={800}
                className="w-full h-full object-cover"
                priority
              />
              <div className="container mx-auto px-4 relative z-20 h-full flex items-center">
                <div className="max-w-3xl space-y-6 md:space-y-8">
                  <Badge
                    variant="secondary"
                    className="glass-strong backdrop-blur-md text-white border-white/20 py-2 px-4"
                  >
                    <Star className="h-4 w-4 mr-2 text-secondary animate-pulse" />
                    {item.badge}
                  </Badge>
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
                    {item.title}
                  </h1>
                  <p className="text-lg md:text-xl text-white/90 leading-relaxed">{item.description}</p>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <Button
                      size="lg"
                      className="bg-white text-primary hover:bg-white/90 text-lg px-8 shadow-xl transform hover:scale-105 transition-all"
                    >
                      <PhoneCall className="mr-2 h-5 w-5" />
                      Emergencias: 911
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-white border-white/30 hover:bg-white/10 glass backdrop-blur-sm"
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
                  currentSlide === index ? "bg-white w-8" : "bg-white/50 hover:bg-white/80"
                }`}
                aria-label={`Ir a diapositiva ${index + 1}`}
              />
            ))}
          </div>

          {/* Botones de navegación */}
          <button
            onClick={() => setCurrentSlide((prev) => (prev === 0 ? carouselItems.length - 1 : prev - 1))}
            className="absolute left-4 md:left-8 top-1/2 z-30 -translate-y-1/2 glass-strong backdrop-blur-md text-white p-3 rounded-full transition-all duration-300 hover:scale-110"
            aria-label="Diapositiva anterior"
          >
            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev === carouselItems.length - 1 ? 0 : prev + 1))}
            className="absolute right-4 md:right-8 top-1/2 z-30 -translate-y-1/2 glass-strong backdrop-blur-md text-white p-3 rounded-full transition-all duration-300 hover:scale-110"
            aria-label="Siguiente diapositiva"
          >
            <ArrowRight className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </section>

        {/* Anuncios con Bento Grid */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <Badge
                variant="outline"
                className="mb-4 text-primary border-primary/30 px-4 py-2"
              >
                Información Importante
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Anuncios a la Comunidad
              </h2>
              <p className="text-lg text-muted-foreground">
                Mantente informado sobre nuestras actividades y eventos importantes
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map((announcement, index) => (
                <Card
                  key={index}
                  className="bento-item glass border-primary/10 hover:border-primary/30 transition-all"
                >
                  <div className={`h-2 ${announcement.color} w-full rounded-t-2xl`}></div>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-3">
                      <div className={`p-3 ${announcement.color} rounded-xl text-white`}>
                        <announcement.icon className="h-5 w-5 md:h-6 md:w-6" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {announcement.date}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg md:text-xl">{announcement.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground text-sm md:text-base">{announcement.description}</p>
                    <Button variant="ghost" className="text-primary hover:text-primary/80 p-0 mt-4">
                      Más información <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Noticias con glassmorfismo */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <Badge
                variant="outline"
                className="mb-4 text-primary border-primary/30 px-4 py-2"
              >
                Últimas Actualizaciones
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Noticias Destacadas
              </h2>
              <p className="text-lg text-muted-foreground">
                Conoce las últimas novedades y logros de nuestro cuerpo de bomberos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((item, index) => (
                <Card
                  key={index}
                  className="bento-item glass border-primary/10 hover:border-primary/30 overflow-hidden"
                >
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.title}
                      width={500}
                      height={300}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-primary text-white border-0">{item.category}</Badge>
                    </div>
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="outline" className="text-xs">
                        {item.date}
                      </Badge>
                      <Newspaper className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="line-clamp-2 text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-3 text-sm md:text-base">{item.summary}</p>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white mt-4">
                      Leer más <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
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
