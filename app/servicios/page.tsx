"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Flame,
  Car,
  Anchor,
  PawPrintIcon as Paw,
  Stethoscope,
  AlertTriangle,
  Shield,
  Award,
  Calendar,
  Send,
  CheckCircle,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function ServiciosPage() {
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
              Servicios
            </Badge>
          </div>
          <h1 className="text-5xl font-bold mb-4">Servicios Profesionales</h1>
          <p className="text-xl text-red-100 max-w-3xl">
            Ofrecemos una amplia gama de servicios especializados para garantizar la seguridad y bienestar de nuestra
            comunidad
          </p>
        </div>
      </header>

      <main className="py-24">
        <div className="container">
          {/* Emergencias Section */}
          <div className="mb-20">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge
                variant="outline"
                className="mb-4 text-red-600 border-red-200 px-4 py-2 transform hover:scale-110 transition-transform duration-300"
              >
                Emergencias
              </Badge>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent">
                Atención de Emergencias
              </h2>
              <p className="text-lg text-gray-600">
                Respondemos rápidamente a situaciones de emergencia con personal altamente capacitado y equipamiento
                especializado
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Flame,
                  title: "Incendios",
                  description:
                    "Respuesta rápida y profesional a incendios estructurales, forestales e industriales con equipos especializados y personal altamente capacitado.",
                  gradient: "from-red-500 to-red-600",
                  badge: { text: "Prioritario", color: "bg-red-50 text-red-600" },
                  certifications: 4,
                },
                {
                  icon: Car,
                  title: "Accidentes Vehiculares",
                  description:
                    "Rescate y extricación de víctimas en accidentes de tránsito, utilizando herramientas hidráulicas y técnicas avanzadas de estabilización.",
                  gradient: "from-amber-500 to-amber-600",
                  badge: { text: "Especializado", color: "bg-amber-50 text-amber-600" },
                  certifications: 3,
                },
                {
                  icon: Anchor,
                  title: "Rescates con Cuerda",
                  description:
                    "Operaciones de rescate en altura, espacios confinados y zonas de difícil acceso mediante técnicas avanzadas de cuerdas y sistemas de anclaje.",
                  gradient: "from-blue-500 to-blue-600",
                  badge: { text: "Técnico", color: "bg-blue-50 text-blue-600" },
                  certifications: 3,
                },
                {
                  icon: Paw,
                  title: "Rescate Animal",
                  description:
                    "Asistencia especializada para el rescate de animales en situaciones de peligro, tanto domésticos como silvestres, con protocolos de manejo seguro.",
                  gradient: "from-green-500 to-green-600",
                  badge: { text: "Especializado", color: "bg-green-50 text-green-600" },
                  certifications: 2,
                },
                {
                  icon: Stethoscope,
                  title: "Emergencias Médicas",
                  description:
                    "Atención prehospitalaria de emergencias médicas, incluyendo soporte vital básico y avanzado, en coordinación con servicios de ambulancia.",
                  gradient: "from-purple-500 to-purple-600",
                  badge: { text: "Certificado", color: "bg-purple-50 text-purple-600" },
                  certifications: 3,
                },
                {
                  icon: AlertTriangle,
                  title: "Materiales Peligrosos",
                  description:
                    "Respuesta a incidentes con materiales peligrosos, incluyendo contención, control y descontaminación, con equipos de protección especializados.",
                  gradient: "from-red-500 to-red-600",
                  badge: { text: "Hazmat", color: "bg-red-50 text-red-600" },
                  certifications: 4,
                },
              ].map((service, index) => (
                <Card
                  key={index}
                  className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:rotate-1"
                >
                  <CardContent className="p-8 space-y-4">
                    <div
                      className={cn(
                        "bg-gradient-to-br rounded-2xl w-16 h-16 flex items-center justify-center mb-6",
                        "group-hover:scale-110 transition-transform duration-500 group-hover:rotate-12",
                        "shadow-lg group-hover:shadow-xl",
                        service.gradient,
                      )}
                    >
                      <service.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Badge variant="secondary" className={service.badge.color}>
                        {service.badge.text}
                      </Badge>
                      <h3 className="text-2xl font-bold text-gray-900">{service.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{service.description}</p>
                    </div>
                    <div className="flex items-center gap-4 pt-4">
                      <div className="flex -space-x-2">
                        {Array.from({ length: service.certifications }).map((_, i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-full border-2 border-white bg-red-100 flex items-center justify-center transform hover:scale-110 hover:rotate-12 transition-transform duration-300"
                          >
                            <Award className="h-4 w-4 text-red-600" />
                          </div>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">{service.certifications} Certificaciones</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Capacitación Section */}
          <div className="mt-32">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge
                variant="outline"
                className="mb-4 text-red-600 border-red-200 px-4 py-2 transform hover:scale-110 transition-transform duration-300"
              >
                Formación
              </Badge>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent">
                Capacitación y Entrenamiento
              </h2>
              <p className="text-lg text-gray-600">
                Programas especializados para empresas, instituciones y comunidades, diseñados para preparar ante
                situaciones de emergencia
              </p>
            </div>

            <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-2xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <Badge
                    variant="outline"
                    className="mb-4 text-red-600 border-red-200 px-4 py-2 transform hover:scale-110 transition-transform duration-300"
                  >
                    Capacitación
                  </Badge>
                  <h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent">
                    Formación y Entrenamiento
                  </h3>
                  <div className="space-y-4 text-gray-700">
                    <p>
                      Ofrecemos programas de capacitación especializados para empresas, instituciones educativas y
                      comunidades, diseñados para preparar a las personas ante situaciones de emergencia.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Prevención y control de incendios</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Primeros auxilios básicos y avanzados</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Evacuación y planes de emergencia</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Manejo de materiales peligrosos</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Formación de brigadas de emergencia</span>
                      </li>
                    </ul>
                  </div>
                  <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <Button className="bg-red-600 hover:bg-red-700 text-white transform hover:scale-105 transition-all duration-300">
                      <Calendar className="mr-2 h-4 w-4" />
                      Agendar Reunión
                    </Button>
                    <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Solicitud
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -top-6 -left-6 w-32 h-32 bg-red-100 rounded-full opacity-50"></div>
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-amber-100 rounded-full opacity-50"></div>
                  <div className="relative rounded-xl overflow-hidden shadow-2xl transform hover:scale-105 transition-all duration-500">
                    <Image
                      src="/placeholder.svg?height=400&width=600"
                      alt="Capacitación de Bomberos"
                      width={600}
                      height={400}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

