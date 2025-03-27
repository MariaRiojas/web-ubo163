"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Shield, Flame, Lock, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

export default function IntranetLogin() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Credenciales de acceso
  const ADMIN_USER = "admin"
  const ADMIN_PASSWORD = "Bomberos2024"

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Simulamos una pequeña demora para dar sensación de procesamiento
    setTimeout(() => {
      if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
        // Login exitoso
        router.push("/intranet/dashboard")
      } else {
        // Login fallido
        setError("Usuario o contraseña incorrectos")
        setIsLoading(false)
      }
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative transform transition-transform duration-300 hover:scale-110 group">
              <Shield className="h-16 w-16 text-red-500" />
              <Flame className="h-6 w-6 text-amber-400 absolute -right-1 -bottom-1 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Intranet Bomberos</h1>
          <p className="text-red-200">Acceso exclusivo para personal autorizado</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-md text-white">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center text-gray-300">
              Ingrese sus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-900/50 border-red-800 text-white">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleLogin}>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-200">
                    Usuario
                  </Label>
                  <Input
                    id="username"
                    placeholder="Ingrese su usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-white/20 border-white/10 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-gray-200">
                      Contraseña
                    </Label>
                    <Link href="#" className="text-sm text-red-300 hover:text-white transition-colors">
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
                    className="bg-white/20 border-white/10 text-white placeholder:text-gray-400"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transform hover:scale-105 transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Accediendo...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Lock className="mr-2 h-4 w-4" />
                      Acceder
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-gray-300">
              <p>Credenciales de demostración:</p>
              <p className="font-mono bg-white/10 px-2 py-1 rounded mt-1">Usuario: admin | Contraseña: Bomberos2024</p>
            </div>
            <div className="text-center text-sm text-gray-300">
              <Link href="/" className="text-red-300 hover:text-white transition-colors">
                Volver al sitio principal
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

