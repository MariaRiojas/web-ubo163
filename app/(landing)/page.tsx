"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { companyConfig } from "@/company.config"

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const { theme, contact } = companyConfig

  const carouselItems = [
    {
      image: theme.heroImages[0],
      title: companyConfig.shortName,
      description: "Protegiendo vidas y propiedades 24/7 con excelencia y compromiso con nuestra comunidad",
      badge: "Servicio de Excelencia",
    },
    {
      image: theme.heroImages[1] ?? theme.heroImages[0],
      title: "Capacitación Continua",
      description: "Nuestro personal se capacita constantemente para ofrecer el mejor servicio en situaciones de emergencia",
      badge: "Profesionales Certificados",
    },
    {
      image: theme.heroImages[2] ?? theme.heroImages[0],
      title: "Equipamiento de Última Generación",
      description: "Contamos con tecnología avanzada para responder eficientemente a todo tipo de emergencias",
      badge: "Tecnología Avanzada",
    },
  ]

  const announcements = [
    {
      title: "Simulacro de Evacuación",
      date: "15 de Abril, 2026",
      description: "Se realizará un simulacro de evacuación en el centro comercial principal. Se invita a la comunidad a participar.",
      icon: Bell,
      color: "bg-amber-500",
    },
    {
      title: "Campaña de Prevención",
      date: "20 de Abril, 2026",
      description: "Iniciamos nuestra campaña anual de prevención de incendios en hogares. Solicita tu inspección gratuita.",
      icon: AlertTriangle,
      color: "bg-red-500",
    },
    {
      title: "Curso de Primeros Auxilios",
      date: "5 de Mayo, 2026",
      description: "Abrimos inscripciones para el curso básico de primeros auxilios dirigido a la comunidad.",
      icon: Calendar,
      color: "bg-cyan-500",
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === carouselItems.length - 1 ? 0 : prev + 1))
    }, 5000)
    return () => clearInterval(interval)
  }, [carouselItems.length])

  return (
    <>
      {/* Carrusel Hero */}
      <section className="relative overflow-hidden h-[600px] md:h-[800px]">
        {carouselItems.map((item, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${currentSlide === index ? "opacity-100 z-10" : "opacity-0 z-0"}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/90 z-10" />
            <Image
              src={item.image || "/placeholder.svg"}
              alt={item.title}
              width={1600}
              height={800}
              className="w-full h-full object-cover"
              priority={index === 0}
            />
            <div className="container mx-auto px-4 relative z-20 h-full flex items-center">
              <div className="max-w-3xl space-y-6 md:space-y-8">
                <Badge variant="secondary" className="glass-strong backdrop-blur-md text-white border-white/20 py-2 px-4">
                  <Star className="h-4 w-4 mr-2 text-secondary animate-pulse" />
                  {item.badge}
                </Badge>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
                  {item.title}
                </h1>
                <p className="text-lg md:text-xl text-white/90 leading-relaxed">{item.description}</p>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 shadow-xl transform hover:scale-105 transition-all">
                    <PhoneCall className="mr-2 h-5 w-5" />
                    Emergencias: {contact.emergency}
                  </Button>
                  <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10 glass backdrop-blur-sm" asChild>
                    <Link href="/contacto">Contactar</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="absolute bottom-10 left-0 right-0 z-30 flex justify-center gap-3">
          {carouselItems.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${currentSlide === index ? "bg-white w-8" : "bg-white/50 hover:bg-white/80"}`}
              aria-label={`Ir a diapositiva ${index + 1}`}
            />
          ))}
        </div>
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

      {/* Anuncios */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <Badge variant="outline" className="mb-4 text-primary border-primary/30 px-4 py-2">
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
              <Card key={index} className="bento-item glass border-primary/10 hover:border-primary/30 transition-all">
                <div className={`h-2 ${announcement.color} w-full rounded-t-2xl`} />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-3 ${announcement.color} rounded-xl text-white`}>
                      <announcement.icon className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                    <Badge variant="outline" className="text-xs">{announcement.date}</Badge>
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
    </>
  )
}
