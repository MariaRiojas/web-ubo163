'use client'

import { Construction } from 'lucide-react'
import Link from 'next/link'

export default function IntranetError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="area-placeholder">
      <div className="area-placeholder-icon">
        <Construction className="w-8 h-8" strokeWidth={1.4} />
      </div>
      <h3 className="area-placeholder-title">Vista en construcción</h3>
      <p className="area-placeholder-text">
        Esta vista está planificada y se implementará próximamente.
      </p>
      <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '8px 16px',
            background: 'var(--ink-surface)',
            border: '1px solid var(--ink-line)',
            color: 'var(--steel)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
        <Link
          href="/dashboard"
          style={{
            padding: '8px 16px',
            background: 'var(--ink-surface)',
            border: '1px solid var(--ink-line)',
            color: 'var(--steel)',
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
