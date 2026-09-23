'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, Mail, KeyRound, CheckCircle2 } from 'lucide-react'
import { AuthShell, AuthError, authInput, authLabel } from './auth-shell'
import { solicitarRecuperacion, confirmarRecuperacion } from '@/lib/auth/account-actions'

export function RecuperarClient() {
  const router = useRouter()
  const [paso, setPaso] = useState<'pedir' | 'confirmar' | 'listo'>('pedir')
  const [identificador, setIdentificador] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function pedir(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setCargando(true)
    const res = await solicitarRecuperacion(identificador)
    setHint(res.hint)
    setPaso('confirmar')
    setCargando(false)
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setCargando(true)
    const res = await confirmarRecuperacion({ identificador, codigo, password, confirmacion })
    if (!res.ok) { setError(res.error); setCargando(false); return }
    setPaso('listo')
    setCargando(false)
  }

  if (paso === 'listo') {
    return (
      <AuthShell eyebrow="Recuperación de cuenta" title="Contraseña actualizada"
        subtitle="Ya podés ingresar con tu código CGBVP y tu nueva contraseña.">
        <button type="button" className="btn btn--primary" onClick={() => router.push('/login')}
          style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
          <CheckCircle2 className="w-4 h-4" strokeWidth={1.8} /> Ir al ingreso
        </button>
      </AuthShell>
    )
  }

  if (paso === 'pedir') {
    return (
      <AuthShell eyebrow="Recuperación de cuenta" title="Recuperar mi acceso"
        subtitle="Te enviamos un código al correo personal que registraste al activar tu cuenta.">
        {error && <AuthError><AlertCircle className="w-4 h-4" strokeWidth={1.8} />{error}</AuthError>}
        <form onSubmit={pedir}>
          <div style={{ marginBottom: 22 }}>
            <label htmlFor="ident" style={authLabel}>Código CGBVP</label>
            <input id="ident" value={identificador} onChange={e => setIdentificador(e.target.value)}
              required placeholder="Ej.: A09600 — o su DNI" style={authInput} />
          </div>
          <button type="submit" className="btn btn--primary" disabled={cargando}
            style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
            {cargando
              ? <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} /> Enviando…</>
              : <><Mail className="w-4 h-4" strokeWidth={1.8} /> Enviarme el código</>}
          </button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell eyebrow="Recuperación de cuenta" title="Ingresá el código"
      subtitle={hint
        ? `Enviamos un código de 6 dígitos a ${hint}. Vence en 30 minutos.`
        : 'Si tu código corresponde a una cuenta con correo personal registrado, te llegó un código de 6 dígitos. Si no te llega, pedile a tu jefe de sección una clave temporal.'}>
      {error && <AuthError><AlertCircle className="w-4 h-4" strokeWidth={1.8} />{error}</AuthError>}
      <form onSubmit={confirmar}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="cod" style={authLabel}>Código recibido</label>
          <input id="cod" value={codigo} onChange={e => setCodigo(e.target.value)} inputMode="numeric"
            required placeholder="000000" maxLength={6}
            style={{ ...authInput, letterSpacing: '0.4em', textAlign: 'center', fontFamily: 'var(--font-mono)' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="np" style={authLabel}>Nueva contraseña</label>
          <input id="np" type="password" value={password} onChange={e => setPassword(e.target.value)}
            required autoComplete="new-password" placeholder="Mínimo 8 caracteres, con letras y números" style={authInput} />
        </div>
        <div style={{ marginBottom: 22 }}>
          <label htmlFor="np2" style={authLabel}>Repetir contraseña</label>
          <input id="np2" type="password" value={confirmacion} onChange={e => setConfirmacion(e.target.value)}
            required autoComplete="new-password" placeholder="Repetí la contraseña" style={authInput} />
        </div>
        <button type="submit" className="btn btn--primary" disabled={cargando}
          style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
          {cargando
            ? <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} /> Guardando…</>
            : <><KeyRound className="w-4 h-4" strokeWidth={1.8} /> Cambiar mi contraseña</>}
        </button>
      </form>
    </AuthShell>
  )
}
