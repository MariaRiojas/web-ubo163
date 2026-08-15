'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Truck, ArrowLeft, Check, X, AlertTriangle, MinusCircle, Boxes } from 'lucide-react'
import { toast } from 'sonner'
import { marcarItemInspeccion, limpiarItemInspeccion } from '@/lib/parque-motor/actions'
import type { MaquinaInspeccion, InspItem } from '@/lib/parque-motor/get-data'
import type { InspectionItemStatus } from '@/lib/db/schema/machine-inspection'

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }

const STATUS_META: Record<InspectionItemStatus, { label: string; color: string; icon: any }> = {
  presente: { label: 'Presente', color: 'var(--emerald-glow)', icon: Check },
  faltante: { label: 'Faltante', color: 'var(--red-163)', icon: X },
  danado: { label: 'Dañado', color: 'var(--flame)', icon: AlertTriangle },
  no_aplica: { label: 'N/A', color: 'var(--graphite)', icon: MinusCircle },
}

export function ChecklistMaquinaClient({ data, canFill }: { data: MaquinaInspeccion; canFill: boolean }) {
  const router = useRouter()
  const pct = data.totalItems > 0 ? Math.round((data.marcados / data.totalItems) * 100) : 0

  return (
    <div>
      <Link href="/parque-motor" className="btn btn--ghost btn--sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', marginBottom: 12 }}>
        <ArrowLeft className="w-3 h-3" strokeWidth={1.8} /> Parque motor
      </Link>

      <header className="area-hero" style={{ marginBottom: 16 }}>
        <div className="area-hero-seal"><Truck className="w-6 h-6" strokeWidth={1.6} /></div>
        <div className="area-hero-body">
          <div className="area-hero-ref">CHECKLIST DE UNIDAD</div>
          <h1 className="area-hero-title">{data.ref}</h1>
          <p className="area-hero-desc">{data.totalItems} ítems en {data.gabinetes.length} gabinete{data.gabinetes.length === 1 ? '' : 's'} · {data.marcados}/{data.totalItems} verificados hoy ({pct}%)</p>
        </div>
      </header>

      {!canFill && (
        <div className="guardia-empty" style={{ marginBottom: 14 }}>Solo lectura. El registro del checklist es para efectivos activos (seccionario o superior).</div>
      )}

      {data.totalItems === 0 ? (
        <div className="guardia-empty" style={{ padding: 30, ...mono, fontSize: 12, color: 'var(--graphite)' }}>
          Esta unidad no tiene ítems de inventario con ubicación interna registrada.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.gabinetes.map(g => (
            <section key={g.nombre} style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', borderRadius: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--ink-line)' }}>
                <Boxes className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--brass)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--bone)' }}>{g.nombre}</span>
                <span style={{ ...mono, fontSize: 10, color: 'var(--graphite)', marginLeft: 'auto' }}>{g.items.filter(i => i.result).length}/{g.items.length}</span>
              </div>
              {g.items.map(item => (
                <ItemRow key={item.itemId} item={item} maquinaRef={data.ref} canFill={canFill} onRefresh={() => router.refresh()} />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, maquinaRef, canFill, onRefresh }: { item: InspItem; maquinaRef: string; canFill: boolean; onRefresh: () => void }) {
  const [pending, startTransition] = useTransition()
  const [obsFor, setObsFor] = useState<InspectionItemStatus | null>(null)
  const [obs, setObs] = useState(item.result?.observacion ?? '')

  const mark = (status: InspectionItemStatus, observacion?: string) => {
    startTransition(async () => {
      const res = await marcarItemInspeccion({ maquinaRef, itemId: item.itemId, status, observacion })
      if (!res.ok) { toast.error(res.error); return }
      setObsFor(null)
      onRefresh()
    })
  }
  const onPick = (status: InspectionItemStatus) => {
    if (status === 'faltante' || status === 'danado') { setObsFor(status); setObs(item.result?.observacion ?? '') }
    else mark(status)
  }
  const limpiar = () => startTransition(async () => { await limpiarItemInspeccion({ maquinaRef, itemId: item.itemId }); onRefresh() })

  const cur = item.result?.status ?? null

  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--ink-line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ color: 'var(--bone)', fontSize: 13 }}>{item.name}</div>
          <div style={{ ...mono, fontSize: 10, color: 'var(--graphite)' }}>
            {item.category}{item.quantity > 1 ? ` · x${item.quantity}` : ''}
            {item.result && <span style={{ color: 'var(--steel)' }}> · marcó {item.result.byName?.split(' ')[0]}</span>}
          </div>
          {item.result?.observacion && <div style={{ ...mono, fontSize: 11, color: 'var(--flame)', marginTop: 2 }}>“{item.result.observacion}”</div>}
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {(Object.keys(STATUS_META) as InspectionItemStatus[]).map(st => {
            const m = STATUS_META[st]
            const active = cur === st
            return (
              <button key={st} disabled={!canFill || pending} onClick={() => onPick(st)}
                title={m.label}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...mono, fontSize: 11, padding: '5px 8px', borderRadius: 2, cursor: canFill ? 'pointer' : 'not-allowed',
                  border: `1px solid ${active ? m.color : 'var(--ink-line)'}`,
                  background: active ? `color-mix(in srgb, ${m.color} 16%, transparent)` : 'var(--ink-black)',
                  color: active ? m.color : 'var(--steel)', opacity: !canFill ? 0.6 : 1 }}>
                <m.icon className="w-3.5 h-3.5" strokeWidth={2} />
                <span style={{ display: active ? 'inline' : 'none' }}>{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {obsFor && canFill && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-start' }}>
          <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} autoFocus
            placeholder={obsFor === 'faltante' ? 'Motivo del faltante…' : 'Describe el daño…'}
            style={{ flex: 1, background: 'var(--ink-black)', border: '1px solid var(--flame)', color: 'var(--bone)', padding: '7px 10px', ...mono, fontSize: 12, borderRadius: 2, resize: 'vertical' }} />
          <button disabled={pending} className="btn btn--primary btn--sm" onClick={() => { if (!obs.trim()) { toast.error('Agrega la observación'); return } mark(obsFor, obs.trim()) }}>Guardar</button>
          <button disabled={pending} className="btn btn--ghost btn--sm" onClick={() => setObsFor(null)}>Cancelar</button>
        </div>
      )}
      {canFill && item.result && !obsFor && (
        <button onClick={limpiar} disabled={pending} style={{ background: 'transparent', border: 'none', color: 'var(--graphite)', ...mono, fontSize: 10, cursor: 'pointer', marginTop: 4, padding: 0 }}>limpiar marca</button>
      )}
    </div>
  )
}
