"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Users,
  Moon,
  AlertTriangle,
  GraduationCap,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  ChevronRight,
  UserCircle,
} from "lucide-react"
import { User, getUserPermissions } from "@/lib/auth"

interface NavItem {
  name: string
  path: string
  icon: React.ElementType
  permission?: keyof ReturnType<typeof getUserPermissions>
  subItems?: NavItem[]
}

export function IntranetNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const currentUser = localStorage.getItem("currentUser")
    if (currentUser) {
      setUser(JSON.parse(currentUser))
    }
  }, [])

  const getNavItems = (): NavItem[] => {
    if (!user) return []

    const permissions = getUserPermissions(user)

    const allItems: NavItem[] = [
      {
        name: "Dashboard",
        path: "/intranet/dashboard",
        icon: LayoutDashboard,
        permission: "canViewDashboard",
      },
      {
        name: "Guardia Nocturna",
        path: "/intranet/guardia-nocturna",
        icon: Moon,
        permission: "canViewGuards",
      },
      {
        name: "Incidencias",
        path: "/intranet/incidencias",
        icon: AlertTriangle,
        permission: "canViewIncidents",
      },
      {
        name: "ESBAS",
        path: "/intranet/esbas",
        icon: GraduationCap,
        permission: "canAccessEsbas",
      },
      {
        name: "Equipo",
        path: "/intranet/equipo",
        icon: Users,
        permission: "canViewTeam",
      },
      {
        name: "Áreas",
        path: "/intranet/areas",
        icon: Shield,
        permission: "canManageArea",
        subItems: permissions.accessibleAreas.length > 0
          ? permissions.accessibleAreas.map((area) => ({
              name: area.charAt(0).toUpperCase() + area.slice(1),
              path: `/intranet/areas/${area}`,
              icon: Shield,
            }))
          : undefined,
      },
      {
        name: "Reportes",
        path: "/intranet/reportes",
        icon: FileText,
        permission: "canViewReports",
      },
      {
        name: "Perfil",
        path: "/intranet/perfil",
        icon: UserCircle,
        permission: "canViewProfile",
      },
      {
        name: "Configuración",
        path: "/intranet/configuracion",
        icon: Settings,
        permission: "canAccessConfig",
      },
    ]

    // Filtrar items según permisos
    return allItems.filter((item) => {
      if (!item.permission) return true
      return permissions[item.permission]
    })
  }

  const navItems = getNavItems()

  const handleLogout = () => {
    localStorage.removeItem("currentUser")
    router.push("/intranet")
  }

  if (!isClient) {
    return null
  }

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName]
    )
  }

  const isActive = (path: string) => pathname === path

  const isParentActive = (item: NavItem) => {
    if (pathname === item.path) return true
    if (item.subItems) {
      return item.subItems.some((sub) => pathname === sub.path)
    }
    return false
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-strong border-b border-primary/10 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h2 className="font-bold text-sm">Intranet Bomberos 163</h2>
            <p className="text-xs text-muted-foreground">{user?.name}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen glass-strong border-r border-primary/10 z-50 transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-0 lg:w-20"
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-primary/10">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-10 w-10 text-primary flex-shrink-0" />
              {isSidebarOpen && (
                <div className="overflow-hidden">
                  <h2 className="font-bold text-lg">Intranet</h2>
                  <p className="text-xs text-muted-foreground">Bomberos 163</p>
                </div>
              )}
            </div>
            {isSidebarOpen && user && (
              <div className="glass p-3 rounded-lg">
                <p className="font-semibold text-sm truncate">{user.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                    {user.role.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto overflow-x-hidden">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0
                const isExpanded = expandedItems.includes(item.name)
                const activeItem = isParentActive(item)

                return (
                  <li key={item.name}>
                    <div>
                      <Link
                        href={!hasSubItems ? item.path : "#"}
                        onClick={(e) => {
                          if (hasSubItems) {
                            e.preventDefault()
                            toggleExpanded(item.name)
                          }
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          activeItem
                            ? "bg-primary/20 text-primary font-semibold"
                            : "hover:bg-primary/10 text-foreground/70 hover:text-foreground"
                        } ${!isSidebarOpen && "justify-center"}`}
                      >
                        <item.icon className={`h-5 w-5 flex-shrink-0 ${activeItem && "text-primary"}`} />
                        {isSidebarOpen && (
                          <>
                            <span className="flex-1 text-sm font-medium">{item.name}</span>
                            {hasSubItems && (
                              isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )
                            )}
                          </>
                        )}
                      </Link>

                      {/* Sub-items */}
                      {hasSubItems && isExpanded && isSidebarOpen && (
                        <ul className="ml-6 mt-2 space-y-1 border-l border-primary/10 pl-3">
                          {item.subItems?.map((subItem) => {
                            return (
                              <li key={subItem.name}>
                                <Link
                                  href={subItem.path}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                                    isActive(subItem.path)
                                      ? "bg-primary/20 text-primary font-semibold"
                                      : "hover:bg-primary/10 text-foreground/70 hover:text-foreground"
                                  }`}
                                >
                                  <span>{subItem.name}</span>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-primary/10">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className={`w-full justify-start gap-3 text-muted-foreground hover:text-red-600 hover:bg-red-50 ${
                !isSidebarOpen && "justify-center"
              }`}
            >
              <LogOut className="h-5 w-5" />
              {isSidebarOpen && <span>Cerrar Sesión</span>}
            </Button>
          </div>

          {/* Toggle Button - Desktop Only */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex absolute right-2 top-20 h-8 w-8 rounded-full bg-primary text-white hover:bg-primary/80 shadow-lg z-10"
          >
            {isSidebarOpen ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4 rotate-180" />
            )}
          </Button>
        </div>
      </aside>
    </>
  )
}
