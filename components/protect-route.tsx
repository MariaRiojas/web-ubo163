"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { User, UserRole, Module, hasAccessToModule, hasAccessToArea } from "@/lib/auth"
import { Shield, Loader2 } from "lucide-react"

interface ProtectRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requiredModule?: Module
  requireArea?: string
}

export function ProtectRoute({ children, allowedRoles, requiredModule, requireArea }: ProtectRouteProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const currentUser = localStorage.getItem("currentUser")

    if (!currentUser) {
      router.push("/intranet")
      return
    }

    const userData: User = JSON.parse(currentUser)
    setUser(userData)

    // Check role access
    if (allowedRoles && !allowedRoles.includes(userData.role)) {
      setHasAccess(false)
      setIsLoading(false)
      return
    }

    // Check module access
    if (requiredModule && !hasAccessToModule(userData, requiredModule)) {
      setHasAccess(false)
      setIsLoading(false)
      return
    }

    // Check area access
    if (requireArea && !hasAccessToArea(userData, requireArea as any)) {
      setHasAccess(false)
      setIsLoading(false)
      return
    }

    setHasAccess(true)
    setIsLoading(false)
  }, [router, allowedRoles, requiredModule, requireArea])

  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="text-center max-w-md mx-auto p-8 glass rounded-2xl">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground mb-6">
            No tienes permisos para acceder a esta sección.
          </p>
          <button
            onClick={() => router.push("/intranet/dashboard")}
            className="bg-gradient-to-r from-primary to-red-800 text-white px-6 py-2 rounded-lg hover:from-red-700 hover:to-red-900 transition-all"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
