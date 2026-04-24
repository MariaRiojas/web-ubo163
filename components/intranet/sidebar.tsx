"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  Home, Radio, TrendingUp, FileText, Users, ClipboardList,
  BarChart3, Building2, User, LogOut, ChevronLeft, Flame, Shield,
  Moon, BookOpen, AlertCircle, Package, Calendar, Settings, Clock, Megaphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { companyConfig } from "@/company.config"
import type { Permission } from "@/lib/auth/permissions"
import { useState } from "react"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badge?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

function buildNavGroups(permissions: Permission[]): NavGroup[] {
  const has = (p: Permission) => permissions.includes(p)
  const isJefatura = has("company.manage") || has("company.view_all")

  const groups: NavGroup[] = []

  // ── Principal (todos) ──────────────────────────────────────────
  groups.push({
    label: "",
    items: [
      { href: "/dashboard", label: "Inicio", icon: Home },
      { href: "/mi-compania", label: "Mi Compañía", icon: Building2 },
      { href: "/perfil", label: "Mi Perfil", icon: User },
    ],
  })

  // ── Operativo (todos los efectivos) ────────────────────────────
  const operativos: NavItem[] = [
    { href: "/guardia-nocturna", label: "Guardia Nocturna", icon: Moon },
    { href: "/horas", label: "Jornada Voluntaria", icon: Clock },
    { href: "/incidencias", label: "Incidencias", icon: AlertCircle },
    { href: "/esbas", label: "ESBAS", icon: BookOpen },
    { href: "/comunicados", label: "Comunicados", icon: Megaphone },
  ]
  groups.push({ label: "Operativo", items: operativos })

  // ── Reportería / Insights (solo jefatura) ────────────────────
  if (isJefatura) {
    groups.push({
      label: "Reportería / Insights",
      items: [
        { href: "/operatividad", label: "Operatividad", icon: Radio },
        { href: "/estadisticas", label: "Estadísticas", icon: TrendingUp },
        { href: "/partes-emergencia", label: "Partes de Emergencia", icon: FileText },
        { href: "/bomberos", label: "Bomberos", icon: Users },
        { href: "/asistencias", label: "Asistencias", icon: ClipboardList },
        { href: "/analisis", label: "Análisis", icon: BarChart3 },
      ],
    })
  }

  // ── Gestión (jefes de sección y superiores) — módulos originales ──
  const gestion: NavItem[] = []
  if (has("personnel.view_section") || has("personnel.view_all"))
    gestion.push({ href: "/personal", label: "Personal", icon: Users })
  if (has("inventory.view"))
    gestion.push({ href: "/inventario", label: "Inventario General", icon: Package })
  if (has("content.view"))
    gestion.push({ href: "/contenido", label: "Calendario", icon: Calendar })
  if (has("company.view_all") || has("section.manage"))
    gestion.push({ href: "/secciones", label: "Secciones", icon: Building2 })
  if (gestion.length > 0) groups.push({ label: "Gestión", items: gestion })

  // ── Administración (jefatura) — módulos originales ─────────────
  const admin: NavItem[] = []
  if (has("company.manage") || has("company.view_all"))
    admin.push({ href: "/jefatura", label: "Jefatura", icon: Shield })
  if (has("system.admin"))
    admin.push({ href: "/configuracion", label: "Configuración", icon: Settings })
  if (admin.length > 0) groups.push({ label: "Administración", items: admin })

  return groups
}

const GRADE_LABELS: Record<string, string> = {
  aspirante: "Aspirante", seccionario: "Seccionario", subteniente: "Subteniente",
  teniente: "Teniente", capitan: "Capitán", teniente_brigadier: "Ten. Brigadier",
  brigadier: "Brigadier", brigadier_mayor: "Brig. Mayor", brigadier_general: "Brig. General",
}

export function IntranetSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)

  const permissions = (session?.user?.permissions as Permission[]) ?? []
  const navGroups = buildNavGroups(permissions)

  const initials = session?.user?.name
    ?.split(" ").slice(0, 2).map((n) => n[0]).join("") ?? "?"

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-[#1a1f2e] text-white transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-5">
        <div className="h-9 w-9 rounded-full bg-red-600/20 flex items-center justify-center shrink-0">
          <Flame className="h-5 w-5 text-red-500" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate">{companyConfig.shortName}</p>
            <p className="text-xs text-white/50">Cía. N.° {companyConfig.id} — CGBVP</p>
          </div>
        )}
        <Button
          variant="ghost" size="icon"
          className={cn("h-6 w-6 ml-auto shrink-0 text-white/40 hover:text-white hover:bg-white/10", collapsed && "rotate-180")}
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-5">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {!collapsed && group.label && (
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-2">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-red-600 text-white font-medium shadow-lg shadow-red-600/20"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && isActive && (
                        <ChevronLeft className="h-3.5 w-3.5 ml-auto rotate-180" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 mt-auto">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-red-600/20 text-red-400 text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session?.user?.name}</p>
              <p className="text-xs text-white/40">
                {GRADE_LABELS[session?.user?.grade ?? ""] ?? session?.user?.grade}
              </p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10 shrink-0"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
}
