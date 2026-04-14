"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Moon,
  BookOpen,
  AlertCircle,
  Package,
  Users,
  Calendar,
  BarChart3,
  Settings,
  User,
  Building2,
  Shield,
  Flame,
  LogOut,
  ChevronLeft,
  Megaphone,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { companyConfig } from "@/company.config"
import type { Permission } from "@/lib/auth/permissions"
import { useState } from "react"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  permission?: Permission
  badge?: string
  normativeRef?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

function buildNavGroups(permissions: Permission[]): NavGroup[] {
  const has = (p: Permission) => permissions.includes(p)

  const groups: NavGroup[] = [
    {
      label: "Principal",
      items: [
        { href: "/intranet/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/intranet/comunicados", label: "Comunicados", icon: Megaphone },
        { href: "/intranet/perfil", label: "Mi Perfil", icon: User },
      ],
    },
  ]

  // Módulos operativos (todos los efectivos)
  const operativos: NavItem[] = [
    { href: "/intranet/guardia-nocturna", label: "Guardia Nocturna", icon: Moon },
    { href: "/intranet/horas", label: "Jornada Voluntaria", icon: Clock },
    { href: "/intranet/incidencias", label: "Incidencias", icon: AlertCircle },
    { href: "/intranet/esbas", label: "ESBAS", icon: BookOpen, normativeRef: "NDR Malla Curricular" },
  ]
  groups.push({ label: "Operativo", items: operativos })

  // Gestión (jefes de sección y superiores)
  const gestion: NavItem[] = []
  if (has("personnel.view_section") || has("personnel.view_all")) {
    gestion.push({ href: "/intranet/personal", label: "Personal", icon: Users })
  }
  if (has("inventory.view")) {
    gestion.push({ href: "/intranet/inventario", label: "Inventario", icon: Package })
  }
  if (has("content.view")) {
    gestion.push({ href: "/intranet/contenido", label: "Contenido e Imagen", icon: Calendar })
  }
  if (has("company.view_all") || has("section.manage")) {
    gestion.push({
      href: "/intranet/secciones",
      label: "Secciones",
      icon: Building2,
      normativeRef: "Art. 112 RIF",
    })
  }
  if (gestion.length > 0) {
    groups.push({ label: "Gestión", items: gestion })
  }

  // Administración (jefatura y admins)
  const admin: NavItem[] = []
  if (has("reports.view_section") || has("reports.view_all")) {
    admin.push({ href: "/intranet/reportes", label: "Reportes", icon: BarChart3 })
  }
  if (has("system.admin")) {
    admin.push({ href: "/intranet/configuracion", label: "Configuración", icon: Settings })
  }
  if (admin.length > 0) {
    groups.push({ label: "Administración", items: admin })
  }

  return groups
}

export function IntranetSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)

  const permissions = (session?.user?.permissions as Permission[]) ?? []
  const navGroups = buildNavGroups(permissions)

  const initials = session?.user?.name
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("") ?? "?"

  const gradeLabels: Record<string, string> = {
    aspirante: "Aspirante",
    seccionario: "Seccionario",
    subteniente: "Subteniente",
    teniente: "Teniente",
    capitan: "Capitán",
    teniente_brigadier: "Ten. Brigadier",
    brigadier: "Brigadier",
    brigadier_mayor: "Brig. Mayor",
    brigadier_general: "Brig. General",
  }

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-card border-r border-border transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="relative shrink-0">
          <Shield className="h-8 w-8 text-primary" />
          <Flame className="h-3 w-3 text-amber-500 absolute -right-1 -bottom-1" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate">{companyConfig.shortName}</p>
            <p className="text-xs text-muted-foreground">Intranet</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 ml-auto shrink-0", collapsed && "rotate-180")}
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                {group.label}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                      {!collapsed && (
                        <span className="flex-1 truncate">{item.label}</span>
                      )}
                      {!collapsed && item.badge && (
                        <Badge variant="secondary" className="text-xs">{item.badge}</Badge>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — perfil del usuario */}
      <div className="border-t border-border p-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {gradeLabels[session?.user?.grade ?? ""] ?? session?.user?.grade}
              </p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
}
