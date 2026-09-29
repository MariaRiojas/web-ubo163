'use client'

import Link from 'next/link'
import { Truck, ChevronRight, ClipboardCheck, AlertTriangle, Boxes, Clock } from 'lucide-react'
import type { ParqueMotorList, ParqueMotorMachine, TurnoEstado } from '@/lib/parque-motor/get-data'

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }

function fechaLarga(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const mes = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${dias[d.getUTCDay()]} ${d.getUTCDate()} de ${mes[d.getUTCMonth()]}. ${d.getUTCFullYear()}`
}

/** Semáforo de los tres turnos de la fecha en curso. */
function TurnosDia({ turnos }: { turnos: TurnoEstado[] }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {turnos.map(t => {
        const color = t.completo ? 'var(--emerald-glow)' : t.pendiente ? 'var(--brass)' : 'var(--graphite)'
        return (
          <span key={t.turno}
            title={`${t.label} ${t.rango} — ${t.completo ? 'completo' : t.pendiente ? 'pendiente' : 'aún no inicia'}`}
            style={{
              ...mono, fontSize: 9.5, padding: '1px 5px', borderRadius: 2, color,
              border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
              background: t.esActual ? `color-mix(in srgb, ${color} 14%, transparent)` : 'transparent',
              fontWeight: t.esActual ? 700 : 400,
            }}>
            {t.label.slice(0, 1)}
          </span>
        )
      })}
    </span>
  )
}

export function ParqueMotorListClient({
  data, canFill,
}: {
  data: ParqueMotorList
  canFill: boolean
}) {
  const { machines, turno, pendientesTurno } = data

  return (
    <div>
      <header className="area-hero" style={{ marginBottom: 18 }}>
        <div className="area-hero-seal"><Truck className="w-6 h-6" strokeWidth={1.6} /></div>
        <div className="area-hero-body">
          <div className="area-hero-ref">FAENA Y SERVICIO · CHECKLIST DE UNIDADES</div>
          <h1 className="area-hero-title">Checklist del Parque Motor</h1>
          <p className="area-hero-desc">
            Se hace un checklist completo al ingreso de cada turno de piloto. Verifica el equipo de cada
            unidad según su inventario: marca presente, faltante o dañado y deja observaciones.{' '}
            {canFill ? 'Cualquier efectivo en servicio puede completarlo.' : 'Solo lectura — el registro es para efectivos activos.'}
          </p>
        </div>
        <div className="area-hero-jefe">
          <span className="area-hero-jefe-label">Turno en curso</span>
          <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: 'var(--brass)' }}>
            {turno.label} · {turno.rango}
          </span>
          <span style={{ ...mono, fontSize: 9.5, color: 'var(--graphite)' }}>
            termina en {turno.restanteLabel}
          </span>
        </div>
      </header>

      <div style={{ ...mono, fontSize: 11, color: 'var(--steel)', marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Clock className="w-3 h-3" strokeWidth={1.8} /> {fechaLarga(turno.fecha)}
        </span>
        {machines.length > 0 && (
          <span style={{ color: pendientesTurno > 0 ? 'var(--brass)' : 'var(--emerald-glow)' }}>
            {pendientesTurno > 0
              ? `${pendientesTurno} de ${machines.length} unidades sin completar este turno`
              : 'todas las unidades revisadas este turno'}
          </span>
        )}
      </div>

      {machines.length === 0 ? (
        <div className="guardia-empty" style={{ padding: 34 }}>
          <p style={{ marginBottom: 8 }}>Aún no hay equipo de máquinas en el inventario.</p>
          <p style={{ ...mono, fontSize: 12, color: 'var(--graphite)', lineHeight: 1.6 }}>
            El checklist se arma solo a partir del inventario. Para que una unidad aparezca aquí, sus ítems deben registrarse con
            <b style={{ color: 'var(--steel)' }}> almacén = «máquina»</b>, la <b style={{ color: 'var(--steel)' }}>referencia de la unidad</b> (ej. MAQUINA 163 - 1) y su <b style={{ color: 'var(--steel)' }}>ubicación interna</b> (el gabinete).
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {machines.map((m: ParqueMotorMachine) => {
            const marcados = m.actual?.marcados ?? 0
            const completo = marcados >= m.itemCount && m.itemCount > 0
            return (
              <Link key={m.ref} href={`/parque-motor/${encodeURIComponent(m.ref)}`}
                style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', borderRadius: 4, padding: '14px 16px' }}>
                <div style={{ width: 42, height: 42, borderRadius: 3, background: 'var(--ink-black)', border: '1px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Truck className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--brass)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--bone)' }}>{m.ref}</div>
                  <div style={{ ...mono, fontSize: 11, color: 'var(--steel)', display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 2, alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Boxes className="w-3 h-3" strokeWidth={1.8} /> {m.itemCount} ítems · {m.gabineteCount} gabinete{m.gabineteCount === 1 ? '' : 's'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: completo ? 'var(--emerald-glow)' : 'var(--brass)' }}>
                      <ClipboardCheck className="w-3 h-3" strokeWidth={1.8} />
                      {marcados}/{m.itemCount} este turno
                      {m.actual?.lastBy ? ` · últ. ${m.actual.lastBy.split(' ')[0]}` : ''}
                    </span>
                    <TurnosDia turnos={m.turnosDia} />
                    {m.actual && (m.actual.faltantes > 0 || m.actual.danados > 0) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--flame)' }}>
                        <AlertTriangle className="w-3 h-3" strokeWidth={2} /> {m.actual.faltantes} falt · {m.actual.danados} dañ
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--graphite)', flexShrink: 0 }} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
