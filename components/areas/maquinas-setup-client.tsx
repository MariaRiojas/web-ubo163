'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Truck, Plus, Boxes, QrCode, ClipboardCheck, Trash2, Pencil, PackagePlus, X, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  crearMaquina, crearGabinete, renombrarGabinete, eliminarGabinete,
  asignarItemsAGabinete, quitarItemDeGabinete,
} from '@/lib/areas/maquinas-actions'
import type { MaquinasSetupData, SetupItem } from '@/lib/areas/get-maquinas-setup-data'

const KINDS = [
  { value: 'autobomba', label: 'Autobomba' }, { value: 'ambulancia', label: 'Ambulancia' },
  { value: 'rescate', label: 'Rescate' }, { value: 'auxiliar', label: 'Auxiliar' },
  { value: 'cisterna', label: 'Cisterna' }, { value: 'otra', label: 'Otra' },
]
const COMP_TYPES = [
  { value: 'cajon', label: 'Cajón' }, { value: 'cabina', label: 'Cabina' },
  { value: 'vitrina', label: 'Vitrina' }, { value: 'cama_mangueras', label: 'Cama de mangueras' },
  { value: 'exterior', label: 'Exterior' }, { value: 'otro', label: 'Otro' },
]
const kindLabel = (k: string) => KINDS.find(x => x.value === k)?.label ?? k
const typeLabel = (t: string) => COMP_TYPES.find(x => x.value === t)?.label ?? t

