"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Lock, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { companyConfig } from "@/company.config"

export function MainNav() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { name: "Inicio", path: "/" },
    { name: "Nosotros", path: "/nosotros" },
    { name: "Servicios", path: "/servicios" },
    { name: "Equipo", path: "/equipo" },
    { name: "Admisión", path: "/admision" },
    { name: "Contacto", path: "/contacto" },
  ]

  const isActive = (path: string) => pathname === path

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-500",
        scrolled
          ? "bg-black/80 backdrop-blur-xl border-b border-zinc-800/50 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
          : "bg-transparent"
      )}
    >
      <div className="container max-w-7xl mx-auto px-6 md:px-8 flex h-20 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/escudo-163.png" alt="Escudo Compañía N.° 163"
              className="h-9 w-9 object-contain transition-transform duration-300 group-hover:scale-110" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-white tracking-tight leading-none">
              BOMBEROS <span className="text-red-500">{companyConfig.id}</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono tracking-[0.2em] uppercase leading-none mt-1">
              Ancón
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className={cn(
                "relative px-4 py-2 text-sm font-medium transition-all duration-300",
                isActive(item.path)
                  ? "text-red-400"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {item.name}
              {isActive(item.path) && (
                <span className="absolute bottom-0 left-4 right-4 h-px bg-red-500" />
              )}
            </Link>
          ))}
          <div className="ml-4 pl-4 border-l border-zinc-800">
            <Link
              href="/login"
              className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]"
            >
              <Lock className="h-3.5 w-3.5" />
              Intranet
            </Link>
          </div>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-zinc-400 hover:text-white transition-colors"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-black/95 backdrop-blur-xl border-t border-zinc-800/50">
          <nav className="container mx-auto px-6 py-6 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.path}
                className={cn(
                  "py-3 px-4 text-sm font-medium transition-colors",
                  isActive(item.path)
                    ? "text-red-400 bg-red-500/5"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 mt-4 py-3 bg-red-600 text-white text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Lock className="h-3.5 w-3.5" />
              Intranet
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
