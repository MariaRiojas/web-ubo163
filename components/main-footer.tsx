import Link from "next/link"
import { Shield, Flame, PhoneCall, Mail, Facebook, Twitter, Instagram } from "lucide-react"

export function MainFooter() {
  const navItems = [
    { name: "Inicio", path: "/" },
    { name: "Nosotros", path: "/nosotros" },
    { name: "Servicios", path: "/servicios" },
    { name: "Equipo", path: "/equipo" },
    { name: "Cronograma", path: "/cronograma" },
    { name: "Admisión", path: "/admision" },
    { name: "Contacto", path: "/contacto" },
  ]

  return (
    <footer className="bg-gradient-to-b from-primary/95 to-red-800 text-white py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 group">
              <div className="relative transform transition-transform duration-300 group-hover:scale-110">
                <Shield className="h-10 w-10 text-white" />
                <Flame className="h-4 w-4 text-amber-400 absolute -right-1 -bottom-1 animate-pulse" />
              </div>
              <span className="text-xl font-bold">Bomberos Ancón 163</span>
            </div>
            <p className="text-white/80 text-sm md:text-base">
              Comprometidos con la excelencia y el servicio a nuestra comunidad las 24 horas del día.
            </p>
            <div className="flex gap-4 pt-4">
              {[Facebook, Twitter, Instagram].map((Icon, index) => (
                <Link
                  key={index}
                  href="#"
                  className="glass-strong backdrop-blur-sm p-3 rounded-full hover:scale-110 transition-transform"
                >
                  <Icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-6">Enlaces Rápidos</h3>
            <nav className="space-y-3">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.path}
                  className="block text-white/80 hover:text-white transition-colors text-sm md:text-base"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-6">Servicios</h3>
            <nav className="space-y-3">
              {["Emergencias", "Prevención", "Capacitación", "Inspecciones"].map((item) => (
                <Link
                  key={item}
                  href="/servicios"
                  className="block text-white/80 hover:text-white transition-colors text-sm md:text-base"
                >
                  {item}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-6">Contacto Rápido</h3>
            <div className="space-y-3 text-sm md:text-base">
              <div className="flex items-center gap-3">
                <PhoneCall className="h-5 w-5 text-amber-400" />
                <span>Emergencias: 911</span>
              </div>
              <div className="flex items-center gap-3">
                <PhoneCall className="h-5 w-5 text-amber-400" />
                <span>Central: 116</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-amber-400" />
                <span>contacto@bomberos163.pe</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 md:mt-20 pt-8 border-t border-white/20 text-center text-white/80 text-sm">
          <p>&copy; {new Date().getFullYear()} Compañía de Bomberos Voluntarios Ancón N° 163. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
