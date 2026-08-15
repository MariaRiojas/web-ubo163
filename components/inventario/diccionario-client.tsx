'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { BookMarked, ArrowLeft, Search, X } from 'lucide-react'
import { FIELD_GROUPS, ENUMS, type FieldDef } from '@/lib/inventario/data-dictionary'

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--ink-line)', color: 'var(--graphite)', ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid var(--ink-line)', color: 'var(--bone)', fontSize: 13, verticalAlign: 'top' }

export function DiccionarioClient() {
  const [q, setQ] = useState('')
  const enumsByKey = useMemo(() => Object.fromEntries(ENUMS.map(e => [e.key, e])), [])
  const t = q.trim().toLowerCase()

  const groups = useMemo(() => {
    if (!t) return FIELD_GROUPS
    return FIELD_GROUPS.map(g => ({
      ...g,
      fields: g.fields.filter(f => f.field.toLowerCase().includes(t) || f.label.toLowerCase().includes(t) || f.desc.toLowerCase().includes(t)),
    })).filter(g => g.fields.length > 0)
  }, [t])

  return (
    <div>
      <Link href="/inventario" className="btn btn--ghost btn--sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', marginBottom: 12 }}>
        <ArrowLeft className="w-3 h-3" strokeWidth={1.8} /> Inventario general
      </Link>

      <header className="area-hero" style={{ marginBottom: 16 }}>
        <div className="area-hero-seal"><BookMarked className="w-6 h-6" strokeWidth={1.6} /></div>
        <div className="area-hero-body">
          <div className="area-hero-ref">INVENTARIO · REFERENCIA</div>
          <h1 className="area-hero-title">Diccionario de datos</h1>
          <p className="area-hero-desc">Qué significa cada campo del inventario y sus valores permitidos. Úsalo como guía al registrar o importar ítems para mantener los datos consistentes.</p>
        </div>
      </header>

      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 18 }}>
        <Search className="w-4 h-4" strokeWidth={1.8} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--graphite)' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar campo…"
          style={{ width: '100%', padding: '9px 30px 9px 32px', fontSize: 13, background: 'var(--ink-black)', border: '1px solid var(--ink-line)', color: 'var(--bone)', borderRadius: 2, ...mono }} />
        {q && <button onClick={() => setQ('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--graphite)', cursor: 'pointer' }}><X className="w-3.5 h-3.5" /></button>}
      </div>

      {/* Grupos de campos */}
      {groups.map(g => (
        <section key={g.title} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <h2 style={{ ...mono, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brass)', margin: 0 }}>{g.title}</h2>
            <span style={{ height: 1, flex: 1, background: 'var(--ink-line)' }} />
          </div>
          {g.note && <p style={{ fontSize: 12, color: 'var(--steel)', lineHeight: 1.6, marginBottom: 10, borderLeft: '2px solid var(--brass)', paddingLeft: 10 }}>{g.note}</p>}
          <div style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', borderRadius: 3, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead><tr><th style={th}>Campo</th><th style={th}>Descripción</th><th style={th}>Tipo</th><th style={th}>Valores / ejemplo</th></tr></thead>
              <tbody>
                {g.fields.map(f => <FieldRow key={f.field} f={f} enumsByKey={enumsByKey} />)}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {groups.length === 0 && <div className="guardia-empty">Ningún campo coincide con “{q}”.</div>}

      {/* Catálogos de valores */}
      {!t && (
        <section style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h2 style={{ ...mono, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brass)', margin: 0 }}>Catálogos de valores permitidos</h2>
            <span style={{ height: 1, flex: 1, background: 'var(--ink-line)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {ENUMS.map(e => (
              <div key={e.key} style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', borderRadius: 3, padding: '12px 14px' }}>
                <div style={{ ...mono, fontSize: 11, color: 'var(--bone)', marginBottom: 8 }}>{e.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {e.values.map(v => (
                    <div key={v.value} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                      <span style={{ color: 'var(--steel)' }}>{v.label}</span>
                      <code style={{ ...mono, fontSize: 10, color: 'var(--graphite)' }}>{v.value}</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function FieldRow({ f, enumsByKey }: { f: FieldDef; enumsByKey: Record<string, { title: string; values: { value: string; label: string }[] }> }) {
  const en = f.enumKey ? enumsByKey[f.enumKey] : undefined
  return (
    <tr>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <div style={{ color: 'var(--bone)', fontWeight: 600 }}>{f.label}{f.required && <span style={{ color: 'var(--red-163)' }}> *</span>}</div>
        <code style={{ ...mono, fontSize: 10, color: 'var(--graphite)' }}>{f.field}</code>
      </td>
      <td style={{ ...td, color: 'var(--steel)', fontSize: 12.5, lineHeight: 1.5 }}>{f.desc}</td>
      <td style={{ ...td, ...mono, fontSize: 11, color: 'var(--steel)', whiteSpace: 'nowrap' }}>{f.type}{f.required ? '' : ''}</td>
      <td style={{ ...td, fontSize: 12 }}>
        {en
          ? <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{en.values.map(v => <span key={v.value} title={v.value} style={{ ...mono, fontSize: 10, color: 'var(--steel)', border: '1px solid var(--ink-line)', borderRadius: 2, padding: '1px 6px' }}>{v.label}</span>)}</span>
          : f.example ? <span style={{ ...mono, fontSize: 11, color: 'var(--graphite)' }}>ej. {f.example}</span> : <span style={{ color: 'var(--graphite)' }}>—</span>}
      </td>
    </tr>
  )
}
