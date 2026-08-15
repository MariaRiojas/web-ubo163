import { Users, Award, Shield, ChevronRight, Flame, Heart, Radio, Truck, BookOpen, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { companyConfig } from "@/company.config"
import { SiteText } from "@/components/site-content/site-text"

export default function EquipoPage() {
  const jerarquia = [
    { rango: "Primer Jefe de Compañía", grado: "Brigadier", rol: "Comando general, representación legal y administrativa de la compañía ante el CGBVP" },
    { rango: "Segundo Jefe de Compañía", grado: "Teniente Brigadier", rol: "Reemplazo del Primer Jefe y supervisión de las secciones operativas" },
    { rango: "Jefe de Sección de Máquinas", grado: "Teniente", rol: "Mantenimiento y operatividad del parque automotor y equipos mayores" },
    { rango: "Jefe de Sección de Instrucción", grado: "Teniente", rol: "Formación, ESBAS y capacitación continua del personal" },
    { rango: "Jefe de Sección Administrativa", grado: "Subteniente", rol: "Gestión documentaria, contabilidad y logística interna" },
    { rango: "Jefe de Guardia", grado: "Seccionario", rol: "Control de guardia nocturna y respuesta inmediata ante alarmas" },
  ]

  const areas = [
    { nombre: "Combate de Incendios", desc: "Intervención en incendios estructurales, forestales y vehiculares", miembros: 12, icon: Flame },
    { nombre: "Atención Prehospitalaria", desc: "Estabilización y traslado de pacientes en emergencias médicas", miembros: 8, icon: Heart },
    { nombre: "Rescate y Salvamento", desc: "Operaciones en estructuras colapsadas, vehiculares y desniveles", miembros: 6, icon: Shield },
    { nombre: "Comunicaciones", desc: "Central de radio, despacho de unidades y coordinación interinstitucional", miembros: 4, icon: Radio },
    { nombre: "Máquinas y Equipos", desc: "Mantenimiento preventivo y correctivo del parque automotor", miembros: 5, icon: Truck },
    { nombre: "Instrucción y Capacitación", desc: "Escuelas Básicas (ESBAS) y formación continua según CGBVP", miembros: 5, icon: BookOpen },
  ]

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[55vh] flex items-end overflow-hidden bg-black">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(220,38,38,0.1)_0%,_transparent_50%)]" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

        <div className="container max-w-7xl mx-auto px-6 md:px-8 relative z-10 pt-32 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-[1px] w-12 bg-red-500" />
                <SiteText contentKey="equipo.hero.overline" fallback="Personal voluntario" className="text-red-400 text-sm font-mono tracking-[0.3em] uppercase" />
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.9] text-white">
                <SiteText contentKey="equipo.hero.title" fallback={<>NUESTRO<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">EQUIPO</span></>} />
              </h1>
              <div className="h-1 w-16 bg-red-500" />
              <SiteText as="p" contentKey="equipo.hero.subtitle" className="text-lg text-zinc-400 max-w-xl leading-relaxed"
                fallback="Bomberos voluntarios al servicio de la comunidad de Ancón. Personal formado bajo los lineamientos de la Escuela Básica (ESBAS) del Cuerpo General de Bomberos Voluntarios del Perú." />
            </div>
            <div className="lg:col-span-4 hidden lg:flex flex-col gap-4">
              <div className="flex items-center gap-4 p-6 border border-zinc-800/60 bg-zinc-900/30">
                <Users className="w-7 h-7 text-red-500 shrink-0" />
                <div>
                  <SiteText as="p" contentKey="equipo.hero.stat1.value" fallback="40+" className="text-3xl font-black text-white" />
                  <SiteText as="p" contentKey="equipo.hero.stat1.label" fallback="Voluntarios activos" className="text-sm text-zinc-500 uppercase tracking-wider" />
                </div>
              </div>
              <div className="flex items-center gap-4 p-6 border border-zinc-800/60 bg-zinc-900/30">
                <Award className="w-7 h-7 text-red-500 shrink-0" />
                <div>
                  <SiteText as="p" contentKey="equipo.hero.stat2.value" fallback="25" className="text-3xl font-black text-white" />
                  <SiteText as="p" contentKey="equipo.hero.stat2.label" fallback="Años de servicio" className="text-sm text-zinc-500 uppercase tracking-wider" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* JERARQUIA */}
      <section className="py-28 md:py-36 bg-zinc-950 relative">
        <div className="container max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-32">
              <SiteText contentKey="equipo.jerarquia.overline" fallback="Organización" className="text-red-500 text-sm font-mono tracking-[0.3em] uppercase" />
              <h2 className="text-4xl md:text-5xl font-black text-white mt-4 leading-[1.1]">
                <SiteText contentKey="equipo.jerarquia.title" fallback={<>Cadena de<br /><span className="text-zinc-600">mando</span></>} />
              </h2>
              <div className="h-1 w-16 bg-red-500 mt-6" />
              <SiteText as="p" contentKey="equipo.jerarquia.intro" className="text-zinc-500 mt-6 leading-relaxed"
                fallback="Estructura jerárquica de acuerdo con el Reglamento de Ingreso y Funcionamiento (RIF) del Cuerpo General de Bomberos Voluntarios del Perú. Art. 113-120." />
            </div>

            <div className="lg:col-span-8 space-y-4">
              {jerarquia.map((item, i) => (
                <div key={item.rango} className="group flex items-start gap-6 p-6 md:p-8 border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700/60 transition-all duration-500">
                  <div className="w-12 h-12 flex items-center justify-center border border-zinc-700 bg-zinc-900 shrink-0">
                    <span className="text-red-500 font-black text-lg">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <SiteText as="h3" contentKey={`equipo.jerarquia.${i + 1}.rango`} fallback={item.rango} className="text-lg font-bold text-white" />
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 rounded-none text-xs">
                        <SiteText contentKey={`equipo.jerarquia.${i + 1}.grado`} fallback={item.grado} />
                      </Badge>
                    </div>
                    <SiteText as="p" contentKey={`equipo.jerarquia.${i + 1}.rol`} fallback={item.rol} className="text-sm text-zinc-500 leading-relaxed" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-red-500 transition-colors shrink-0 mt-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AREAS OPERATIVAS */}
      <section className="py-28 md:py-36 bg-black relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.06)_0%,_transparent_50%)]" />
        <div className="container max-w-7xl mx-auto px-6 md:px-8 relative z-10">
          <div className="max-w-2xl mb-16">
            <SiteText contentKey="equipo.areas.overline" fallback="Especialidades" className="text-red-500 text-sm font-mono tracking-[0.3em] uppercase" />
            <h2 className="text-4xl md:text-5xl font-black text-white mt-4 leading-[1.1]">
              <SiteText contentKey="equipo.areas.title" fallback={<>Secciones<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">operativas</span></>} />
            </h2>
            <div className="h-1 w-16 bg-red-500 mt-6" />
            <SiteText as="p" contentKey="equipo.areas.intro" className="text-zinc-500 mt-6 leading-relaxed"
              fallback="Cada sección cumple funciones específicas según el RIF del CGBVP, garantizando una respuesta integral ante cualquier tipo de emergencia." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {areas.map((area, i) => (
              <div key={area.nombre} className="group p-8 border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700/60 transition-all duration-500">
                <area.icon className="w-8 h-8 text-zinc-600 group-hover:text-red-500 transition-colors duration-500 mb-6" />
                <SiteText as="h3" contentKey={`equipo.areas.${i + 1}.nombre`} fallback={area.nombre} className="text-lg font-bold text-white mb-3" />
                <SiteText as="p" contentKey={`equipo.areas.${i + 1}.desc`} fallback={area.desc} className="text-sm text-zinc-500 leading-relaxed mb-4" />
                <div className="flex items-center gap-2 pt-3 border-t border-zinc-800/40">
                  <Users className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="text-sm text-zinc-500"><SiteText contentKey={`equipo.areas.${i + 1}.miembros`} fallback={String(area.miembros)} /> efectivos asignados</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EFECTIVOS PLACEHOLDER */}
      <section className="py-28 md:py-36 bg-zinc-950 border-t border-zinc-800/50">
        <div className="container max-w-7xl mx-auto px-6 md:px-8">
          <div className="max-w-2xl mb-16">
            <SiteText contentKey="equipo.efectivos.overline" fallback="Efectivos" className="text-red-500 text-sm font-mono tracking-[0.3em] uppercase" />
            <h2 className="text-4xl md:text-5xl font-black text-white mt-4 leading-[1.1]">
              <SiteText contentKey="equipo.efectivos.title" fallback={<>Rostros del<br /><span className="text-zinc-600">servicio</span></>} />
            </h2>
            <div className="h-1 w-16 bg-red-500 mt-6" />
            <SiteText as="p" contentKey="equipo.efectivos.intro" className="text-zinc-500 mt-6 leading-relaxed"
              fallback="Personal activo registrado en el sistema del CGBVP. Desde brigadieres hasta aspirantes, cada efectivo es parte fundamental de la cadena de atención de emergencias." />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="group border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
                <div className="aspect-[3/4] bg-zinc-900 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(220,38,38,0.04)_0%,_transparent_70%)]" />
                  <Shield className="w-12 h-12 text-zinc-800 group-hover:text-zinc-700 transition-colors" />
                </div>
                <div className="p-5 space-y-2">
                  <div className="h-4 w-3/4 bg-zinc-800/60" />
                  <div className="h-3 w-1/2 bg-zinc-800/40" />
                </div>
              </div>
            ))}
          </div>
          <SiteText as="p" contentKey="equipo.efectivos.placeholder" className="text-center text-zinc-600 text-sm mt-10 font-mono tracking-wider"
            fallback="Directorio de personal disponible proximamente" />
        </div>
      </section>
    </>
  )
}
