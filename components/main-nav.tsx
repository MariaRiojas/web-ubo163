"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Shield, Flame, Lock, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

export function MainNav() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { name: "Inicio", path: "/" },
    { name: "Nosotros", path: "/nosotros" },
    { name: "Servicios", path: "/servicios" },
    { name: "Equipo", path: "/equipo" },
    { name: "Cronograma", path: "/cronograma" },
    { name: "Admisión", path: "/admision" },
    { name: "Contacto", path: "/contacto" },
  ]

  const isActive = (path: string) => pathname === path

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 glass-strong backdrop-blur-xl">
      <div className="container mx-auto px-4 flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="relative transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
            <Shield className="h-10 w-10 text-primary" />
            <Flame className="h-4 w-4 text-amber-500 absolute -right-1 -bottom-1 animate-pulse" />
          </div>
          <div>
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-red-700 bg-clip-text text-transparent">
              Bomberos Ancón 163
            </span>
            <span className="text-xs text-muted-foreground block hidden md:block">Excelencia en Servicio</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className={cn(
                "text-sm font-medium transition-all duration-300 transform hover:scale-110",
                isActive(item.path)
                  ? "text-primary font-bold"
                  : "text-foreground/80 hover:text-primary"
              )}
            >
              {item.name}
            </Link>
          ))}
          <ThemeToggle />
          <Link
            href="/login"
            className="flex items-center space-x-2 bg-gradient-to-r from-primary to-red-700 px-6 py-2.5 rounded-full text-sm font-medium text-white hover:shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            <Lock className="h-4 w-4" />
            <span>Intranet</span>
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden glass-strong backdrop-blur-xl border-t border-primary/10">
          <nav className="container mx-auto px-4 py-4 flex flex-col space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.path}
                className={cn(
                  "text-sm font-medium transition-colors py-2 px-3 rounded-lg",
                  isActive(item.path)
                    ? "text-primary bg-primary/10 font-bold"
                    : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="/login"
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-primary to-red-700 px-6 py-2.5 rounded-full text-sm font-medium text-white mt-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Lock className="h-4 w-4" />
              <span>Intranet</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
