import Link from "next/link"
import { PhoneCall, Mail, MapPin } from "lucide-react"
import { companyConfig } from "@/company.config"

export function MainFooter() {
  const navItems = [
    { name: "Inicio", path: "/" },
    { name: "Nosotros", path: "/nosotros" },
    { name: "Servicios", path: "/servicios" },
    { name: "Equipo", path: "/equipo" },
    { name: "Admisión", path: "/admision" },
    { name: "Contacto", path: "/contacto" },
  ]

  return (
    <footer className="bg-zinc-950 border-t border-zinc-800/50">
      {/* Main footer content */}
      <div className="container max-w-7xl mx-auto px-6 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/escudo-163.png" alt="Escudo Compañía N.° 163" className="h-8 w-8 object-contain" />
              <span className="text-lg font-black text-white tracking-tight">
                BOMBEROS <span className="text-red-500">{companyConfig.id}</span>
              </span>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Compañía de Bomberos Voluntarios Ancón. Al servicio de la comunidad las 24 horas.
            </p>
            <div className="flex gap-3 pt-2">
              {companyConfig.social.facebook && (
                <a href={companyConfig.social.facebook} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              )}
              {companyConfig.social.instagram && (
                <a href={companyConfig.social.instagram} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em] mb-6">Navegación</h3>
            <nav className="space-y-3">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.path}
                  className="block text-sm text-zinc-400 hover:text-white transition-colors duration-300"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em] mb-6">Servicios</h3>
            <nav className="space-y-3">
              {["Atención de emergencias", "Prevención de incendios", "Capacitación comunitaria", "Rescate vehicular"].map((item) => (
                <span key={item} className="block text-sm text-zinc-400">{item}</span>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em] mb-6">Contacto</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <PhoneCall className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-zinc-400">Emergencias</p>
                  <p className="text-white font-bold">{companyConfig.contact.emergency}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-zinc-400">Email</p>
                  <p className="text-white text-sm">{companyConfig.contact.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-zinc-400">Dirección</p>
                  <p className="text-white text-sm">{companyConfig.location.address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-zinc-800/50">
        <div className="container max-w-7xl mx-auto px-6 md:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} {companyConfig.name}
          </p>
          <p className="text-xs text-zinc-700 font-mono tracking-[0.3em] uppercase">
            {companyConfig.motto}
          </p>
        </div>
      </div>
    </footer>
  )
}
