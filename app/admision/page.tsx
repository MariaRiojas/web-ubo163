"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MainNav } from "@/components/main-nav"
import { MainFooter } from "@/components/main-footer"
import {
  CheckCircle2,
  Clock,
  GraduationCap,
  Heart,
  Shield,
  Users,
  FileText,
  Calendar,
  Award,
  ArrowRight
} from "lucide-react"
import { useState } from "react"

export default function AdmisionPage() {
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simular envío del formulario
    setTimeout(() => {
      setIsSubmitting(false)
      setFormSubmitted(true)

      // Resetear después de 5 segundos
      setTimeout(() => {
        setFormSubmitted(false)
        const form = e.target as HTMLFormElement
        form.reset()
      }, 5000)
    }, 1500)
  }

  // Requisitos de admisión
  const requisitos = [
    {
      icon: Calendar,
      titulo: "Edad",
      descripcion: "Tener entre 18 y 40 años de edad",
      color: "bg-red-500",
    },
    {
      icon: Heart,
      titulo: "Salud",
      descripcion: "Gozar de buena salud física y mental",
      color: "bg-red-600",
    },
    {
      icon: GraduationCap,
      titulo: "Educación",
      descripcion: "Educación secundaria completa como mínimo",
      color: "bg-red-700",
    },
    {
      icon: Users,
      titulo: "Disponibilidad",
      descripcion: "Disponibilidad de tiempo para capacitación y guardias",
      color: "bg-red-800",
    },
    {
      icon: Shield,
      titulo: "Antecedentes",
      descripcion: "No tener antecedentes penales ni policiales",
      color: "bg-red-900",
    },
    {
      icon: FileText,
      titulo: "Documentación",
      descripcion: "Presentar documentación completa y vigente",
      color: "bg-amber-600",
    },
  ]

  // Proceso de admisión
  const proceso = [
    {
      paso: "1",
      titulo: "Postulación",
      descripcion: "Completa el formulario de postulación en línea con tus datos personales y motivación.",
      tiempo: "15 min",
    },
    {
      paso: "2",
      titulo: "Entrevista Personal",
      descripcion: "Entrevista con el comité de admisión para conocer tu motivación y compromiso.",
      tiempo: "30 min",
    },
    {
      paso: "3",
      titulo: "Evaluación Médica",
      descripcion: "Examen médico completo para verificar tu condición física y salud general.",
      tiempo: "1 día",
    },
    {
      paso: "4",
      titulo: "Evaluación Psicológica",
      descripcion: "Evaluación de aptitudes psicológicas necesarias para el servicio de bomberos.",
      tiempo: "2 horas",
    },
    {
      paso: "5",
      titulo: "Pruebas Físicas",
      descripcion: "Evaluación de condición física mediante pruebas estandarizadas.",
      tiempo: "1 día",
    },
    {
      paso: "6",
      titulo: "Capacitación ESBAS",
      descripcion: "Curso de Educación y Servicios Básicos de 30 lecciones teóricas y prácticas.",
      tiempo: "3 meses",
    },
    {
      paso: "7",
      titulo: "Juramento e Incorporación",
      descripcion: "Ceremonia oficial de incorporación como Bombero Voluntario.",
      tiempo: "1 día",
    },
  ]

  // Beneficios
  const beneficios = [
    "Capacitación profesional continua sin costo",
    "Certificación nacional e internacional",
    "Seguro de accidentes y vida",
    "Uniformes y equipamiento completo",
    "Reconocimiento comunitario y social",
    "Desarrollo de habilidades de liderazgo",
    "Experiencia en trabajo en equipo",
    "Servicio a la comunidad",
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20">
      <MainNav />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-r from-primary to-red-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <Badge className="mb-6 bg-white/20 backdrop-blur-sm border-white/30 text-white text-sm">
            Únete al Equipo
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Admisión de Nuevos Bomberos
          </h1>
          <p className="text-lg md:text-xl text-red-100 max-w-3xl leading-relaxed">
            Conviértete en parte de nuestra familia de bomberos voluntarios. Sirve a tu comunidad y desarrolla habilidades que durarán toda la vida.
          </p>
        </div>
      </section>

      <main className="flex-1">
        {/* Requisitos */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 px-4 py-2">
                Requisitos
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Qué necesito para postular?</h2>
              <p className="text-lg text-muted-foreground">
                Conoce los requisitos básicos para iniciar tu camino como bombero voluntario
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requisitos.map((req, index) => (
                <Card
                  key={index}
                  className="bento-item glass border-primary/10 hover:border-primary/30"
                >
                  <CardHeader>
                    <div className={`w-14 h-14 ${req.color} rounded-2xl flex items-center justify-center mb-4`}>
                      <req.icon className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-xl">{req.titulo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{req.descripcion}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Proceso de Admisión */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 px-4 py-2">
                Proceso
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Pasos para Convertirte en Bombero</h2>
              <p className="text-lg text-muted-foreground">
                Un proceso estructurado de 7 etapas que garantiza la formación de bomberos de excelencia
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              {proceso.map((etapa, index) => (
                <Card
                  key={index}
                  className="bento-item glass border-primary/10 hover:border-primary/30 overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="bg-gradient-to-br from-primary to-red-800 text-white p-6 md:p-8 flex items-center justify-center md:w-32">
                      <div className="text-center">
                        <div className="text-4xl md:text-5xl font-bold mb-2">{etapa.paso}</div>
                        <div className="text-sm opacity-90 flex items-center gap-1 justify-center">
                          <Clock className="h-3 w-3" />
                          {etapa.tiempo}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 p-6 md:p-8">
                      <h3 className="text-xl font-bold mb-2">{etapa.titulo}</h3>
                      <p className="text-muted-foreground">{etapa.descripcion}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Beneficios */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 px-4 py-2">
                Beneficios
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Qué ganas al ser Bombero?</h2>
              <p className="text-lg text-muted-foreground">
                Más que un servicio, una experiencia de vida transformadora
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <Card className="glass border-primary/10">
                <CardContent className="p-8 md:p-12">
                  <div className="grid md:grid-cols-2 gap-6">
                    {beneficios.map((beneficio, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-lg">{beneficio}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Formulario de Postulación */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 px-4 py-2">
                Postula Ahora
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Formulario de Postulación</h2>
              <p className="text-lg text-muted-foreground">
                Completa tus datos y da el primer paso para unirte a nuestra compañía
              </p>
            </div>

            <Card className="max-w-2xl mx-auto glass border-primary/10">
              <CardContent className="p-6 md:p-8">
                {formSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">¡Postulación Enviada!</h3>
                    <p className="text-muted-foreground mb-6">
                      Hemos recibido tu postulación correctamente. Nos pondremos en contacto contigo en los próximos días.
                    </p>
                    <Badge className="bg-primary text-white">
                      Revisa tu correo electrónico
                    </Badge>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="nombres">Nombres *</Label>
                        <Input
                          id="nombres"
                          placeholder="Tus nombres completos"
                          required
                          className="glass"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apellidos">Apellidos *</Label>
                        <Input
                          id="apellidos"
                          placeholder="Tus apellidos completos"
                          required
                          className="glass"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="dni">DNI *</Label>
                        <Input
                          id="dni"
                          placeholder="12345678"
                          required
                          maxLength={8}
                          className="glass"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</Label>
                        <Input
                          id="fecha_nacimiento"
                          type="date"
                          required
                          className="glass"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="tu@email.com"
                          required
                          className="glass"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefono">Teléfono *</Label>
                        <Input
                          id="telefono"
                          type="tel"
                          placeholder="+51 999 888 777"
                          required
                          className="glass"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="direccion">Dirección *</Label>
                      <Input
                        id="direccion"
                        placeholder="Tu dirección completa"
                        required
                        className="glass"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="educacion">Nivel de Educación *</Label>
                      <select
                        id="educacion"
                        required
                        className="w-full px-3 py-2 rounded-md border border-input bg-background glass"
                      >
                        <option value="">Selecciona...</option>
                        <option value="secundaria">Secundaria Completa</option>
                        <option value="tecnica">Educación Técnica</option>
                        <option value="universitaria">Universitaria</option>
                        <option value="postgrado">Postgrado</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ocupacion">Ocupación Actual</Label>
                      <Input
                        id="ocupacion"
                        placeholder="¿A qué te dedicas?"
                        className="glass"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="motivacion">¿Por qué quieres ser bombero? *</Label>
                      <Textarea
                        id="motivacion"
                        placeholder="Cuéntanos tu motivación..."
                        required
                        rows={5}
                        className="glass resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experiencia">Experiencia Previa (si la tienes)</Label>
                      <Textarea
                        id="experiencia"
                        placeholder="Describe cualquier experiencia relacionada con emergencias, primeros auxilios, voluntariado, etc."
                        rows={3}
                        className="glass resize-none"
                      />
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <Award className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-900 dark:text-amber-200">
                        Al postular, aceptas participar en todo el proceso de admisión y comprometerte con la capacitación ESBAS si eres aceptado.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-primary to-red-800 hover:from-red-700 hover:to-red-900 text-white text-lg py-6"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Enviando...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          Enviar Postulación
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </div>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <MainFooter />
    </div>
  )
}
