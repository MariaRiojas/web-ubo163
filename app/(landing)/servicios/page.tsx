"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  Flame,
  Car,
  Mountain,
  Stethoscope,
  AlertTriangle,
  Award,
  GraduationCap,
  CheckCircle2,
  Phone,
} from "lucide-react"
import Link from "next/link"

export default function ServiciosPage() {
  // Servicios de emergencia
  const emergencias = [
    {
      icon: Flame,
      titulo: "Incendios Estructurales y Forestales",
      descripcion: "Respuesta rápida y profesional ante incendios en edificaciones, viviendas y áreas forestales.",
      color: "from-red-500 to-red-700",
    },
    {
      icon: Car,
      titulo: "Accidentes Vehiculares",
      descripcion: "Rescate y excarcelación de víctimas en accidentes de tránsito con equipamiento especializado.",
      color: "from-red-600 to-red-800",
    },
    {
      icon: Mountain,
      titulo: "Rescate con Cuerda",
      descripcion: "Operaciones de rescate vertical en altura, espacios confinados y terrenos difíciles.",
      color: "from-red-700 to-red-900",
    },
    {
      icon: Mountain,
      titulo: "Rescate Animal",
      descripcion: "Rescate seguro de mascotas y animales en situaciones de peligro o lugares de difícil acceso.",
      color: "from-amber-500 to-amber-700",
    },
    {
      icon: Stethoscope,
      titulo: "Emergencias Médicas",
      descripcion: "Atención prehospitalaria y primeros auxilios avanzados en escena de emergencia.",
      color: "from-red-500 to-amber-600",
    },
    {
      icon: AlertTriangle,
      titulo: "Materiales Peligrosos (Hazmat)",
      descripcion: "Identificación, contención y mitigación de incidentes con materiales peligrosos.",
      color: "from-amber-600 to-red-700",
    },
  ]

  // Servicios de capacitación
  const capacitacion = [
    "Curso ESBAS (Educación y Servicios Básicos) - 30 lecciones",
    "Primeros Auxilios Básicos y Avanzados",
    "Manejo de Extintores y Prevención de Incendios",
    "Evacuación y Planes de Emergencia",
    "Rescate y Salvamento",
    "Atención Prehospitalaria",
  ]

  // Certificaciones
  const certificaciones = [
    { titulo: "ESBAS", organismo: "Cuerpo General de Bomberos Voluntarios del Perú" },
    { titulo: "Primeros Auxilios", organismo: "Cruz Roja Peruana" },
    { titulo: "Materiales Peligrosos", organismo: "NFPA International" },
    { titulo: "Rescate en Altura", organismo: "IRATA Internacional" },
  ]

  return (
    <>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-r from-primary to-red-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <Badge className="mb-6 bg-white/20 backdrop-blur-sm border-white/30 text-white text-sm">
            Nuestros Servicios
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Servicios Profesionales
          </h1>
          <p className="text-lg md:text-xl text-red-100 max-w-3xl leading-relaxed">
            Brindamos servicios especializados de emergencia y capacitación para garantizar la seguridad de nuestra comunidad
          </p>
        </div>
      </section>

      <main className="flex-1">
        {/* Servicios de Emergencia */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 px-4 py-2">
                Respuesta a Emergencias
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Tipos de Emergencias que Atendemos</h2>
              <p className="text-lg text-muted-foreground">
                Estamos preparados para responder a todo tipo de emergencias las 24 horas del día
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {emergencias.map((servicio, index) => (
                <Card
                  key={index}
                  className="bento-item glass border-primary/10 hover:border-primary/30 overflow-hidden group"
                >
                  <div className={`h-2 bg-gradient-to-r ${servicio.color}`}></div>
                  <CardHeader>
                    <div className={`w-16 h-16 bg-gradient-to-br ${servicio.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      {servicio.icon && <servicio.icon className="h-8 w-8 text-white" />}
                    </div>
                    <CardTitle className="text-xl leading-tight">{servicio.titulo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{servicio.descripcion}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Llamada a la acción de emergencia */}
            <div className="mt-16 text-center">
              <Card className="max-w-2xl mx-auto glass-strong border-primary/20 bg-gradient-to-r from-primary/5 to-red-800/5">
                <CardContent className="p-8 md:p-12">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">¿Tienes una Emergencia?</h3>
                  <p className="text-lg text-muted-foreground mb-6">
                    Nuestro equipo está listo para responder las 24 horas del día, los 365 días del año
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" className="bg-gradient-to-r from-primary to-red-800 hover:from-red-700 hover:to-red-900 text-white text-lg">
                      <Phone className="mr-2 h-5 w-5" />
                      Emergencias: 911
                    </Button>
                    <Button size="lg" variant="outline" className="text-lg" asChild>
                      <Link href="/contacto">Contacto General: 116</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Capacitación */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 px-4 py-2">
                Formación y Capacitación
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Programas de Capacitación</h2>
              <p className="text-lg text-muted-foreground">
                Ofrecemos cursos especializados para bomberos y la comunidad en general
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Lista de cursos */}
              <Card className="glass border-primary/10">
                <CardHeader>
                  <div className="w-14 h-14 bg-gradient-to-br from-primary to-red-800 rounded-2xl flex items-center justify-center mb-4">
                    <GraduationCap className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Cursos Disponibles</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {capacitacion.map((curso, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{curso}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Certificaciones */}
              <Card className="glass border-primary/10">
                <CardHeader>
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-red-700 rounded-2xl flex items-center justify-center mb-4">
                    <Award className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Certificaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    Nuestros cursos están respaldados por organismos nacionales e internacionales:
                  </p>
                  <ul className="space-y-4">
                    {certificaciones.map((cert, index) => (
                      <li key={index} className="border-l-4 border-primary pl-4">
                        <div className="font-bold text-primary">{cert.titulo}</div>
                        <div className="text-sm text-muted-foreground">{cert.organismo}</div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* CTA Capacitación */}
            <div className="mt-12 text-center">
              <Link href="/admision">
                <Button size="lg" className="bg-gradient-to-r from-primary to-red-800 hover:from-red-700 hover:to-red-900 text-white px-8">
                  Inscríbete en Nuestros Cursos
                  <GraduationCap className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Compromiso de Calidad */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <Card className="max-w-4xl mx-auto glass border-primary/10">
              <CardContent className="p-8 md:p-12 text-center">
                <h3 className="text-2xl md:text-3xl font-bold mb-6">Nuestro Compromiso de Calidad</h3>
                <div className="grid md:grid-cols-3 gap-8">
                  <div>
                    <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                    <p className="text-muted-foreground">Disponibilidad permanente</p>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-primary mb-2">&lt;10min</div>
                    <p className="text-muted-foreground">Tiempo de respuesta promedio</p>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-primary mb-2">+70 años</div>
                    <p className="text-muted-foreground">De servicio a la comunidad</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

    </>
  )
}
