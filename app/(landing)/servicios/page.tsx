import { Flame, Heart, Shield, Search, Truck, AlertTriangle, BookOpen, Siren, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { companyConfig } from "@/company.config"
import { SiteText } from "@/components/site-content/site-text"

export default function ServiciosPage() {
  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative min-h-[55vh] flex items-end overflow-hidden bg-black">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.1)_0%,_transparent_50%)]" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

        <div className="container max-w-7xl mx-auto px-6 md:px-8 relative z-10 pt-32 pb-20">
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-[1px] w-12 bg-red-500" />
              <SiteText contentKey="servicios.hero.overline" fallback="Operaciones" className="text-red-400 text-sm font-mono tracking-[0.3em] uppercase" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.9] text-white">
              <SiteText contentKey="servicios.hero.title" fallback={<>NUESTROS<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">SERVICIOS</span></>} />
            </h1>
            <div className="h-1 w-16 bg-red-500" />
            <SiteText as="p" contentKey="servicios.hero.subtitle" className="text-lg text-zinc-400 max-w-lg leading-relaxed"
              fallback="Respondemos a toda emergencia que amenace la vida, la propiedad o el medio ambiente en nuestra jurisdicción." />
          </div>
        </div>
      </section>

      {/* ─── SERVICIOS PRINCIPALES ─── */}
      <section className="py-24 md:py-32 bg-zinc-950 relative">
        <div className="container max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-32">
              <SiteText contentKey="servicios.acc.overline" fallback="Líneas de acción" className="text-red-500 text-sm font-mono tracking-[0.3em] uppercase" />
              <h2 className="text-4xl md:text-5xl font-black text-white mt-4 leading-[1.1]">
                <SiteText contentKey="servicios.acc.title" fallback={<>Emergencia<br /><span className="text-zinc-600">& prevención</span></>} />
              </h2>
              <div className="h-1 w-16 bg-red-500 mt-6" />
              <SiteText as="p" contentKey="servicios.acc.intro" className="text-zinc-500 mt-6 leading-relaxed"
                fallback="Operamos bajo los protocolos del Cuerpo General de Bomberos Voluntarios del Perú, con capacitación continua y equipamiento especializado." />
              <div className="mt-8 p-4 border border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-3">
                  <Siren className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Emergencias</p>
                    <p className="text-white font-black text-xl">{companyConfig.contact.emergency}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              {[
                {
                  k: "1", icon: Flame,
                  title: "Incendios Estructurales y Forestales",
                  desc: "Combate de incendios en edificaciones, viviendas, industrias y áreas forestales. Incluye ventilación, búsqueda de víctimas y salvamento de bienes.",
                  details: ["Incendios en viviendas y comercios", "Incendios vehiculares", "Incendios forestales y de interfaz", "Fugas de gas y materiales peligrosos"],
                  accent: "text-orange-400",
                },
                {
                  k: "2", icon: Heart,
                  title: "Emergencias Médicas Prehospitalarias",
                  desc: "Atención de primeros auxilios, estabilización y traslado de pacientes. Personal capacitado en soporte vital básico y avanzado.",
                  details: ["Atención de accidentados", "Soporte vital básico (BLS)", "Traslado de emergencia", "Atención en eventos masivos"],
                  accent: "text-red-400",
                },
                {
                  k: "3", icon: Search,
                  title: "Rescate y Búsqueda",
                  desc: "Operaciones especializadas de búsqueda y rescate en diferentes escenarios de emergencia.",
                  details: ["Rescate vehicular (excarcelación)", "Rescate en estructuras colapsadas", "Rescate en espacios confinados", "Búsqueda de personas perdidas"],
                  accent: "text-amber-400",
                },
                {
                  k: "4", icon: AlertTriangle,
                  title: "Materiales Peligrosos",
                  desc: "Identificación, contención y mitigación de incidentes con sustancias químicas, biológicas o radiológicas.",
                  details: ["Identificación de sustancias", "Contención de derrames", "Evacuación de zonas afectadas", "Descontaminación básica"],
                  accent: "text-cyan-400",
                },
                {
                  k: "5", icon: BookOpen,
                  title: "Prevención y Capacitación",
                  desc: "Actividades de prevención comunitaria, inspecciones técnicas de seguridad y capacitación ciudadana.",
                  details: ["Inspecciones de seguridad", "Charlas en colegios y empresas", "Simulacros de evacuación", "Planes de emergencia"],
                  accent: "text-emerald-400",
                },
              ].map((service) => (
                <div key={service.k} className="group p-8 border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700/60 transition-all duration-500">
                  <div className="flex items-start gap-6">
                    <service.icon className={`w-8 h-8 text-zinc-600 group-hover:${service.accent} transition-colors duration-500 shrink-0 mt-1`} />
                    <div className="space-y-4">
                      <SiteText as="h3" contentKey={`servicios.serv.${service.k}.title`} fallback={service.title} className="text-xl font-bold text-white" />
                      <SiteText as="p" contentKey={`servicios.serv.${service.k}.desc`} fallback={service.desc} className="text-zinc-400 leading-relaxed" />
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {service.details.map((detail, di) => (
                          <li key={di} className="flex items-center gap-2 text-sm text-zinc-500">
                            <div className="w-1 h-1 bg-red-500 shrink-0" />
                            <SiteText contentKey={`servicios.serv.${service.k}.det.${di + 1}`} fallback={detail} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── COBERTURA ─── */}
      <section className="py-20 bg-black border-y border-zinc-800/50">
        <div className="container max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { k: "1", icon: Truck, value: "< 8 min", label: "Tiempo de respuesta promedio" },
              { k: "2", icon: Shield, value: "24/7", label: "Cobertura permanente" },
              { k: "3", icon: Phone, value: companyConfig.contact.emergency, label: "Línea de emergencias" },
            ].map((item) => (
              <div key={item.k} className="text-center space-y-3 p-8 border border-zinc-800/40 bg-zinc-950/50">
                <item.icon className="w-6 h-6 text-red-500 mx-auto" />
                <SiteText as="p" contentKey={`servicios.cob.${item.k}.value`} fallback={item.value} className="text-3xl font-black text-white" />
                <SiteText as="p" contentKey={`servicios.cob.${item.k}.label`} fallback={item.label} className="text-sm text-zinc-500 uppercase tracking-wider" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-700 via-red-600 to-red-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0)_0%,_rgba(0,0,0,0.4)_100%)]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 40px)" }} />
        <div className="container max-w-7xl mx-auto px-6 md:px-8 relative z-10 text-center space-y-6">
          <SiteText as="h2" contentKey="servicios.cta.title" fallback="¿Necesitas ayuda?" className="text-4xl md:text-5xl font-black text-white" />
          <SiteText as="p" contentKey="servicios.cta.text" className="text-lg text-red-100/80 max-w-xl mx-auto"
            fallback="Ante cualquier emergencia, no dudes en llamar. Estamos para protegerte." />
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" className="bg-white text-red-700 hover:bg-zinc-100 text-lg px-10 py-6 rounded-none font-bold shadow-2xl" asChild>
              <Link href="/contacto">Contactar</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-lg px-10 py-6 rounded-none" asChild>
              <Link href="/admision">Ser voluntario</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
