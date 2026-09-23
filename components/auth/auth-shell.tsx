'use client'

import type React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/** Marco institucional compartido por login, primer ingreso y recuperación. */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="intranet-theme" style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="bg-grid" style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }} />
      <div className="bg-glow-red" style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/escudo-163.png" alt="Escudo Compañía N.° 163" width={84} height={84}
              style={{ width: 84, height: 84, objectFit: 'contain' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--brass)', marginBottom: 10 }}>
            {eyebrow}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--bone)', margin: 0 }}>{title}</h1>
          {subtitle && (
            <p style={{ fontSize: 13, color: 'var(--steel)', margin: '10px auto 0', maxWidth: 360, lineHeight: 1.5 }}>{subtitle}</p>
          )}
        </div>

        <div style={{ background: 'var(--ink-elevated)', border: '1px solid var(--ink-line)', borderRadius: 3, padding: 24 }}>
          {children}
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          {footer ?? (
            <Link href="/login" className="btn btn--ghost btn--sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              <ArrowLeft className="w-3 h-3" strokeWidth={1.8} /> Volver al ingreso
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export const authInput: React.CSSProperties = {
  width: '100%', padding: '11px 14px', fontSize: 14,
  background: 'var(--ink-black)', border: '1px solid var(--ink-line)',
  color: 'var(--bone)', borderRadius: 2, outline: 'none',
}

export const authLabel: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10,
  letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--steel)', marginBottom: 8,
}

export function AuthError({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return (
    <div style={{
      display: 'flex', gap: 8, padding: '10px 12px', marginBottom: 16,
      background: 'color-mix(in srgb, var(--red-163) 12%, transparent)',
      border: '1px solid color-mix(in srgb, var(--red-163) 40%, transparent)',
      borderRadius: 2, fontSize: 13, color: 'var(--red-glow, #F87171)',
    }}>{children}</div>
  )
}
