"use client";

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  PhoneCall,
  Clock,
  Shield,
  MapPin,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Flame,
  Send,
  Loader2,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function ContactoPage() {
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formSubmitted, setFormSubmitted] = useState(false)

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
              Contacto
            </Badge>
          </div>
          <h1 className="text-5xl font-bold mb-4">Estamos para Servirte</h1>
          <p className="text-xl text-red-100 max-w-3xl">
            Ponte en contacto con nosotros para cualquier consulta, solicitud o información adicional. Estamos
            disponibles para atenderte.
          </p>
        </div>
      </header>

      <main className="py-24">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <div className="space-y-6">
                {[
                  {
                    icon: PhoneCall,
                    title: "Emergencias",
                    value: "911",
                    gradient: "from-red-500 to-red-600",
                    valueColor: "text-red-600",
                  },
                  {
                    icon: PhoneCall,
                    title: "Central de Bomberos",
                    value: "116",
                    gradient: "from-red-500 to-red-600",
                    valueColor: "text-red-600",
                  },
                  {
                    icon: PhoneCall,
                    title: "Teléfono Compañía",
                    value: "+1234567890",
                    gradient: "from-red-500 to-red-600",
                    valueColor: "text-gray-600",
                  },
                  {
                    icon: Clock,
                    title: "Horario Administrativo",
                    value: "Lunes a Viernes: 8:00 - 18:00",
                    gradient: "from-red-500 to-red-600",
                    valueColor: "text-gray-600",
                  },
                  {
                    icon: MapPin,
                    title: "Ubicación",
                    value: "Av. Principal 123, Ciudad",
                    gradient: "from-red-500 to-red-600",
                    valueColor: "text-gray-600",
                  },
                  {
                    icon: Mail,
                    title: "Email",
                    value: "contacto@bomberos.com",
                    gradient: "from-red-500 to-red-600",
                    valueColor: "text-gray-600",
                  },
                ].map((item, index) => (
                  <Card
                    key={index}
                    className="group hover:shadow-lg transition-all duration-500 transform hover:scale-105 hover:-translate-y-1 hover:rotate-1"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "bg-gradient-to-br rounded-2xl p-4",
                            "group-hover:scale-110 transition-transform duration-500 group-hover:rotate-12",
                            item.gradient,
                          )}
                        >
                          <item.icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">{item.title}</p>
                          <p className={item.valueColor}>{item.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-8 flex gap-4">
                {[
                  { icon: Facebook, label: "Facebook" },
                  { icon: Twitter, label: "Twitter" },
                  { icon: Instagram, label: "Instagram" },
                ].map((social, index) => (
                  <Button key={index} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                    <social.icon className="h-5 w-5 mr-2" />
                    {social.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle>Envío de Documentos Oficiales</CardTitle>
                  <CardDescription>
                    Complete el formulario para enviar documentos oficiales a nuestra institución
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitForm} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nombre Completo</Label>
                        <Input id="name" placeholder="Ingrese su nombre" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input id="email" type="email" placeholder="correo@ejemplo.com" required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Asunto</Label>
                      <Input id="subject" placeholder="Asunto del documento" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Mensaje</Label>
                      <Textarea
                        id="message"
                        placeholder="Describa brevemente el contenido del documento"
                        className="min-h-[120px]"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="file">Adjuntar Documento</Label>
                      <Input id="file" type="file" className="bg-gray-50" />
                      <p className="text-xs text-gray-500 mt-1">Formatos aceptados: PDF, DOC, DOCX (Máx. 5MB)</p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700 text-white transform hover:scale-105 transition-all duration-300"
                      disabled={formSubmitting || formSubmitted}
                    >
                      {formSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : formSubmitted ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          ¡Enviado con Éxito!
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Enviar Documento
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="relative h-[300px] mt-8 rounded-xl overflow-hidden shadow-xl transform hover:scale-105 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 rounded-2xl transform -rotate-3 opacity-75"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 rounded-2xl transform rotate-3 opacity-75"></div>
                <div className="relative h-full bg-gradient-to-r from-red-800 to-red-900 rounded-2xl overflow-hidden">
                  {/* Aquí iría el mapa */}
                  <div className="w-full h-full flex items-center justify-center text-white/60">Mapa de ubicación</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

