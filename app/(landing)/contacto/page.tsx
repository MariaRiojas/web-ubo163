"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

import { PhoneCall, Clock, MapPin, Mail, Facebook, Twitter, Instagram, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function ContactoPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    asunto: "",
    mensaje: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulamos el envío del formulario
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitSuccess(true)

      // Resetear después de 3 segundos
      setTimeout(() => {
        setSubmitSuccess(false)
        setFormData({
          nombre: "",
          email: "",
          telefono: "",
          asunto: "",
          mensaje: "",
        })
      }, 3000)
    }, 1500)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    })
  }

  const contactInfo = [
    {
      icon: PhoneCall,
      titulo: "Emergencias",
      info: "911",
      descripcion: "Llamadas de emergencia 24/7",
      color: "from-red-500 to-red-700",
    },
    {
      icon: PhoneCall,
      titulo: "Central",
      info: "116",
      descripcion: "Atención general y consultas",
      color: "from-red-600 to-red-800",
    },
    {
      icon: Mail,
      titulo: "Email",
      info: "contacto@bomberos163.pe",
      descripcion: "Consultas y solicitudes",
      color: "from-amber-500 to-red-600",
    },
    {
      icon: MapPin,
      titulo: "Dirección",
      info: "Av. Principal S/N, Ancón",
      descripcion: "Lima, Perú",
      color: "from-red-700 to-amber-600",
    },
    {
      icon: Clock,
      titulo: "Horario",
      info: "Lun - Vie: 8:00 AM - 6:00 PM",
      descripcion: "Atención administrativa",
      color: "from-amber-600 to-red-700",
    },
  ]

  const faqs = [
    {
      pregunta: "¿Cómo reporto una emergencia?",
      respuesta:
        "Para reportar una emergencia, llama inmediatamente al 911. Proporciona tu ubicación exacta, describe la situación y sigue las instrucciones del operador. Mantén la calma y no cuelgues hasta que se te indique.",
    },
    {
      pregunta: "¿Ofrecen servicios de inspección?",
      respuesta:
        "Sí, realizamos inspecciones de seguridad para viviendas, comercios e industrias. Puedes solicitar una inspección contactándonos al 116 o enviando un correo a contacto@bomberos163.pe. Nuestro equipo evaluará las condiciones de seguridad y te proporcionará recomendaciones.",
    },
    {
      pregunta: "¿Cómo puedo unirme como bombero voluntario?",
      respuesta:
        "Para unirte como bombero voluntario, debes cumplir con ciertos requisitos de edad, salud y disponibilidad. Visita nuestra página de Admisión para conocer el proceso completo y los requisitos necesarios. También puedes contactarnos para más información sobre el próximo proceso de reclutamiento.",
    },
    {
      pregunta: "¿Realizan capacitaciones a empresas?",
      respuesta:
        "Sí, ofrecemos cursos de capacitación especializados para empresas en temas como manejo de extintores, evacuación, primeros auxilios y prevención de incendios. Contáctanos para diseñar un programa de capacitación adaptado a las necesidades de tu organización.",
    },
  ]

  return (
    <>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-r from-primary to-red-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <Badge className="mb-6 bg-white/20 backdrop-blur-sm border-white/30 text-white text-sm">
            Contáctanos
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Estamos Aquí para Ayudarte
          </h1>
          <p className="text-lg md:text-xl text-red-100 max-w-3xl leading-relaxed">
            Ponte en contacto con nosotros para consultas, solicitudes o cualquier información que necesites
          </p>
        </div>
      </section>

      <main className="flex-1">
        {/* Formulario y Contacto */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Formulario */}
              <div>
                <Card className="glass border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-2xl">Envíanos un Mensaje</CardTitle>
                    <p className="text-muted-foreground">
                      Completa el formulario y nos pondremos en contacto contigo lo antes posible
                    </p>
                  </CardHeader>
                  <CardContent>
                    {submitSuccess ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-center">¡Mensaje Enviado!</h3>
                        <p className="text-center text-muted-foreground">
                          Gracias por contactarnos. Te responderemos pronto.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="nombre">Nombre Completo *</Label>
                          <Input
                            id="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            placeholder="Ingrese su nombre completo"
                            required
                            disabled={isSubmitting}
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={handleChange}
                              placeholder="correo@ejemplo.com"
                              required
                              disabled={isSubmitting}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="telefono">Teléfono</Label>
                            <Input
                              id="telefono"
                              type="tel"
                              value={formData.telefono}
                              onChange={handleChange}
                              placeholder="+51 999 000 000"
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="asunto">Asunto *</Label>
                          <Input
                            id="asunto"
                            value={formData.asunto}
                            onChange={handleChange}
                            placeholder="¿Sobre qué deseas consultarnos?"
                            required
                            disabled={isSubmitting}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="mensaje">Mensaje *</Label>
                          <Textarea
                            id="mensaje"
                            value={formData.mensaje}
                            onChange={handleChange}
                            placeholder="Escribe tu mensaje aquí..."
                            className="min-h-[150px]"
                            required
                            disabled={isSubmitting}
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-primary to-red-800 hover:from-red-700 hover:to-red-900 text-white"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            "Enviar Mensaje"
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Información de Contacto */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-6">Información de Contacto</h2>
                  <div className="space-y-4">
                    {contactInfo.map((item, index) => (
                      <Card key={index} className="glass border-primary/10 hover:border-primary/30 transition-all group">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
                            >
                              <item.icon className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-lg mb-1">{item.titulo}</h3>
                              <p className="text-primary font-semibold">{item.info}</p>
                              <p className="text-sm text-muted-foreground">{item.descripcion}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Redes Sociales */}
                <Card className="glass border-primary/10">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-4">Síguenos en Redes Sociales</h3>
                    <div className="flex gap-3">
                      {[
                        { Icon: Facebook, label: "Facebook" },
                        { Icon: Twitter, label: "Twitter" },
                        { Icon: Instagram, label: "Instagram" },
                      ].map((social, index) => (
                        <Link
                          key={index}
                          href="#"
                          className="w-12 h-12 bg-gradient-to-br from-primary to-red-800 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform"
                        >
                          <social.Icon className="h-5 w-5" />
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Mapa */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Nuestra Ubicación</h2>
              <p className="text-lg text-muted-foreground">Encuéntranos en Ancón, Lima</p>
            </div>
            <Card className="glass border-primary/10 overflow-hidden max-w-5xl mx-auto">
              <div className="relative h-[400px] md:h-[500px] bg-gradient-to-br from-primary/10 to-red-800/10 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <MapPin className="h-16 w-16 text-primary mx-auto" />
                  <p className="text-lg font-medium">Mapa de Ubicación</p>
                  <p className="text-sm text-muted-foreground">Av. Principal S/N, Ancón, Lima, Perú</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <Badge variant="outline" className="mb-4 text-primary border-primary/30 px-4 py-2">
                  Preguntas Frecuentes
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Tienes Dudas?</h2>
                <p className="text-lg text-muted-foreground">
                  Encuentra respuestas a las preguntas más comunes
                </p>
              </div>

              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="glass border-primary/10 rounded-2xl px-6 overflow-hidden"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-6">
                      <span className="font-bold text-lg">{faq.pregunta}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-6">
                      {faq.respuesta}
                      {faq.pregunta.includes("voluntario") && (
                        <Link href="/admision" className="block mt-3 text-primary font-medium hover:underline">
                          Ver proceso de admisión →
                        </Link>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* Nota adicional */}
              <Card className="mt-8 glass-strong border-primary/20 bg-gradient-to-r from-amber-500/10 to-red-800/10">
                <CardContent className="p-6 flex items-start gap-4">
                  <AlertCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold mb-2">¿No encontraste lo que buscabas?</h3>
                    <p className="text-muted-foreground text-sm">
                      Si tu pregunta no está aquí, no dudes en contactarnos directamente. Estamos disponibles para
                      ayudarte con cualquier consulta adicional.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

    </>
  )
}
