"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { MainFooter } from "@/components/main-footer"
import { Shield, Mail, Phone, Award, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { getActiveMembers, getTotalMembers, getTotalMembersByArea } from "@/data/team-data"

const ITEMS_PER_PAGE = 12 // Mostrar 12 efectivos por carga

export default function EquipoPage() {
  // Obtener todos los efectivos activos desde la base de datos
  const allEfectivos = getActiveMembers()
  const totalEfectivos = getTotalMembers()

  // Estado para la paginación
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE)
  const [isLoading, setIsLoading] = useState(false)
  const [scrollInfiniteEnabled, setScrollInfiniteEnabled] = useState(false) // Nuevo estado
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Obtener totales por área
  const totalOperaciones = getTotalMembersByArea("Operaciones")
  const totalSanidad = getTotalMembersByArea("Sanidad")
  const totalServicios = getTotalMembersByArea("Servicios")
  const totalAdministracion = getTotalMembersByArea("Administración")

  // Efectivos a mostrar actualmente
  const efectivos = allEfectivos.slice(0, displayedCount)
  const hasMore = displayedCount < allEfectivos.length

  // Cargar más efectivos
  const loadMore = () => {
    setIsLoading(true)
    // Activar scroll infinito al hacer clic por primera vez
    if (!scrollInfiniteEnabled) {
      setScrollInfiniteEnabled(true)
    }
    setTimeout(() => {
      setDisplayedCount((prev) => Math.min(prev + ITEMS_PER_PAGE, allEfectivos.length))
      setIsLoading(false)
    }, 500) // Simular delay de carga
  }

  // Intersection Observer para scroll infinito automático (solo si está activado)
  useEffect(() => {
    if (!hasMore || isLoading || !scrollInfiniteEnabled) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedCount, hasMore, scrollInfiniteEnabled])

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20">
      <MainNav />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-r from-primary to-red-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <Badge className="mb-6 bg-white/20 backdrop-blur-sm border-white/30 text-white text-sm">
            Nuestro Equipo
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Bomberos Profesionales
          </h1>
          <p className="text-lg md:text-xl text-red-100 max-w-3xl leading-relaxed">
            Conoce a los hombres y mujeres que trabajan incansablemente para proteger nuestra comunidad
          </p>
        </div>
      </section>

      <main className="flex-1">
        {/* Equipo Principal */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 px-4 py-2">
                Compañía de Bomberos 163
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Nuestro Equipo Completo</h2>
              <p className="text-lg text-muted-foreground">
                Profesionales altamente capacitados dedicados a servir y proteger
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {efectivos.map((efectivo, index) => (
                <Card
                  key={index}
                  className="bento-item glass border-primary/10 hover:border-primary/30 overflow-hidden group"
                >
                  <div className="relative h-64 overflow-hidden">
                    <Image
                      src={efectivo.imagen || "/placeholder.svg"}
                      alt={efectivo.nombre}
                      width={400}
                      height={400}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-white">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{efectivo.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white">
                          <Phone className="h-3 w-3" />
                          <span>{efectivo.telefono}</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-primary text-white border-0">{efectivo.area}</Badge>
                    </div>
                  </div>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <Badge variant="outline" className="text-xs">
                        {efectivo.años} años de servicio
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight">{efectivo.nombre}</CardTitle>
                    <p className="text-sm text-muted-foreground font-medium">{efectivo.cargo}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          Especialidades:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {efectivo.especialidades.map((esp, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {esp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Indicador de carga y botón Ver Más */}
            {hasMore && (
              <div className="mt-12 text-center">
                <div ref={loadMoreRef} className="py-8">
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-muted-foreground">Cargando más efectivos...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        Mostrando {efectivos.length} de {allEfectivos.length} efectivos
                      </p>
                      <Button
                        onClick={loadMore}
                        size="lg"
                        className="bg-gradient-to-r from-primary to-red-800 hover:from-red-700 hover:to-red-900 text-white px-8"
                      >
                        {scrollInfiniteEnabled ? "Ver Más Efectivos" : "Ver Más (Carga Automática)"}
                      </Button>
                      {!scrollInfiniteEnabled && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Al hacer clic, se activará la carga automática al hacer scroll
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mensaje cuando se muestran todos */}
            {!hasMore && efectivos.length > ITEMS_PER_PAGE && (
              <div className="mt-12 text-center">
                <Card className="max-w-md mx-auto glass border-primary/10">
                  <CardContent className="p-6">
                    <Shield className="h-12 w-12 text-primary mx-auto mb-3" />
                    <p className="font-semibold text-lg mb-2">¡Has visto todo el equipo!</p>
                    <p className="text-sm text-muted-foreground">
                      {allEfectivos.length} efectivos comprometidos con nuestra comunidad
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>

        {/* Valores del Equipo */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Lo Que Nos Une</h2>
                <p className="text-lg text-muted-foreground">
                  Valores compartidos que fortalecen nuestro compromiso con la comunidad
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="glass border-primary/10">
                  <CardContent className="p-8">
                    <h3 className="text-xl font-bold mb-3 text-primary">Trabajo en Equipo</h3>
                    <p className="text-muted-foreground">
                      Cada miembro es esencial. Confiamos unos en otros y trabajamos coordinadamente para lograr
                      nuestros objetivos de salvar vidas y proteger propiedades.
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass border-primary/10">
                  <CardContent className="p-8">
                    <h3 className="text-xl font-bold mb-3 text-primary">Capacitación Continua</h3>
                    <p className="text-muted-foreground">
                      Nos mantenemos actualizados con las últimas técnicas y tecnologías en rescate, combate de
                      incendios y atención de emergencias.
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass border-primary/10">
                  <CardContent className="p-8">
                    <h3 className="text-xl font-bold mb-3 text-primary">Compromiso con la Comunidad</h3>
                    <p className="text-muted-foreground">
                      Servimos con orgullo y dedicación. Nuestra misión es proteger a cada ciudadano y responder con
                      excelencia en cada emergencia.
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass border-primary/10">
                  <CardContent className="p-8">
                    <h3 className="text-xl font-bold mb-3 text-primary">Disponibilidad 24/7</h3>
                    <p className="text-muted-foreground">
                      Estamos listos en todo momento. Nuestro equipo mantiene guardias rotativas para garantizar
                      respuesta inmediata cualquier día del año.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Estadísticas del Equipo */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Nuestro Equipo en Números</h2>
              <p className="text-lg text-muted-foreground">
                Una fuerza preparada y comprometida al servicio de la comunidad
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl mx-auto">
              <Card className="glass border-primary/10 text-center">
                <CardContent className="p-6">
                  <div className="text-4xl font-bold text-primary mb-2">{totalEfectivos}</div>
                  <p className="text-sm text-muted-foreground">Total Efectivos</p>
                </CardContent>
              </Card>

              <Card className="glass border-primary/10 text-center">
                <CardContent className="p-6">
                  <div className="text-4xl font-bold text-primary mb-2">{totalOperaciones}</div>
                  <p className="text-sm text-muted-foreground">Operaciones</p>
                </CardContent>
              </Card>

              <Card className="glass border-primary/10 text-center">
                <CardContent className="p-6">
                  <div className="text-4xl font-bold text-primary mb-2">{totalSanidad}</div>
                  <p className="text-sm text-muted-foreground">Sanidad</p>
                </CardContent>
              </Card>

              <Card className="glass border-primary/10 text-center">
                <CardContent className="p-6">
                  <div className="text-4xl font-bold text-primary mb-2">{totalServicios}</div>
                  <p className="text-sm text-muted-foreground">Servicios</p>
                </CardContent>
              </Card>

              <Card className="glass border-primary/10 text-center">
                <CardContent className="p-6">
                  <div className="text-4xl font-bold text-primary mb-2">{totalAdministracion}</div>
                  <p className="text-sm text-muted-foreground">Administración</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Llamado a la acción */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <Card className="max-w-4xl mx-auto glass-strong border-primary/20 bg-gradient-to-r from-primary/5 to-red-800/5">
              <CardContent className="p-8 md:p-12 text-center">
                <Shield className="h-16 w-16 mx-auto mb-6 text-primary" />
                <h3 className="text-2xl md:text-3xl font-bold mb-4">¿Quieres Formar Parte de Nuestro Equipo?</h3>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Si tienes vocación de servicio, compromiso y deseas contribuir a la seguridad de nuestra comunidad,
                  te invitamos a conocer nuestro proceso de admisión.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/admision"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-gradient-to-r from-primary to-red-800 text-white hover:from-red-700 hover:to-red-900 h-11 px-8 transition-all transform hover:scale-105 shadow-lg"
                  >
                    Ver Proceso de Admisión
                  </Link>
                  <Link
                    href="/contacto"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-primary/30 hover:bg-primary/10 h-11 px-8 transition-all"
                  >
                    Más Información
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <MainFooter />
    </div>
  )
}
