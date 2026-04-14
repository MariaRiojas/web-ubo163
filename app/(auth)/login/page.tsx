"use client"

import type React from "react"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Shield, Flame, Lock, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { companyConfig } from "@/company.config"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Usuario o contraseña incorrectos")
      setIsLoading(false)
    } else {
      router.push("/intranet/dashboard")
      router.refresh()
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${companyConfig.theme.gradientFrom} via-red-700 ${companyConfig.theme.gradientTo} flex items-center justify-center p-4 relative overflow-hidden`}>
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
      <div className="absolute top-20 left-20 w-72 h-72 bg-red-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" />
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-amber-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative transform transition-transform duration-300 hover:scale-110 group">
              <Shield className="h-20 w-20 text-white drop-shadow-2xl" />
              <Flame className="h-8 w-8 text-amber-300 absolute -right-2 -bottom-2 animate-pulse drop-shadow-lg" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">{companyConfig.shortName}</h1>
          <p className="text-red-100 text-lg drop-shadow">Intranet — Acceso Seguro</p>
        </div>

        <Card className="border-0 shadow-2xl glass-strong backdrop-blur-xl text-white">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-white">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center text-red-100">
              Ingrese sus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-900/50 border-red-700 text-white backdrop-blur-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error de Autenticación</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleLogin}>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white font-medium">
                    Usuario (DNI o email)
                  </Label>
                  <Input
                    id="username"
                    placeholder="Ingrese su DNI o email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    className="bg-white/20 border-white/30 text-white placeholder:text-red-200/60 backdrop-blur-sm focus:bg-white/30 focus:border-red-300 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-white font-medium">
                      Contraseña
                    </Label>
                    <Link href="#" className="text-sm text-red-200 hover:text-white transition-colors">
                      ¿Olvidó su contraseña?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Ingrese su contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="bg-white/20 border-white/30 text-white placeholder:text-red-200/60 backdrop-blur-sm focus:bg-white/30 focus:border-red-300 transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Accediendo...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Lock className="mr-2 h-4 w-4" />
                      Acceder al Sistema
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-red-100">
              <Link href="/" className="text-white hover:text-red-200 transition-colors font-medium underline decoration-dotted">
                ← Volver al sitio público
              </Link>
            </div>
            <div className="text-center text-xs text-red-200/80 border-t border-white/20 pt-4 w-full">
              <p>Sistema de gestión interna</p>
              <p className="mt-1">{companyConfig.name}</p>
            </div>
          </CardFooter>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-red-100 glass px-4 py-3 rounded-lg backdrop-blur-sm">
            <Lock className="inline h-4 w-4 mr-2" />
            Acceso restringido solo para personal autorizado
          </p>
        </div>
      </div>
    </div>
  )
}
