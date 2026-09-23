'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Lock, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import { AuthShell, AuthError, authInput, authLabel } from './auth-shell'
import { completarPrimerIngreso } from '@/lib/auth/account-actions'

export function PrimerIngresoClient({ nombre }: { nombre: string }) {
  const router = useRouter()
  const { update } = useSession()
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [personalEmail, setPersonalEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    const res = await completarPrimerIngreso({ password, confirmacion, personalEmail, phone })
    if (!res.ok) {
      setError(res.error)
      setCargando(false)
      return
    }
    // Baja la bandera en el token para que el middleware deje de redirigir.
    await update({ mustChangePassword: false })
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <AuthShell
      eyebrow="Primer ingreso"
      title={`Bienvenido, ${nombre}`}
      subtitle="Definí tu contraseña personal y registrá un correo tuyo. Ese correo es el único modo de recuperar la cuenta si la olvidás."
      footer={
        <button type="button" onClick={() => signOut({ callbackUrl: '/login' })}
          className="btn btn--ghost btn--sm" style={{ textDecoration: 'none' }}>
          Cerrar sesión
        </button>
      }
    >
      {error && <AuthError><AlertCircle className="w-4 h-4" strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} />{error}</AuthError>}

      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="pass" style={authLabel}>Nueva contraseña</label>
          <input id="pass" type="password" value={password} onChange={e => setPassword(e.target.value)}
            required autoComplete="new-password" placeholder="Mínimo 8 caracteres, con letras y números" style={authInput} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="pass2" style={authLabel}>Repetir contraseña</label>
          <input id="pass2" type="password" value={confirmacion} onChange={e => setConfirmacion(e.target.value)}
            required autoComplete="new-password" placeholder="Repetí la contraseña" style={authInput} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="mail" style={authLabel}>Correo personal</label>
          <input id="mail" type="email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)}
            required autoComplete="email" placeholder="tucorreo@gmail.com" style={authInput} />
          <p style={{ fontSize: 11.5, color: 'var(--graphite)', margin: '7px 0 0', lineHeight: 1.45 }}>
            Usá uno al que entres siempre. No es institucional y solo se usa para recuperar tu acceso.
          </p>
        </div>

        <div style={{ marginBottom: 22 }}>
          <label htmlFor="tel" style={authLabel}>Celular (opcional)</label>
          <input id="tel" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            autoComplete="tel" placeholder="9XX XXX XXX" style={authInput} />
        </div>

        <button type="submit" className="btn btn--primary" disabled={cargando}
          style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
          {cargando
            ? <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} /> Guardando…</>
            : <><ShieldCheck className="w-4 h-4" strokeWidth={1.8} /> Activar mi cuenta</>}
        </button>
      </form>

      <div style={{ display: 'flex', gap: 7, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--ink-line)', color: 'var(--graphite)', fontSize: 11.5, lineHeight: 1.5 }}>
        <Lock className="w-3.5 h-3.5" strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
        La clave que te dio tu jefe es temporal y deja de servir apenas definas la tuya.
      </div>
    </AuthShell>
  )
}
