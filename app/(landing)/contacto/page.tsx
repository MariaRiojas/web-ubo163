"use client"

import { useState } from "react"
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, Siren, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { companyConfig } from "@/company.config"
import { SiteText } from "@/components/site-content/site-text"

export default function ContactoPage() {
  const [formState, setFormState] = useState<"idle" | "sending" | "sent">("idle")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormState("sending")
    setTimeout(() => setFormState("sent"), 1500)
  }

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative min-h-[50vh] flex items-end overflow-hidden bg-black">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(220,38,38,0.1)_0%,_transparent_50%)]" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

        <div className="container max-w-7xl mx-auto px-6 md:px-8 relative z-10 pt-32 pb-20">
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-[1px] w-12 bg-red-500" />
              <SiteText contentKey="contacto.hero.overline" fallback="Comunícate" className="text-red-400 text-sm font-mono tracking-[0.3em] uppercase" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.9] text-white">
              <SiteText contentKey="contacto.hero.title" fallback="CONTACTO" />
            </h1>
            <div className="h-1 w-16 bg-red-500" />
            <SiteText as="p" contentKey="contacto.hero.subtitle" className="text-lg text-zinc-400 max-w-lg leading-relaxed"
              fallback="¿Tienes preguntas, quieres ser voluntario o necesitas coordinar una visita? Escríbenos." />
          </div>
        </div>
      </section>

      {/* ─── EMERGENCIA BANNER ─── */}
      <section className="bg-red-600 py-4">
        <div className="container max-w-7xl mx-auto px-6 md:px-8">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Siren className="w-5 h-5 text-white animate-pulse" />
            <p className="text-white font-bold text-center">
              Si tienes una EMERGENCIA, llama al <span className="text-2xl font-black mx-2">{companyConfig.contact.emergency}</span> o al <span className="text-2xl font-black mx-2">{companyConfig.contact.phone}</span>
            </p>
            <Siren className="w-5 h-5 text-white animate-pulse" />
          </div>
        </div>
      </section>

      {/* ─── CONTENIDO PRINCIPAL ─── */}
      <section className="py-24 md:py-32 bg-zinc-950 relative">
        <div className="container max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Info lateral */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <SiteText contentKey="contacto.info.overline" fallback="Información" className="text-red-500 text-sm font-mono tracking-[0.3em] uppercase" />
                <SiteText as="h2" contentKey="contacto.info.title" fallback="Encuéntranos" className="text-3xl md:text-4xl font-black text-white mt-4 leading-[1.1]" />
                <div className="h-1 w-16 bg-red-500 mt-6" />
              </div>

              <div className="space-y-4">
                {[
                  { k: "1", icon: MapPin, label: "Dirección", value: companyConfig.location.address + ", " + companyConfig.location.district, sublabel: companyConfig.location.department + ", Perú" },
                  { k: "2", icon: Phone, label: "Emergencias", value: companyConfig.contact.emergency, sublabel: "Central: " + companyConfig.contact.phone },
                  { k: "3", icon: Mail, label: "Correo", value: companyConfig.contact.email, sublabel: "Respondemos en 24-48 horas" },
                  { k: "4", icon: Clock, label: "Atención administrativa", value: "Lun - Sáb: 9:00 - 17:00", sublabel: "Emergencias: 24/7" },
                ].map((item) => (
                  <div key={item.k} className="flex items-start gap-4 p-5 border border-zinc-800/60 bg-zinc-900/30">
                    <div className="p-3 bg-red-500/10 border border-red-500/20 shrink-0">
                      <item.icon className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <SiteText as="p" contentKey={`contacto.info.${item.k}.label`} fallback={item.label} className="text-xs text-zinc-500 uppercase tracking-wider mb-1" />
                      <SiteText as="p" contentKey={`contacto.info.${item.k}.value`} fallback={item.value} className="text-white font-medium" />
                      <SiteText as="p" contentKey={`contacto.info.${item.k}.sublabel`} fallback={item.sublabel} className="text-sm text-zinc-500" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Social */}
              <div className="p-5 border border-zinc-800/60 bg-zinc-900/30">
                <SiteText as="p" contentKey="contacto.social.label" fallback="Síguenos" className="text-xs text-zinc-500 uppercase tracking-wider mb-3" />
                <div className="flex gap-3">
                  {companyConfig.social.facebook && (
                    <a href={companyConfig.social.facebook} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors text-sm flex items-center gap-2">
                      Facebook <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {companyConfig.social.instagram && (
                    <a href={companyConfig.social.instagram} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors text-sm flex items-center gap-2">
                      Instagram <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Formulario */}
            <div className="lg:col-span-7">
              <div className="p-8 md:p-10 border border-zinc-800/60 bg-zinc-900/30">
                <SiteText as="h3" contentKey="contacto.form.title" fallback="Envíanos un mensaje" className="text-2xl font-black text-white mb-2" />
                <SiteText as="p" contentKey="contacto.form.subtitle" fallback="Todos los campos marcados con * son obligatorios." className="text-zinc-500 text-sm mb-8" />

                {formState === "sent" ? (
                  <div className="text-center py-16 space-y-4">
                    <CheckCircle2 className="w-12 h-12 text-red-500 mx-auto" />
                    <SiteText as="h4" contentKey="contacto.form.sent.title" fallback="Mensaje enviado" className="text-xl font-bold text-white" />
                    <SiteText as="p" contentKey="contacto.form.sent.text" fallback="Te responderemos en un máximo de 48 horas hábiles." className="text-zinc-400" />
                    <Button onClick={() => setFormState("idle")} variant="outline" className="border-zinc-700 text-zinc-300 rounded-none mt-4">
                      Enviar otro mensaje
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Nombre *</label>
                        <input type="text" required className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 transition-colors" placeholder="Tu nombre" />
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Apellido *</label>
                        <input type="text" required className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 transition-colors" placeholder="Tu apellido" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Correo electrónico *</label>
                      <input type="email" required className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 transition-colors" placeholder="correo@ejemplo.com" />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Teléfono</label>
                      <input type="tel" className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 transition-colors" placeholder="+51 999 999 999" />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Asunto *</label>
                      <select required className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors">
                        <option value="">Selecciona un asunto</option>
                        <option value="admision">Información de admisión</option>
                        <option value="visita">Coordinar visita al cuartel</option>
                        <option value="capacitacion">Capacitación / Charlas</option>
                        <option value="donacion">Donaciones</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Mensaje *</label>
                      <textarea required rows={5} className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 transition-colors resize-none" placeholder="Escribe tu mensaje aquí..." />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={formState === "sending"}
                      className="w-full bg-red-600 hover:bg-red-700 text-white text-lg py-6 rounded-none shadow-[0_0_40px_rgba(220,38,38,0.3)] hover:shadow-[0_0_60px_rgba(220,38,38,0.5)] transition-all duration-300 disabled:opacity-50"
                    >
                      {formState === "sending" ? (
                        "Enviando..."
                      ) : (
                        <>Enviar mensaje <Send className="ml-2 h-4 w-4" /></>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAPA PLACEHOLDER ─── */}
      <section className="bg-black border-t border-zinc-800/50">
        <div className="container max-w-7xl mx-auto px-6 md:px-8 py-16">
          <div className="aspect-[21/9] border border-zinc-800/60 bg-zinc-900/30 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(220,38,38,0.04)_0%,_transparent_60%)]" />
            <div className="text-center space-y-3 relative z-10">
              <MapPin className="w-10 h-10 text-red-500/40 mx-auto" />
              <p className="text-zinc-500 font-mono text-sm">{companyConfig.location.address}</p>
              <p className="text-zinc-600 text-xs">
                {companyConfig.location.coordinates.lat}, {companyConfig.location.coordinates.lng}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MOTTO ─── */}
      <section className="bg-black py-12 border-t border-zinc-900">
        <div className="container max-w-7xl mx-auto px-6 md:px-8 text-center">
          <p className="text-zinc-700 text-sm font-mono tracking-[0.5em] uppercase">{companyConfig.motto}</p>
        </div>
      </section>
    </>
  )
}
