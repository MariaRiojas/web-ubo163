"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Menu,
  Shield,
  Flame,
  LogOut,
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
  Megaphone,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { companyConfig } from "@/company.config"
import type { Permission } from "@/lib/auth/permissions"

// Reutiliza la misma lógica de nav que el sidebar de escritorio
interface NavItem {
  href: string
  label: string
  icon: React.ElementType
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
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/comunicados", label: "Comunicados", icon: Megaphone },
        { href: "/perfil", label: "Mi Perfil", icon: User },
      ],
    },
    {
      label: "Operativo",
      items: [
        { href: "/guardia-nocturna", label: "Guardia Nocturna", icon: Moon },
        { href: "/horas", label: "Jornada Voluntaria", icon: Clock },
        { href: "/incidencias", label: "Incidencias", icon: AlertCircle },
        { href: "/esbas", label: "ESBAS", icon: BookOpen },
      ],
    },
  ]

  const gestion: NavItem[] = []
  if (has("personnel.view_section") || has("personnel.view_all"))
    gestion.push({ href: "/personal", label: "Personal", icon: Users })
  if (has("inventory.view"))
    gestion.push({ href: "/inventario", label: "Inventario", icon: Package })
  if (has("content.view"))
    gestion.push({ href: "/contenido", label: "Contenido", icon: Calendar })
  if (has("company.view_all") || has("section.manage"))
    gestion.push({ href: "/secciones", label: "Secciones", icon: Building2 })
  if (gestion.length > 0) groups.push({ label: "Gestión", items: gestion })

  const admin: NavItem[] = []
  if (has("reports.view_section") || has("reports.view_all"))
    admin.push({ href: "/reportes", label: "Reportes", icon: BarChart3 })
  if (has("system.admin"))
    admin.push({ href: "/configuracion", label: "Configuración", icon: Settings })
  if (admin.length > 0) groups.push({ label: "Administración", items: admin })

  return groups
}

const GRADE_LABELS: Record<string, string> = {
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

export function IntranetMobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  const permissions = (session?.user?.permissions as Permission[]) ?? []
  const navGroups = buildNavGroups(permissions)

  const initials =
    session?.user?.name
      ?.split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("") ?? "?"

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle asChild>
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <Shield className="h-7 w-7 text-primary" />
                <Flame className="h-3 w-3 text-amber-500 absolute -right-1 -bottom-1" />
              </div>
              <div className="min-w-0 text-left">
                <p className="font-bold text-sm leading-tight truncate">{companyConfig.shortName}</p>
                <p className="text-xs text-muted-foreground font-normal">Intranet</p>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session?.user?.name}</p>
              <Badge variant="secondary" className="text-xs mt-0.5">
                {GRADE_LABELS[session?.user?.grade ?? ""] ?? session?.user?.grade ?? "—"}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