const s = {
  input: { width: '100%', background: 'var(--ink-black)', border: '1px solid var(--ink-line)', color: 'var(--bone)', padding: '9px 11px', fontFamily: 'var(--font-mono)', fontSize: 13, borderRadius: 2 } as React.CSSProperties,
  label: { display: 'block', color: 'var(--steel)', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 } as React.CSSProperties,
  mini: { fontFamily: 'var(--font-mono)', fontSize: 11, padding: '4px 9px', borderRadius: 2, border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', color: 'var(--steel)', cursor: 'pointer' } as React.CSSProperties,
}

type Modal =
  | { kind: 'maquina' }
  | { kind: 'gabinete'; machineId: string }
  | { kind: 'asignar'; compartmentId: string; compartmentName: string }
  | null

export function MaquinasSetupClient({ data, canManage }: { data: MaquinasSetupData; canManage: boolean }) {
  const router = useRouter()
  const [selMachine, setSelMachine] = useState<string | null>(data.machines[0]?.machine.machineId ?? null)
  const [modal, setModal] = useState<Modal>(null)
  const machine = data.machines.find(m => m.machine.machineId === selMachine) ?? null

  const done = () => { setModal(null); router.refresh() }

  return (
    <div>
      <header className="area-hero" style={{ marginBottom: 18 }}>
        <div className="area-hero-seal"><Truck className="w-6 h-6" strokeWidth={1.6} /></div>
        <div className="area-hero-body">
          <div className="area-hero-ref">ÁREA DE MÁQUINAS · UNIDADES Y GABINETES</div>
          <h1 className="area-hero-title">Máquina y Gabinetes</h1>
          <p className="area-hero-desc">Registra las unidades, define sus gabinetes con QR y asigna el inventario de cada uno. El personal en servicio usa el checklist para verificar equipo por equipo.</p>
        </div>
        {canManage && (
          <div style={{ alignSelf: 'flex-start' }}>
            <button className="btn btn--primary btn--sm" onClick={() => setModal({ kind: 'maquina' })}><Plus className="w-3.5 h-3.5" strokeWidth={2} /> Nueva máquina</button>
          </div>
        )}
      </header>

      {data.machines.length === 0 ? (
        <div className="guardia-empty" style={{ padding: 40, textAlign: 'center' }}>
          Aún no hay máquinas registradas. {canManage ? 'Crea la primera con “Nueva máquina”.' : 'Contacta al Jefe de Máquinas.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 240px) 1fr', gap: 18, alignItems: 'start' }}>
          {/* Lista de máquinas */}
          <aside style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--ink-line)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brass)' }}>Unidades</div>
            {data.machines.map(m => {
              const active = m.machine.machineId === selMachine
              return (
                <button key={m.machine.machineId} onClick={() => setSelMachine(m.machine.machineId)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left', background: active ? 'var(--ink-surface)' : 'transparent', border: 'none', borderLeft: active ? '2px solid var(--red-163)' : '2px solid transparent', borderBottom: '1px solid var(--ink-line)', cursor: 'pointer', color: active ? 'var(--bone)' : 'var(--steel)', padding: '10px 11px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  <span>{m.machine.label}<span style={{ display: 'block', color: 'var(--graphite)', fontSize: 10 }}>{kindLabel(m.machine.kind)} · {m.compartments.length} gabinete{m.compartments.length === 1 ? '' : 's'}</span></span>
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
              )
            })}
          </aside>

          {/* Detalle de la máquina */}
          <section>
            {machine && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--bone)' }}>{machine.machine.label}</h2>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>
                      {kindLabel(machine.machine.kind)}{machine.machine.plate ? ` · ${machine.machine.plate}` : ''} · {machine.itemCount} ítem{machine.itemCount === 1 ? '' : 's'} en {machine.compartments.length} gabinete{machine.compartments.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  {canManage && <button className="btn btn--sm" style={{ borderColor: 'var(--brass)', color: 'var(--brass)' }} onClick={() => setModal({ kind: 'gabinete', machineId: machine.machine.machineId })}><Plus className="w-3.5 h-3.5" strokeWidth={2} /> Nuevo gabinete</button>}
                </div>

                {machine.compartments.length === 0 ? (
                  <div className="guardia-empty" style={{ padding: 28, textAlign: 'center' }}>
                    Esta máquina aún no tiene gabinetes. {canManage && 'Crea el primero con “Nuevo gabinete”.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {machine.compartments.map(c => (
                      <GabineteCard key={c.compartmentId} comp={c} canManage={canManage}
                        onAssign={() => setModal({ kind: 'asignar', compartmentId: c.compartmentId, compartmentName: c.name })}
                        onRefresh={() => router.refresh()} onRename={async (name) => {
                          const r = await renombrarGabinete(machine.machine.machineId, c.compartmentId, name)
                          if (!r.ok) toast.error(r.error); else { toast.success('Gabinete renombrado'); router.refresh() }
                        }} onDelete={async () => {
                          if (!window.confirm(`¿Quitar el gabinete «${c.name}»? Sus ítems quedarán sin gabinete.`)) return
                          const r = await eliminarGabinete(machine.machine.machineId, c.compartmentId)
                          if (!r.ok) toast.error(r.error); else { toast.success('Gabinete eliminado'); router.refresh() }
                        }} />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {modal?.kind === 'maquina' && <MaquinaModal onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'gabinete' && <GabineteModal machineId={modal.machineId} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'asignar' && <AsignarModal compartmentId={modal.compartmentId} compartmentName={modal.compartmentName} items={data.unassignedItems} onClose={() => setModal(null)} onDone={done} />}
    </div>
  )
}

function GabineteCard({ comp, canManage, onAssign, onRename, onDelete, onRefresh }: {
  comp: MaquinasSetupData['machines'][number]['compartments'][number]
  canManage: boolean; onAssign: () => void; onRename: (name: string) => void; onDelete: () => void; onRefresh: () => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(comp.name)
  const quitar = async (itemId: string) => {
    const r = await quitarItemDeGabinete(itemId)
    if (!r.ok) toast.error(r.error); else { toast.success('Ítem quitado'); onRefresh() }
  }
  return (
    <div style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', borderRadius: 3, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Boxes className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--brass)', flexShrink: 0 }} />
          {renaming ? (
            <span style={{ display: 'inline-flex', gap: 6 }}>
              <input value={name} onChange={e => setName(e.target.value)} style={{ ...s.input, width: 200, padding: '4px 8px' }} />
              <button style={s.mini} onClick={() => { onRename(name); setRenaming(false) }}>OK</button>
            </span>
          ) : (
            <span style={{ fontSize: 14, color: 'var(--bone)', fontWeight: 600 }}>{comp.name}</span>
          )}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', border: '1px solid var(--ink-line)', borderRadius: 2, padding: '1px 6px' }}>{typeLabel(comp.type)}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)' }}><QrCode className="w-3 h-3" strokeWidth={1.8} /> {comp.qrCode}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <Link href={`/faena/qr/${comp.qrCode}`} className="btn btn--sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none', borderColor: 'var(--emerald-glow)', color: 'var(--emerald-glow)' }}><ClipboardCheck className="w-3.5 h-3.5" strokeWidth={1.8} /> Iniciar checklist</Link>
          {canManage && <button style={s.mini} title="Renombrar" onClick={() => setRenaming(v => !v)}><Pencil className="w-3.5 h-3.5" strokeWidth={1.8} /></button>}
          {canManage && <button style={{ ...s.mini, color: 'var(--red-163)' }} title="Eliminar gabinete" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} /></button>}
        </div>
      </div>

      {comp.items.length === 0
        ? <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)', margin: '4px 0' }}>Sin ítems asignados.</p>
        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            {comp.items.map(it => (
              <span key={it.itemId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--bone)', background: 'var(--ink-black)', border: '1px solid var(--ink-line)', borderRadius: 2, padding: '3px 8px' }}>
                {it.name}
                {canManage && <button onClick={() => quitar(it.itemId)} title="Quitar" style={{ background: 'transparent', border: 'none', color: 'var(--graphite)', cursor: 'pointer', padding: 0, display: 'inline-flex' }}><X className="w-3 h-3" /></button>}
              </span>
            ))}
          </div>}

      {canManage && <button style={{ ...s.mini, marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={onAssign}><PackagePlus className="w-3.5 h-3.5" strokeWidth={1.8} /> Asignar ítems</button>}
    </div>
  )
}

function Overlay({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', padding: 26, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--bone)', marginBottom: 4, fontSize: '1.15rem' }}>{title}</h2>
        {subtitle && <p style={{ color: 'var(--steel)', fontSize: 12, marginBottom: 18, fontFamily: 'var(--font-mono)' }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

function MaquinaModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ label: '', kind: 'autobomba', plate: '', brand: '', model: '', year: '', codigoCgbvp: '' })
  const [saving, setSaving] = useState(false); const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null)
    if (f.label.trim().length < 2) { setErr('Indica el nombre de la máquina.'); return }
    setSaving(true)
    const r = await crearMaquina({ label: f.label, kind: f.kind as any, plate: f.plate, brand: f.brand, model: f.model, year: f.year, codigoCgbvp: f.codigoCgbvp })
    if (!r.ok) { setErr(r.error); setSaving(false); return }
    toast.success('Máquina registrada'); onDone()
  }
  return (
    <Overlay title="Nueva máquina" subtitle="Registra una unidad de la compañía">
      <form onSubmit={submit}>
        <div style={{ marginBottom: 10 }}><label style={s.label}>Nombre / denominación *</label><input value={f.label} onChange={set('label')} style={s.input} placeholder="Ej. Autobomba B-1" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={s.label}>Tipo</label><select value={f.kind} onChange={set('kind')} style={s.input as React.CSSProperties}>{KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}</select></div>
          <div><label style={s.label}>Placa</label><input value={f.plate} onChange={set('plate')} style={s.input} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={s.label}>Marca</label><input value={f.brand} onChange={set('brand')} style={s.input} /></div>
          <div><label style={s.label}>Modelo</label><input value={f.model} onChange={set('model')} style={s.input} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div><label style={s.label}>Año</label><input value={f.year} onChange={set('year')} inputMode="numeric" maxLength={4} style={s.input} /></div>
          <div><label style={s.label}>Código CGBVP</label><input value={f.codigoCgbvp} onChange={set('codigoCgbvp')} style={s.input} /></div>
        </div>
        {err && <p style={{ color: 'var(--red-163)', fontSize: 12, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10 }}><button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Guardando…' : 'Registrar'}</button><button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancelar</button></div>
      </form>
    </Overlay>
  )
}

