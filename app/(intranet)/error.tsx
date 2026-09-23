'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

/**
 * Límite de error del intranet.
 *
 * Antes decía "Vista en construcción" ante CUALQUIER error, así que un fallo real
 * (permisos IAM, datos corruptos, un bug de render) se veía igual que una función
 * sin implementar y era imposible de diagnosticar sin acceso a la consola del
 * navegador. Ahora dice que algo falló y deja ver el detalle técnico para poder
 * reportarlo.
 */
export default function IntranetError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [verDetalle, setVerDetalle] = useState(false)

  return (
    <div className="area-placeholder">
      <div className="area-placeholder-icon" style={{ color: 'var(--flame)' }}>
        <AlertTriangle className="w-8 h-8" strokeWidth={1.4} />
      </div>
      <h3 className="area-placeholder-title">No se pudo cargar esta vista</h3>
      <p className="area-placeholder-text">
        Ocurrió un error al mostrar esta sección. Podés reintentar; si vuelve a pasar,
        avisá a soporte con el detalle técnico de abajo.
      </p>

      <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={reset} className="btn btn--primary btn--sm">Reintentar</button>
        <Link href="/dashboard" className="btn btn--ghost btn--sm" style={{ textDecoration: 'none' }}>
          Volver al inicio
        </Link>
        <button type="button" onClick={() => setVerDetalle(v => !v)} className="btn btn--ghost btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {verDetalle ? <ChevronUp className="w-3 h-3" strokeWidth={1.8} /> : <ChevronDown className="w-3 h-3" strokeWidth={1.8} />}
          Detalle técnico
        </button>
      </div>

      {verDetalle && (
        <pre style={{
          marginTop: 18, textAlign: 'left', maxWidth: 720, marginInline: 'auto',
          padding: '12px 14px', background: 'var(--ink-black)', border: '1px solid var(--ink-line)',
          borderRadius: 3, color: 'var(--steel)', fontFamily: 'var(--font-mono)', fontSize: 11.5,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5,
        }}>
          {error.message || 'Sin mensaje'}
          {error.digest ? `\n\nID del error: ${error.digest}` : ''}
        </pre>
      )}
    </div>
  )
}
