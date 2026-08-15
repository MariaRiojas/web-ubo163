"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PhoneCall,
  Flame,
  Shield,
  Clock,
  Users,
  ArrowRight,
  MapPin,
  Heart,
  Siren,
  GraduationCap,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { companyConfig } from "@/company.config"
import { SiteText } from "@/components/site-content/site-text"

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const statsRef = useRef<HTMLElement>(null)
  const [statsVisible, setStatsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
        {/* Animated grain overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-30"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
        />

        {/* Radial gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.15)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(220,38,38,0.08)_0%,_transparent_40%)]" />

        {/* Diagonal accent line */}
        <div
          className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-red-500/0 via-red-500/60 to-red-500/0 origin-top"
          style={{ transform: `translateX(-80px) rotate(12deg) scaleY(${1 + scrollY * 0.0005})` }}
        />

        {/* Content */}
        <div className="container max-w-7xl mx-auto px-6 md:px-8 relative z-20 pt-32 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              {/* Overline */}
              <div
                className={`flex items-center gap-3 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              >
                <div className="h-[1px] w-12 bg-red-500" />
                <span className="text-red-400 text-sm font-mono tracking-[0.3em] uppercase">
                  Est. {companyConfig.foundedYear} · UBO Nº {companyConfig.id}
                </span>
              </div>

              {/* Main heading */}
              <h1
                className={`transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              >
                <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] text-white">
                  BOMBEROS
                </span>
                <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
                  ANCÓN
                </span>
              </h1>

              {/* Tagline */}
              <p
                className={`text-lg md:text-xl text-zinc-400 max-w-lg leading-relaxed font-light transition-all duration-1000 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              >
                <SiteText contentKey="inicio.hero.tagline" fallback={<>Protegiendo vidas y propiedades las 24 horas del día.<span className="text-zinc-300 font-normal"> Voluntarios al servicio de nuestra comunidad.</span></>} />
              </p>

              {/* CTA buttons */}
              <div
                className={`flex flex-wrap gap-4 pt-4 transition-all duration-1000 delay-[600ms] ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              >
                <Button
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-6 rounded-none shadow-[0_0_40px_rgba(220,38,38,0.3)] hover:shadow-[0_0_60px_rgba(220,38,38,0.5)] transition-all duration-300"
                >
                  <Siren className="mr-2 h-5 w-5" />
                  Emergencias: {companyConfig.contact.emergency}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white text-lg px-8 py-6 rounded-none transition-all duration-300"
                  asChild
                >
                  <Link href="/admision">Ser Voluntario <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </div>

            {/* Right side — shield emblem */}
            <div
              className={`lg:col-span-5 hidden lg:flex justify-center items-center transition-all duration-1500 delay-500 ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/10 rounded-full blur-[100px] animate-pulse" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/escudo-163.png" alt="Escudo Compañía de Bomberos N.° 163"
                  className="relative w-72 h-72 object-contain opacity-90 drop-shadow-[0_0_40px_rgba(220,38,38,0.25)]" />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <ChevronDown className="w-6 h-6 text-zinc-600" />
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section
        ref={statsRef}
        className="relative bg-zinc-950 border-y border-zinc-800/50 py-20 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(220,38,38,0.03)_50%,transparent_100%)]" />
        <div className="container max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {[
              { value: "24/7", label: "Servicio continuo", icon: Clock },
              { value: "25+", label: "Años de servicio", icon: Shield },
              { value: "40+", label: "Voluntarios activos", icon: Users },
              { value: "163", label: "Número de compañía", icon: Flame },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`text-center space-y-2 transition-all duration-700 ${statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <stat.icon className="w-5 h-5 text-red-500 mx-auto mb-3" />
                <p className="text-3xl md:text-4xl font-black text-white tracking-tight">{stat.value}</p>
                <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SERVICIOS ─── */}
      <section className="py-28 md:py-36 bg-zinc-950 relative">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
        <div className="container max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            {/* Section header — asymmetric */}
            <div className="lg:col-span-4 lg:sticky lg:top-32">
              <SiteText contentKey="inicio.mision.overline" fallback="Nuestra misión" className="text-red-500 text-sm font-mono tracking-[0.3em] uppercase" />
              <h2 className="text-4xl md:text-5xl font-black text-white mt-4 leading-[1.1]">
                <SiteText contentKey="inicio.mision.title" fallback={<>Al servicio<br /><span className="text-zinc-600">de Ancón</span></>} />
              </h2>
              <div className="h-1 w-16 bg-red-500 mt-6" />
              <SiteText as="p" contentKey="inicio.mision.intro" className="text-zinc-500 mt-6 leading-relaxed"
                fallback="Respondemos a incendios, emergencias médicas, rescates y desastres naturales. Somos voluntarios comprometidos con la seguridad de nuestra comunidad." />
            </div>

            {/* Services grid */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  k: "1", icon: Flame,
                  title: "Incendios",
                  desc: "Combate y prevención de incendios estructurales, forestales y vehiculares",
                  accent: "group-hover:text-orange-400",
                },
                {
                  k: "2", icon: Heart,
                  title: "Emergencias Médicas",
                  desc: "Atención prehospitalaria y traslado de pacientes en situación de emergencia",
                  accent: "group-hover:text-red-400",
                },
                {
                  k: "3", icon: Shield,
                  title: "Rescate",
                  desc: "Operaciones de búsqueda y rescate en estructuras colapsadas y espacios confinados",
                  accent: "group-hover:text-amber-400",
                },
                {
                  k: "4", icon: GraduationCap,
                  title: "Capacitación",
                  desc: "Formación continua y cursos de prevención abiertos a la comunidad",
                  accent: "group-hover:text-cyan-400",
                },
              ].map((service) => (
                <div
                  key={service.title}
                  className="group p-8 border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-900/70 hover:border-zinc-700/60 transition-all duration-500 cursor-default"
                >
                  <service.icon className={`w-8 h-8 text-zinc-600 ${service.accent} transition-colors duration-500 mb-6`} />
                  <SiteText as="h3" contentKey={`inicio.serv.${service.k}.title`} fallback={service.title} className="text-lg font-bold text-white mb-2" />
                  <SiteText as="p" contentKey={`inicio.serv.${service.k}.desc`} fallback={service.desc} className="text-sm text-zinc-500 leading-relaxed" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CALL TO ACTION ─── */}
      <section className="relative py-28 md:py-36 overflow-hidden">
        {/* Red gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-700 via-red-600 to-red-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0)_0%,_rgba(0,0,0,0.4)_100%)]" />
        {/* Diagonal lines */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 40px)" }}
        />

        <div className="container max-w-7xl mx-auto px-6 md:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <SiteText as="h2" contentKey="inicio.cta.title" fallback="¿Quieres ser voluntario?" className="text-4xl md:text-6xl font-black text-white leading-tight" />
            <SiteText as="p" contentKey="inicio.cta.text" className="text-xl text-red-100/80 font-light leading-relaxed"
              fallback="Únete a la familia bomberil más grande del Perú. No necesitas experiencia previa — solo vocación de servicio." />
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button
                size="lg"
                className="bg-white text-red-700 hover:bg-zinc-100 text-lg px-10 py-6 rounded-none font-bold shadow-2xl transition-all duration-300 hover:scale-105"
                asChild
              >
                <Link href="/admision">Inscríbete ahora</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 text-lg px-10 py-6 rounded-none transition-all duration-300"
                asChild
              >
                <Link href="/nosotros">Conoce más</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CONTACT STRIP ─── */}
      <section className="bg-black py-16 border-t border-zinc-800/50">
        <div className="container max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20">
                <MapPin className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 uppercase tracking-wider">Ubicación</p>
                <p className="text-white font-medium">{companyConfig.location.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20">
                <PhoneCall className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 uppercase tracking-wider">Emergencias</p>
                <p className="text-white font-medium text-xl">{companyConfig.contact.emergency}</p>
                <p className="text-zinc-400 text-sm">{companyConfig.contact.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20">
                <Clock className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 uppercase tracking-wider">Horario</p>
                <SiteText as="p" contentKey="inicio.contacto.horario" fallback="24 horas, 365 días del año" className="text-white font-medium" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MOTTO ─── */}
      <section className="bg-black py-12 border-t border-zinc-900">
        <div className="container max-w-7xl mx-auto px-6 md:px-8 text-center">
          <p className="text-zinc-700 text-sm font-mono tracking-[0.5em] uppercase">
            {companyConfig.motto}
          </p>
        </div>
      </section>
    </>
  )
}
