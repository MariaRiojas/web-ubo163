"use client"

import { useState } from "react"
import { CheckCircle2, ArrowRight, FileText, UserCheck, GraduationCap, Shield, Clock, Heart, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { companyConfig } from "@/company.config"
import { PostulacionForm } from "@/components/admision/postulacion-form"
import { SiteText } from "@/components/site-content/site-text"

export default function AdmisionPage() {
  const [activeStep, setActiveStep] = useState(0)

  const pasos = [
    {
      icon: FileText,
      titulo: "Postulación",
      desc: "Presenta tu solicitud con los documentos requeridos en nuestra sede o a través del formulario de contacto.",
      detalles: ["DNI vigente (mayor de 18 años)", "Certificado de antecedentes penales", "Certificado médico de aptitud física", "2 fotos tamaño pasaporte"],
    },
    {
      icon: UserCheck,
      titulo: "Evaluación",
      desc: "Proceso de evaluación que incluye entrevista personal, prueba psicológica y examen de aptitud física.",
      detalles: ["Entrevista con la Jefatura", "Evaluación psicológica", "Prueba de aptitud física", "Verificación de antecedentes"],
    },
    {
      icon: GraduationCap,
      titulo: "Formación",
      desc: "Período de instrucción como Aspirante donde aprenderás las bases del servicio bomberil.",
      detalles: ["Curso de Escuela Básica (ESBA)", "Entrenamiento físico intensivo", "Prácticas en campo", "Duración: 6 meses aprox."],
    },
    {
      icon: Shield,
      titulo: "Incorporación",
      desc: "Al aprobar la ESBA, te incorporas como Bombero Alumno activo de la Compañía Nº 163.",
      detalles: ["Juramento de honor", "Asignación de compañía", "Entrega de equipo personal", "Inicio de servicio activo"],
    },
  ]

  const requisitos = [
    "Tener entre 18 y 55 años de edad",
    "Ser peruano(a) o residente legal",
    "No tener antecedentes penales ni policiales",
    "Gozar de buena salud física y mental",
    "Disponibilidad para guardias y capacitaciones",
    "Vocación de servicio a la comunidad",
  ]

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative min-h-[55vh] flex items-end overflow-hidden bg-black">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.12)_0%,_transparent_50%)]" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

        <div className="container max-w-7xl mx-auto px-6 md:px-8 relative z-10 pt-32 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-[1px] w-12 bg-red-500" />
                <SiteText contentKey="admision.hero.badge" fallback="Convocatoria abierta" className="text-red-400 text-sm font-mono tracking-[0.3em] uppercase" />
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.9] text-white">
                SÉ<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">VOLUNTARIO</span>
              </h1>
              <div className="h-1 w-16 bg-red-500" />
              <SiteText as="p" contentKey="admision.hero.subtitle" className="text-lg text-zinc-400 max-w-lg leading-relaxed"
                fallback="No necesitas experiencia previa. Solo necesitas vocación de servicio y ganas de proteger a tu comunidad." />
            </div>
            <div className="lg:col-span-5 hidden lg:flex justify-end">
              <div className="p-8 border border-zinc-800/60 bg-zinc-900/30 space-y-4">
                <Heart className="w-8 h-8 text-red-500" />
                <p className="text-white font-bold text-lg">¿Por qué ser voluntario?</p>
                <SiteText as="p" contentKey="admision.porque" className="text-zinc-400 text-sm leading-relaxed"
                  fallback="Ser bombero es más que una actividad — es una forma de vida dedicada al prójimo." />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PROCESO ─── */}
      <section className="py-24 md:py-32 bg-zinc-950 relative">
        <div className="container max-w-7xl mx-auto px-6 md:px-8">
          <div className="mb-16">
            <span className="text-red-500 text-sm font-mono tracking-[0.3em] uppercase">Paso a paso</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-4 leading-[1.1]">
              Proceso de<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">admisión</span>
            </h2>
            <div className="h-1 w-16 bg-red-500 mt-6" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Step selector */}
            <div className="lg:col-span-4 space-y-2">
              {pasos.map((paso, i) => (
                <button
                  key={paso.titulo}
                  onClick={() => setActiveStep(i)}
                  className={`w-full text-left flex items-center gap-4 p-4 border transition-all duration-300 ${
                    activeStep === i
                      ? "border-red-500/40 bg-red-500/5"
                      : "border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700/60"
                  }`}
                >
                  <div className={`w-10 h-10 flex items-center justify-center border shrink-0 ${
                    activeStep === i ? "border-red-500 bg-red-500/10" : "border-zinc-700 bg-zinc-900"
                  }`}>
                    <span className={`font-black text-sm ${activeStep === i ? "text-red-400" : "text-zinc-500"}`}>{i + 1}</span>
                  </div>
                  <div>
                    <p className={`font-bold ${activeStep === i ? "text-white" : "text-zinc-400"}`}>{paso.titulo}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Active step detail */}
            <div className="lg:col-span-8">
              <div className="p-8 border border-zinc-800/60 bg-zinc-900/30 h-full">
                <div className="flex items-center gap-4 mb-6">
                  {(() => { const Icon = pasos[activeStep].icon; return <Icon className="w-8 h-8 text-red-500" /> })()}
                  <h3 className="text-2xl font-black text-white">{pasos[activeStep].titulo}</h3>
                </div>
                <p className="text-zinc-400 leading-relaxed mb-8">{pasos[activeStep].desc}</p>
                <ul className="space-y-3">
                  {pasos[activeStep].detalles.map((detalle) => (
                    <li key={detalle} className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-zinc-300">{detalle}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── REQUISITOS ─── */}
      <section className="py-24 md:py-32 bg-black relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(220,38,38,0.06)_0%,_transparent_50%)]" />
        <div className="container max-w-7xl mx-auto px-6 md:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-32">
              <span className="text-red-500 text-sm font-mono tracking-[0.3em] uppercase">Perfil requerido</span>
              <h2 className="text-4xl md:text-5xl font-black text-white mt-4 leading-[1.1]">
                Requisitos<br />
                <span className="text-zinc-600">básicos</span>
              </h2>
              <div className="h-1 w-16 bg-red-500 mt-6" />
              <p className="text-zinc-500 mt-6 leading-relaxed text-sm">
                Estos son los requisitos mínimos para iniciar el proceso. La vocación de servicio es lo más importante.
              </p>
            </div>

            <div className="lg:col-span-7">
              <div className="space-y-3">
                {requisitos.map((req, i) => (
                  <div key={req} className="flex items-center gap-4 p-5 border border-zinc-800/60 bg-zinc-900/30">
                    <div className="w-8 h-8 flex items-center justify-center border border-zinc-700 bg-zinc-900 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-red-500" />
                    </div>
                    <span className="text-zinc-300">{req}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FORMULARIO DE POSTULACIÓN ─── */}
      <section id="postular" className="py-24 md:py-32 bg-zinc-950 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.08)_0%,_transparent_55%)]" />
        <div className="container max-w-7xl mx-auto px-6 md:px-8 relative z-10">
          <div className="mb-14 text-center">
            <span className="text-red-500 text-sm font-mono tracking-[0.3em] uppercase">Postula ahora</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-4 leading-[1.1]">
              Formulario de<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">admisión</span>
            </h2>
            <div className="h-1 w-16 bg-red-500 mt-6 mx-auto" />
            <SiteText as="p" contentKey="admision.form.intro" className="text-zinc-400 mt-6 max-w-xl mx-auto leading-relaxed"
              fallback="Completa tus datos y adjunta tu CERTIJOVEN en PDF para postular a la convocatoria vigente." />
          </div>
          <PostulacionForm />
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-700 via-red-600 to-red-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0)_0%,_rgba(0,0,0,0.4)_100%)]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 40px)" }} />
        <div className="container max-w-7xl mx-auto px-6 md:px-8 relative z-10 text-center space-y-6">
          <Flame className="w-10 h-10 text-white/60 mx-auto" />
          <h2 className="text-4xl md:text-5xl font-black text-white">¿Tienes dudas?</h2>
          <p className="text-lg text-red-100/80 max-w-xl mx-auto">
            Acércate a nuestro cuartel o contáctanos para resolver cualquier consulta sobre el proceso.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" className="bg-white text-red-700 hover:bg-zinc-100 text-lg px-10 py-6 rounded-none font-bold shadow-2xl" asChild>
              <Link href="/contacto">Contáctanos <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <p className="text-red-200/60 text-sm pt-4">
            <Clock className="inline w-3 h-3 mr-1" />
            {companyConfig.location.address}
          </p>
        </div>
      </section>
    </>
  )
}
