"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Shield,
  Flame,
  Menu,
  X,
  LogOut,
  Home,
  Bed,
  ImageIcon,
  FileText,
  Users,
  BarChart2,
  Truck,
  BookOpen,
  Wrench,
  Bell,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface SidebarItemProps {
  icon: React.ElementType
  label: string
  href: string
  active: boolean
  badge?: number
}

const SidebarItem = ({ icon: Icon, label, href, active, badge }: SidebarItemProps) => (
  <Link
    href={href}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 group",
      active ? "bg-red-700 text-white" : "text-gray-300 hover:bg-red-800/50 hover:text-white",
    )}
  >
    <div
      className={cn(
        "p-1.5 rounded-md transition-all duration-300",
        active ? "bg-red-600" : "bg-gray-800 group-hover:bg-red-700",
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
    <span className="flex-1">{label}</span>
    {badge && <Badge className="bg-amber-500 text-white hover:bg-amber-600">{badge}</Badge>}
  </Link>
)

export default function IntranetLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isAdmin, setIsAdmin] = useState(true) // Simulamos que el usuario es admin

  // Verificar si estamos en la página de login
  const isLoginPage = pathname === "/intranet"

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false)
      } else {
        setIsSidebarOpen(true)
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Proteger rutas - solo renderizar el layout completo si no estamos en la página de login
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  const handleLogout = () => {
    router.push("/intranet")
  }

  const sidebarItems = [
    { icon: Home, label: "Dashboard", href: "/intranet/dashboard", badge: 3 },
    { icon: Users, label: "Jefatura", href: "/intranet/jefatura" },
    { icon: Bed, label: "Guardia Nocturna", href: "/intranet/guardia-nocturna" },
    ...(isAdmin ? [{ icon: Shield, label: "Admin Guardia", href: "/intranet/guardia-nocturna/admin" }] : []),
    { icon: ImageIcon, label: "Área de Imagen", href: "/intranet/area-imagen" },
    { icon: FileText, label: "Área de Administración", href: "/intranet/area-administracion" },
    { icon: Truck, label: "Área de Operaciones", href: "/intranet/area-operaciones", badge: 2 },
    { icon: BookOpen, label: "Instrucción", href: "/intranet/instruccion" },
    { icon: Wrench, label: "Área de Servicios", href: "/intranet/area-servicios" },
    { icon: BarChart2, label: "Estadísticas", href: "/intranet/dashboard-stats" },
    { icon: Settings, label: "Configuración", href: "/intranet/configuracion" },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 transition-all duration-300 transform",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          isMobile ? "shadow-xl" : "",
        )}
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="h-8 w-8 text-red-500" />
              <Flame className="h-3 w-3 text-amber-400 absolute -right-1 -bottom-1" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Bomberos Intranet</h2>
              <p className="text-xs text-gray-400">Sistema de Gestión</p>
            </div>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(100vh-180px)]">
          <nav className="space-y-1.5">
            {sidebarItems.map((item) => (
              <SidebarItem
                key={item.href}
                icon={item.icon}
                label={item.label}
                href={item.href}
                active={pathname === item.href}
                badge={item.badge}
              />
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-red-800/50"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn("flex-1 transition-all duration-300", isSidebarOpen ? "ml-0 md:ml-64" : "ml-0")}>
        {/* Header */}
        <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-gray-700 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>

            <Link href="/intranet/configuracion" className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">Admin</p>
                <p className="text-xs text-gray-400">Administrador</p>
              </div>
              <Avatar className="h-8 w-8 border border-gray-700">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt="Admin" />
                <AvatarFallback className="bg-red-700 text-white">AD</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>

      {/* Overlay para cerrar el sidebar en móvil */}
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  )
}