function GabineteModal({ machineId, onClose, onDone }: { machineId: string; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(''); const [type, setType] = useState('cajon')
  const [saving, setSaving] = useState(false); const [err, setErr] = useState<string | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null)
    if (name.trim().length < 1) { setErr('Indica el nombre del gabinete.'); return }
    setSaving(true)
    const r = await crearGabinete({ machineId, name, type: type as any })
    if (!r.ok) { setErr(r.error); setSaving(false); return }
    toast.success('Gabinete creado'); onDone()
  }
  return (
    <Overlay title="Nuevo gabinete" subtitle="Se genera un QR automáticamente para el checklist">
      <form onSubmit={submit}>
        <div style={{ marginBottom: 10 }}><label style={s.label}>Nombre del gabinete *</label><input value={name} onChange={e => setName(e.target.value)} style={s.input} placeholder="Ej. Cajón lateral izquierdo 1" /></div>
        <div style={{ marginBottom: 14 }}><label style={s.label}>Tipo</label><select value={type} onChange={e => setType(e.target.value)} style={s.input as React.CSSProperties}>{COMP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
        {err && <p style={{ color: 'var(--red-163)', fontSize: 12, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10 }}><button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Creando…' : 'Crear gabinete'}</button><button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancelar</button></div>
      </form>
    </Overlay>
  )
}

function AsignarModal({ compartmentId, compartmentName, items, onClose, onDone }: {
  compartmentId: string; compartmentName: string; items: SetupItem[]; onClose: () => void; onDone: () => void
}) {
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false); const [err, setErr] = useState<string | null>(null)
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return items.filter(i => !t || i.name.toLowerCase().includes(t) || i.category.toLowerCase().includes(t))
  }, [items, q])
  const toggle = (id: string) => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const submit = async () => {
    if (sel.size === 0) { setErr('Selecciona al menos un ítem.'); return }
    setSaving(true); setErr(null)
    const r = await asignarItemsAGabinete({ compartmentId, itemIds: [...sel] })
    if (!r.ok) { setErr(r.error); setSaving(false); return }
    toast.success(`${sel.size} ítem(s) asignado(s)`); onDone()
  }
  return (
    <Overlay title={`Asignar ítems · ${compartmentName}`} subtitle="Inventario de la sección de máquinas sin gabinete">
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar ítem…" style={{ ...s.input, marginBottom: 10 }} />
      {items.length === 0 ? (
        <p style={{ color: 'var(--graphite)', fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 12 }}>No hay inventario sin asignar en la sección de máquinas. Registra o importa inventario primero desde el módulo de Inventario.</p>
      ) : (
        <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--ink-line)', borderRadius: 2, marginBottom: 12 }}>
          {filtered.map(i => (
            <label key={i.itemId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderBottom: '1px solid var(--ink-line)', cursor: 'pointer' }}>
              <input type="checkbox" checked={sel.has(i.itemId)} onChange={() => toggle(i.itemId)} style={{ accentColor: 'var(--brass)' }} />
              <span style={{ flex: 1, color: 'var(--bone)', fontSize: 13 }}>{i.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>{i.category}</span>
            </label>
          ))}
          {filtered.length === 0 && <p style={{ color: 'var(--graphite)', fontSize: 12, padding: 10 }}>Sin coincidencias.</p>}
        </div>
      )}
      {err && <p style={{ color: 'var(--red-163)', fontSize: 12, marginBottom: 12 }}>{err}</p>}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button type="button" className="btn btn--primary btn--sm" disabled={saving || sel.size === 0} onClick={submit}>{saving ? 'Asignando…' : `Asignar ${sel.size || ''}`}</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cerrar</button>
      </div>
    </Overlay>
  )
}
