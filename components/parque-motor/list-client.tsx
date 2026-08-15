'use client'

import Link from 'next/link'
import { Truck, ChevronRight, ClipboardCheck, AlertTriangle, Boxes } from 'lucide-react'
import type { ParqueMotorMachine } from '@/lib/parque-motor/get-data'

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }

function fechaLarga(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const mes = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${dias[d.getUTCDay()]} ${d.getUTCDate()} de ${mes[d.getUTCMonth()]}. ${d.getUTCFullYear()}`
}

export function ParqueMotorListClient({ machines, date, canFill }: { machines: ParqueMotorMachine[]; date: string; canFill: boolean }) {
  return (
    <div>
      <header className="area-hero" style={{ marginBottom: 18 }}>
        <div className="area-hero-seal"><Truck className="w-6 h-6" strokeWidth={1.6} /></div>
        <div className="area-hero-body">
          <div className="area-hero-ref">PARQUE MOTOR · CHECKLIST DE UNIDADES</div>
          <h1 className="area-hero-title">Checklist del Parque Motor</h1>
          <p className="area-hero-desc">Verifica el equipo de cada máquina según su inventario. Marca presente, faltante o dañado y deja observaciones. {canFill ? 'Cualquier efectivo en servicio puede completarlo.' : 'Solo lectura — el registro es para efectivos activos.'}</p>
        </div>
      </header>

      <div style={{ ...mono, fontSize: 11, color: 'var(--steel)', marginBottom: 12 }}>Inspección de hoy · {fechaLarga(date)}</div>

      {machines.length === 0 ? (
        <div className="guardia-empty" style={{ padding: 34 }}>
          <p style={{ marginBottom: 8 }}>Aún no hay equipo de máquinas en el inventario.</p>
          <p style={{ ...mono, fontSize: 12, color: 'var(--graphite)', lineHeight: 1.6 }}>
            El checklist se arma solo a partir del inventario. Para que una unidad aparezca aquí, sus ítems deben registrarse con
            <b style={{ color: 'var(--steel)' }}> almacén = «máquina»</b>, la <b style={{ color: 'var(--steel)' }}>referencia de la unidad</b> (ej. B163-1) y su <b style={{ color: 'var(--steel)' }}>ubicación interna</b> (el gabinete).
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {machines.map(m => (
            <Link key={m.ref} href={`/parque-motor/${encodeURIComponent(m.ref)}`}
              style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', borderRadius: 4, padding: '14px 16px' }}>
              <div style={{ width: 42, height: 42, borderRadius: 3, background: 'var(--ink-black)', border: '1px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Truck className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--brass)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--bone)' }}>{m.ref}</div>
                <div style={{ ...mono, fontSize: 11, color: 'var(--steel)', display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Boxes className="w-3 h-3" strokeWidth={1.8} /> {m.itemCount} ítems · {m.gabineteCount} gabinete{m.gabineteCount === 1 ? '' : 's'}</span>
                  {m.hoy
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: m.hoy.marcados >= m.itemCount ? 'var(--emerald-glow)' : 'var(--brass)' }}>
                        <ClipboardCheck className="w-3 h-3" strokeWidth={1.8} /> {m.hoy.marcados}/{m.itemCount} hoy{m.hoy.lastBy ? ` · últ. ${m.hoy.lastBy.split(' ')[0]}` : ''}
                      </span>
                    : <span style={{ color: 'var(--graphite)' }}>sin inspección hoy</span>}
                  {m.hoy && (m.hoy.faltantes > 0 || m.hoy.danados > 0) &&
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--flame)' }}>
                      <AlertTriangle className="w-3 h-3" strokeWidth={2} /> {m.hoy.faltantes} falt · {m.hoy.danados} dañ
                    </span>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--graphite)', flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
