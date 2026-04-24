"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Menu, Home, Radio, TrendingUp, FileText, Users, ClipboardList,
  BarChart3, Building2, User, LogOut, Flame, Moon, BookOpen,
  AlertCircle, Package, Calendar, Settings, Shield, Clock, Megaphone,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { companyConfig } from "@/company.config"
import type { Permission } from "@/lib/auth/permissions"

function buildNavGroups(permissions: Permission[]) {
  const has = (p: Permission) => permissions.includes(p)
  const isJefatura = has("company.manage") || has("company.view_all")

  const groups = [
    { label: "", items: [
      { href: "/dashboard", label: "Inicio", icon: Home },
      { href: "/mi-compania", label: "Mi Compañía", icon: Building2 },
      { href: "/perfil", label: "Mi Perfil", icon: User },
    ]},
    { label: "Operativo", items: [
      { href: "/guardia-nocturna", label: "Guardia Nocturna", icon: Moon },
      { href: "/horas", label: "Jornada Voluntaria", icon: Clock },
      { href: "/incidencias", label: "Incidencias", icon: AlertCircle },
      { href: "/esbas", label: "ESBAS", icon: BookOpen },
      { href: "/comunicados", label: "Comunicados", icon: Megaphone },
    ]},
  ]

  if (isJefatura) {
    groups.push({ label: "Reportería / Insights", items: [
      { href: "/operatividad", label: "Operatividad", icon: Radio },
      { href: "/estadisticas", label: "Estadísticas", icon: TrendingUp },
      { href: "/partes-emergencia", label: "Partes de Emergencia", icon: FileText },
      { href: "/bomberos", label: "Bomberos", icon: Users },
      { href: "/asistencias", label: "Asistencias", icon: ClipboardList },
      { href: "/analisis", label: "Análisis", icon: BarChart3 },
    ]})
  }

  const gestion: { href: string; label: string; icon: any }[] = []
  if (has("personnel.view_section") || has("personnel.view_all"))
    gestion.push({ href: "/personal", label: "Personal", icon: Users })
  if (has("inventory.view"))
    gestion.push({ href: "/inventario", label: "Inventario General", icon: Package })
  if (has("content.view"))
    gestion.push({ href: "/contenido", label: "Calendario", icon: Calendar })
  if (has("company.view_all") || has("section.manage"))
    gestion.push({ href: "/secciones", label: "Secciones", icon: Building2 })
  if (gestion.length > 0) groups.push({ label: "Gestión", items: gestion })

  const admin: { href: string; label: string; icon: any }[] = []
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

export function IntranetMobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const permissions = (session?.user?.permissions as Permission[]) ?? []
  const navGroups = buildNavGroups(permissions)
  const initials = session?.user?.name?.split(" ").slice(0, 2).map((n) => n[0]).join("") ?? "?"

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9"><Menu className="h-5 w-5" /></Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 flex flex-col bg-[#1a1f2e] text-white border-0">
        <SheetHeader className="p-4">
          <SheetTitle asChild>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-red-600/20 flex items-center justify-center">
                <Flame className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-white">{companyConfig.shortName}</p>
                <p className="text-xs text-white/50">Cía. N.° {companyConfig.id} — CGBVP</p>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto px-2 space-y-5">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-2">{group.label}</p>}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <li key={item.href}>
                      <Link href={item.href} onClick={() => setOpen(false)}
                        className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                          isActive ? "bg-red-600 text-white font-medium" : "text-white/70 hover:bg-white/5"
                        )}>
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8"><AvatarFallback className="bg-red-600/20 text-red-400 text-xs font-bold">{initials}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session?.user?.name}</p>
              <Badge className="text-[10px] bg-white/10 text-white/60 border-0 mt-0.5">
                {GRADE_LABELS[session?.user?.grade ?? ""] ?? "—"}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
