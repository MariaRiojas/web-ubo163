'use client'

import Link from 'next/link'

export function PrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="registro-print-toolbar" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <Link href={backHref} className="btn btn--ghost btn--sm" style={{ textDecoration: 'none' }}>
        ← Volver
      </Link>
      <button className="btn btn--primary btn--sm" onClick={() => window.print()}>
        Imprimir / Guardar PDF
      </button>
    </div>
  )
}
