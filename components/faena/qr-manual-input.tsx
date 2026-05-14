"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function QrManualInput() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (!normalized) {
      setErr('Ingrese un código')
      return
    }
    if (!/^MC-[A-Z0-9]+$/i.test(normalized)) {
      setErr('El código debe tener formato MC-XXXXXXXX')
      return
    }
    setErr(null)
    router.push(`/faena/qr/${encodeURIComponent(normalized)}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 4,
      }}
    >
      <input
        type="text"
        placeholder="MC-4F2A9B87"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoFocus
        style={{
          padding: '10px 14px',
          fontSize: 14,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em',
          color: 'var(--bone)',
          background: 'var(--ink-black)',
          border: '1px solid var(--ink-line)',
          borderRadius: 2,
          minWidth: 220,
          textTransform: 'uppercase',
        }}
      />
      <button type="submit" className="btn btn--primary">
        Ir al compartimiento
      </button>
      {err && (
        <div
          style={{
            width: '100%',
            marginTop: 8,
            color: 'var(--red-glow)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {err}
        </div>
      )}
    </form>
  )
}
