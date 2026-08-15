"use client"

import type React from "react"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Lock, AlertCircle, ArrowLeft, Loader2 } from "lucide-react"
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

    const result = await signIn("credentials", { username, password, redirect: false })

    if (result?.error) {
      setError("Usuario o contraseña incorrectos")
      setIsLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", fontSize: 14,
    background: "var(--ink-black)", border: "1px solid var(--ink-line)",
    color: "var(--bone)", borderRadius: 2, outline: "none",
    fontFamily: "var(--font-sans, inherit)",
  }
  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: "var(--font-mono)", fontSize: 10,
    letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--steel)", marginBottom: 8,
  }

  return (
    <div className="intranet-theme" style={{ minHeight: "100vh", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      {/* Fondo institucional: grid + glow tenue */}
      <div className="bg-grid" style={{ position: "absolute", inset: 0, opacity: 0.5, pointerEvents: "none" }} />
      <div className="bg-glow-red" style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {/* Sello + título */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/escudo-163.png" alt="Escudo Compañía N.° 163" width={84} height={84}
              style={{ width: 84, height: 84, objectFit: "contain" }} />
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--brass)", marginBottom: 10 }}>
            Sistema Interno · Acceso Restringido
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, lineHeight: 1.1, color: "var(--bone)", marginBottom: 6 }}>
            {companyConfig.shortName}
          </h1>
          <p style={{ fontSize: 13, color: "var(--steel)" }}>Intranet de la Compañía</p>
        </div>

        {/* Tarjeta */}
        <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", borderRadius: 3, padding: "28px 26px" }}>
          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 18,
              padding: "10px 12px", background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.3)", borderRadius: 2,
              fontSize: 13, color: "var(--red-glow, #F87171)",
            }}>
              <AlertCircle className="w-4 h-4" strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="username" style={labelStyle}>Usuario (DNI o correo)</label>
              <input
                id="username" value={username} onChange={(e) => setUsername(e.target.value)}
                required autoComplete="username" placeholder="Ingrese su DNI o correo"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brass)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ink-line)")}
              />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label htmlFor="password" style={labelStyle}>Contraseña</label>
              <input
                id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required autoComplete="current-password" placeholder="Ingrese su contraseña"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brass)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ink-line)")}
              />
            </div>

            <button type="submit" className="btn btn--primary" disabled={isLoading}
              style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} /> Accediendo…</>
                : <><Lock className="w-4 h-4" strokeWidth={1.8} /> Acceder al sistema</>}
            </button>
          </form>
        </div>

        {/* Pie */}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link href="/" className="btn btn--ghost btn--sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
            Volver al sitio público
          </Link>
          <p style={{ marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", color: "var(--graphite)", lineHeight: 1.7 }}>
            {companyConfig.name}<br />
            Acceso solo para personal autorizado
          </p>
        </div>
      </div>
    </div>
  )
}
