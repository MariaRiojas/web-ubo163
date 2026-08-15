import { Shield, Flame, Heart, Target, Eye, Award, Calendar } from "lucide-react"
import { companyConfig } from "@/company.config"
import { SiteText } from "@/components/site-content/site-text"

export default function NosotrosPage() {
  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative min-h-[60vh] flex items-end overflow-hidden bg-black">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(220,38,38,0.12)_0%,_transparent_50%)]" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

        <div className="container max-w-7xl mx-auto px-6 md:px-8 relative z-10 pt-32 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-[1px] w-12 bg-red-500" />
                <SiteText contentKey="nosotros.hero.overline" fallback="Nuestra historia" className="text-red-400 text-sm font-mono tracking-[0.3em] uppercase" />
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.9] text-white">
                <SiteText contentKey="nosotros.hero.title" fallback={<>QUIÉNES<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">SOMOS</span></>} />
              </h1>
              <div className="h-1 w-16 bg-red-500" />
              <SiteText as="p" contentKey="nosotros.hero.subtitle" className="text-lg text-zinc-400 max-w-lg leading-relaxed"
                fallback="Más de dos décadas protegiendo a la comunidad de Ancón con vocación, disciplina y entrega total." />
            </div>
            <div className="lg:col-span-5 hidden lg:flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/5 blur-[80px]" />
                <Shield className="w-48 h-48 text-red-500/15 stroke-[0.5]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-black text-red-500/20">{companyConfig.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HISTORIA ─── */}
      <section className="py-24 md:py-32 bg-zinc-950 relative">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-800/50 to-transparent" />
        <div className="container max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-4">
              <SiteText contentKey="nosotros.historia.overline" fallback="Fundación" className="text-red-500 text-sm font-mono tracking-[0.3em] uppercase" />
              <h2 className="text-4xl md:text-5xl font-black text-white mt-4 leading-[1.1]">
                Desde<br />
                <span className="text-zinc-600">{companyConfig.foundedYear}</span>
              </h2>
              <div className="h-1 w-16 bg-red-500 mt-6" />
            </div>
            <div className="lg:col-span-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { k: "1", year: "2000", text: "Fundación de la Compañía de Bomberos Voluntarios Nº 163, respondiendo a la necesidad de protección de la comunidad de Ancón." },
                  { k: "2", year: "2005", text: "Consolidación operativa con la adquisición de la primera unidad de combate contra incendios y equipamiento básico." },
                  { k: "3", year: "2012", text: "Ampliación de servicios a emergencias médicas prehospitalarias y rescate vehicular en la Panamericana Norte." },
                  { k: "4", year: "2020", text: "Dos décadas de servicio ininterrumpido. Participación activa durante la emergencia sanitaria nacional." },
                ].map((item) => (
                  <div key={item.k} className="p-6 border border-zinc-800/60 bg-zinc-900/30">
                    <div className="flex items-center gap-3 mb-4">
                      <Calendar className="w-4 h-4 text-red-500" />
                      <SiteText contentKey={`nosotros.historia.${item.k}.year`} fallback={item.year} className="text-red-400 font-mono text-sm font-bold" />
                    </div>
                    <SiteText as="p" contentKey={`nosotros.historia.${item.k}.text`} fallback={item.text} className="text-zinc-400 text-sm leading-relaxed" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MISIÓN, VISIÓN, VALORES ─── */}
      <section className="py-24 md:py-32 bg-black relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(220,38,38,0.06)_0%,_transparent_50%)]" />
        <div className="container max-w-7xl mx-auto px-6 md:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-32">
              <SiteText contentKey="nosotros.proposito.overline" fallback="Propósito" className="text-red-500 text-sm font-mono tracking-[0.3em] uppercase" />
              <h2 className="text-4xl md:text-5xl font-black text-white mt-4 leading-[1.1]">
                <SiteText contentKey="nosotros.proposito.title" fallback={<>Nuestra<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">razón de ser</span></>} />
              </h2>
              <div className="h-1 w-16 bg-red-500 mt-6" />
              <p className="text-zinc-500 mt-6 leading-relaxed text-sm">
                <SiteText contentKey="nosotros.proposito.intro" fallback={<>Guiados por nuestro lema <span className="text-zinc-300 font-medium">&ldquo;{companyConfig.motto}&rdquo;</span>, cada acción refleja nuestro compromiso con la vida humana.</>} />
              </p>
            </div>

            <div className="lg:col-span-7 space-y-6">
              {[
                {
                  k: "1", icon: Target,
                  title: "Misión",
                  text: "Salvar vidas, proteger bienes y prevenir siniestros en el distrito de Ancón y zonas aledañas, brindando un servicio voluntario de excelencia las 24 horas del día, los 365 días del año.",
                  accent: "group-hover:text-red-400",
                },
                {
                  k: "2", icon: Eye,
                  title: "Visión",
                  text: "Ser reconocidos como una compañía de bomberos modelo a nivel nacional, con personal altamente capacitado, equipamiento de vanguardia y una comunidad comprometida con la prevención.",
                  accent: "group-hover:text-orange-400",
                },
                {
                  k: "3", icon: Award,
                  title: "Valores",
                  text: "Vocación de servicio, disciplina, honor, lealtad, solidaridad y trabajo en equipo. Cada voluntario encarna estos principios dentro y fuera del cuartel.",
                  accent: "group-hover:text-amber-400",
                },
              ].map((item) => (
                <div key={item.k} className="group p-8 border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700/60 transition-all duration-500">
                  <div className="flex items-start gap-6">
                    <item.icon className={`w-8 h-8 text-zinc-600 ${item.accent} transition-colors duration-500 shrink-0 mt-1`} />
                    <div>
                      <SiteText as="h3" contentKey={`nosotros.mvv.${item.k}.title`} fallback={item.title} className="text-xl font-bold text-white mb-3" />
                      <SiteText as="p" contentKey={`nosotros.mvv.${item.k}.text`} fallback={item.text} className="text-zinc-400 leading-relaxed" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CIFRAS ─── */}
      <section className="py-20 bg-zinc-950 border-y border-zinc-800/50">
        <div className="container max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { k: "1", value: `${new Date().getFullYear() - companyConfig.foundedYear}+`, label: "Años de servicio" },
              { k: "2", value: "24/7", label: "Disponibilidad" },
              { k: "3", value: "40+", label: "Voluntarios" },
              { k: "4", value: "1000+", label: "Emergencias atendidas" },
            ].map((stat) => (
              <div key={stat.k} className="text-center space-y-2">
                <SiteText as="p" contentKey={`nosotros.cifras.${stat.k}.value`} fallback={stat.value} className="text-3xl md:text-4xl font-black text-white tracking-tight" />
                <SiteText as="p" contentKey={`nosotros.cifras.${stat.k}.label`} fallback={stat.label} className="text-sm text-zinc-500 font-medium uppercase tracking-wider" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MOTTO ─── */}
      <section className="bg-black py-16">
        <div className="container max-w-7xl mx-auto px-6 md:px-8 text-center">
          <Flame className="w-8 h-8 text-red-500/30 mx-auto mb-4" />
          <p className="text-zinc-600 text-sm font-mono tracking-[0.5em] uppercase">{companyConfig.motto}</p>
        </div>
      </section>
    </>
  )
}
