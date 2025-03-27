"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Mail, Trophy, Star, Shield, Flame } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function EquipoPage() {
  const [loadMore, setLoadMore] = useState(false)

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

  // Mostrar solo los primeros 4 miembros inicialmente
  const visibleMembers = loadMore ? teamMembers : teamMembers.slice(0, 4)

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
              Nuestro Equipo
            </Badge>
          </div>
          <h1 className="text-5xl font-bold mb-4">Profesionales Elite</h1>
          <p className="text-xl text-red-100 max-w-3xl">
            Conoce a los hombres y mujeres que conforman nuestro cuerpo de bomberos, profesionales altamente capacitados
            y comprometidos con la seguridad de la comunidad.
          </p>
        </div>
      </header>

      <main className="py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {visibleMembers.map((member, index) => (
              <Card
                key={index}
                className="group bg-white hover:bg-gray-50 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 hover:rotate-2 overflow-hidden shadow-lg hover:shadow-xl"
              >
                <CardContent className="p-0">
                  <div className="relative overflow-hidden">
                    <Image
                      src={member.image || "/placeholder.svg"}
                      alt={member.name}
                      width={400}
                      height={400}
                      className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <Badge className="absolute top-4 right-4 bg-gradient-to-r from-red-400 to-red-600 text-white border-0 transform rotate-3">
                      {member.grade}
                    </Badge>

                    {/* Overlay con información adicional */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 transform translate-y-8 group-hover:translate-y-0 transition-transform duration-300">
                      <div className="space-y-2">
                        <p className="text-white font-medium">Profesión: {member.profession}</p>
                        <p className="text-gray-300 text-sm">Experiencia: {member.years} años</p>
                        <p className="text-gray-300 text-sm line-clamp-3">{member.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="font-bold text-xl text-gray-900 mb-1">{member.name}</h3>
                    <p className="text-red-600 mb-4">{member.role}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {member.specialties.map((specialty, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="bg-red-100 text-red-700 transform hover:scale-110 hover:rotate-3 transition-transform duration-300"
                        >
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {Array.from({ length: member.achievements }).map((_, i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-full border-2 border-white bg-red-100 flex items-center justify-center transform hover:scale-110 hover:rotate-12 transition-transform duration-300"
                          >
                            <Star className="h-4 w-4 text-amber-500" />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <Link
                          href="#"
                          className="text-red-500 hover:text-red-700 transition-colors transform hover:scale-110 hover:rotate-12 transition-all duration-300"
                        >
                          <Mail className="h-5 w-5" />
                        </Link>
                        <Link
                          href="#"
                          className="text-red-500 hover:text-red-700 transition-colors transform hover:scale-110 hover:rotate-12 transition-all duration-300"
                        >
                          <Trophy className="h-5 w-5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Botón Cargar Más */}
          <div className="flex justify-center mt-16">
            <Button
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg transform hover:scale-105 transition-all duration-300"
              onClick={() => setLoadMore(!loadMore)}
            >
              {loadMore ? (
                <>
                  <ChevronUp className="mr-2 h-5 w-5" />
                  Mostrar Menos
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-5 w-5" />
                  Cargar Más
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

