'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  EVAL_CATEGORIA_LABELS,
  METRICAS_FISICAS,
  MODULOS,
  type EvalCategoria,
  type Modulo,
  type AspiranteEvaluacion,
} from '@/lib/db/schema/aspirante-evaluaciones'
import type { AspiranteRegistro } from '@/lib/registro/get-registro-data'
import { upsertEvaluacion, deleteEvaluacion } from '@/lib/registro/actions'

type MenuKey = 'general' | EvalCategoria

const CATEGORY_ORDER: EvalCategoria[] = ['academica', 'fisico', 'actitud', 'asistencia']

// ── estilos institucionales compartidos ────────────────────────────────────
const labelStyle: React.CSSProperties = { display: 'block', color: 'var(--steel)', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }
const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--ink-surface)', border: '1px solid var(--ink-line)', color: 'var(--bone)', padding: 8, fontFamily: 'var(--font-mono)', fontSize: 13, borderRadius: 0 }
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '9px 10px', borderBottom: '1px solid var(--ink-line)', color: 'var(--steel)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid var(--ink-line)', color: 'var(--bone)', fontSize: 13 }

function fmt(n: number | null | undefined): string {
  return typeof n === 'number' ? n.toFixed(2) : '—'
}
function notaColor(n: number | null | undefined): string {
  if (typeof n !== 'number') return 'var(--graphite)'
  if (n < 11) return 'var(--red-163)'
  if (n < 14) return 'var(--brass)'
  return '#22c55e'
}
function fecha(s: string | null | undefined): string {
  return s ? s.split('T')[0] : '—'
}

/** nota más reciente de una categoría (opcionalmente por módulo). */
function latestEval(evals: AspiranteEvaluacion[], cat: EvalCategoria, modulo?: Modulo): AspiranteEvaluacion | undefined {
  const filtered = evals.filter((e) => e.categoria === cat && (modulo ? e.modulo === modulo : true))
  return filtered.length ? filtered[filtered.length - 1] : undefined
}

export function RegistroClient({ aspirantes, canManage }: { aspirantes: AspiranteRegistro[]; canManage: boolean }) {
  const router = useRouter()
  const [menu, setMenu] = useState<MenuKey>('general')
  const [modulo, setModulo] = useState<Modulo>('I')
  const [academicaOpen, setAcademicaOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [promocionFilter, setPromocionFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modal, setModal] = useState<{ aspirante: AspiranteRegistro; categoria: EvalCategoria; existing?: AspiranteEvaluacion; modulo?: Modulo } | null>(null)

  const promociones = useMemo(
    () => [...new Set(aspirantes.map((a) => a.promocion).filter((p): p is string => !!p))].sort(),
    [aspirantes],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return aspirantes.filter((a) => {
      if (q && !a.fullName.toLowerCase().includes(q)) return false
      if (promocionFilter && a.promocion !== promocionFilter) return false
      return true
    })
  }, [aspirantes, search, promocionFilter])

  // Orden según la categoría seleccionada.
  const rows = useMemo(() => {
    const arr = [...filtered]
    if (menu === 'general') {
      // ya viene ordenado por antigüedad desde el servidor; conservar.
      return arr
    }
    if (menu === 'academica') {
      return arr.sort((a, b) => (moduleNota(b, modulo) ?? -1) - (moduleNota(a, modulo) ?? -1))
    }
    return arr.sort((a, b) => ((b[menu] ?? -1) as number) - ((a[menu] ?? -1) as number))
  }, [filtered, menu, modulo])

  const selected = selectedId ? aspirantes.find((a) => a.aspiranteId === selectedId) ?? null : null

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--bone)' }}>Aspirantes y Postulantes</h2>
          <p style={{ color: 'var(--steel)', fontSize: 12, marginTop: 2 }}>
            Registro de evaluación por categoría — {aspirantes.length} en formación
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 220px) 1fr', gap: 20, alignItems: 'start' }}>
        {/* ── Menú de categorías ─────────────────────────────────────── */}
        <aside style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--ink-line)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brass)' }}>
            Categoría
          </div>

          <MenuItem active={menu === 'general'} label="General" onClick={() => setMenu('general')} arrow />

          {/* Académica (expandible) */}
          <MenuItem
            active={menu === 'academica'}
            label="Académica"
            hasChildren
            expanded={academicaOpen}
            onClick={() => { setMenu('academica'); setAcademicaOpen((v) => !v) }}
          />
          {academicaOpen && (
            <div style={{ borderBottom: '1px solid var(--ink-line)' }}>
              {MODULOS.map((m) => (
                <button
                  key={m}
                  onClick={() => { setMenu('academica'); setModulo(m) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', background: menu === 'academica' && modulo === m ? 'var(--ink-surface)' : 'transparent',
                    border: 'none', borderLeft: menu === 'academica' && modulo === m ? '2px solid var(--brass)' : '2px solid transparent',
                    color: menu === 'academica' && modulo === m ? 'var(--bone)' : 'var(--steel)', padding: '8px 12px 8px 28px', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                  }}
                >
                  Módulo {m}
                </button>
              ))}
            </div>
          )}

          <MenuItem active={menu === 'fisico'} label="Físico" onClick={() => setMenu('fisico')} />
          <MenuItem active={menu === 'actitud'} label="Actitud B." onClick={() => setMenu('actitud')} />
          <MenuItem active={menu === 'asistencia'} label="Asistencia" onClick={() => setMenu('asistencia')} />
        </aside>

        {/* ── Área de datos ──────────────────────────────────────────── */}
        <section>
          {/* Buscador + Filtro */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre…"
              style={{ ...inputStyle, maxWidth: 320 }}
            />
            <button className="btn btn--ghost btn--sm" onClick={() => setShowFilter((v) => !v)}>
              Filtro
            </button>
          </div>
          {showFilter && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <label style={{ ...labelStyle, margin: 0 }}>Promoción</label>
              <select value={promocionFilter} onChange={(e) => setPromocionFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 260 }}>
                <option value="">Todas</option>
                {promociones.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr minmax(300px, 360px)' : '1fr', gap: 16, alignItems: 'start' }}>
            <div style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', overflowX: 'auto' }}>
              <RegistroTable
                menu={menu}
                modulo={modulo}
                rows={rows}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
              />
            </div>

            {selected && (
              <DetailPanel
                aspirante={selected}
                menu={menu}
                modulo={modulo}
                canManage={canManage}
                onClose={() => setSelectedId(null)}
                onAdd={(categoria, existing, moduloHint) => setModal({ aspirante: selected, categoria, existing, modulo: moduloHint ?? existing?.modulo })}
                onDelete={async (evalId) => {
                  if (!confirm('¿Eliminar esta nota?')) return
                  const res = await deleteEvaluacion(evalId)
                  if (!res.ok) alert(res.error)
                  else router.refresh()
                }}
              />
            )}
          </div>
        </section>
      </div>

      {modal && (
        <EvalModal
          aspiranteId={modal.aspirante.aspiranteId}
          fullName={modal.aspirante.fullName}
          categoria={modal.categoria}
          existing={modal.existing}
          defaultModulo={modal.modulo ?? modulo}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); router.refresh() }}
        />
      )}
    </div>
  )
}

// ── menú ────────────────────────────────────────────────────────────────────
function MenuItem({ active, label, onClick, hasChildren, expanded, arrow }: {
  active: boolean; label: string; onClick: () => void; hasChildren?: boolean; expanded?: boolean; arrow?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
        background: active ? 'var(--ink-surface)' : 'transparent', border: 'none',
        borderLeft: active ? '2px solid var(--red-163)' : '2px solid transparent',
        borderBottom: '1px solid var(--ink-line)',
        color: active ? 'var(--bone)' : 'var(--steel)', padding: '11px 12px', cursor: 'pointer',
        fontFamily: 'var(--font-mono)', fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.03em',
      }}
    >
      <span>{label}</span>
      {hasChildren && <span style={{ fontSize: 10, color: 'var(--graphite)' }}>{expanded ? '▾' : '▸'}</span>}
      {arrow && active && <span style={{ fontSize: 12, color: 'var(--brass)' }}>→</span>}
    </button>
  )
}

// ── tabla ────────────────────────────────────────────────────────────────────
/** Nota del módulo = promedio de las notas de sus lecciones. */
function moduleNota(a: AspiranteRegistro, modulo: Modulo): number | null {
  return a.academicaModulos.find((m) => m.modulo === modulo)?.promedio ?? null
}

function RegistroTable({ menu, modulo, rows, selectedId, onSelect }: {
  menu: MenuKey; modulo: Modulo; rows: AspiranteRegistro[]; selectedId: string | null; onSelect: (id: string) => void
}) {
  if (rows.length === 0) {
    return <p style={{ color: 'var(--steel)', padding: 16, fontSize: 13 }}>No hay aspirantes ni postulantes que coincidan.</p>
  }

  const rowStyle = (id: string): React.CSSProperties => ({
    cursor: 'pointer',
    background: selectedId === id ? 'var(--ink-surface)' : 'transparent',
  })

  if (menu === 'general') {
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
        <thead>
          <tr>
            <th style={thStyle}>Nombres</th>
            <th style={thStyle}>Grado</th>
            <th style={thStyle}>Promedio</th>
            <th style={thStyle}>Promoción</th>
            <th style={thStyle}>Fecha I.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.aspiranteId} onClick={() => onSelect(a.aspiranteId)} style={rowStyle(a.aspiranteId)}>
              <td style={tdStyle}>{a.fullName}</td>
              <td style={tdStyle}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)' }}>{a.gradeLabel}</span></td>
              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 600, color: notaColor(a.general) }}>{fmt(a.general)}</td>
              <td style={tdStyle}>{a.promocion || <span style={{ color: 'var(--graphite)' }}>—</span>}</td>
              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--steel)' }}>{fecha(a.fechaIngreso)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (menu === 'academica') {
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
        <thead>
          <tr>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Nombres</th>
            <th style={thStyle}>Grado</th>
            <th style={thStyle}>Nota Mód. {modulo}</th>
            <th style={thStyle}>Prom. Académica</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={a.aspiranteId} onClick={() => onSelect(a.aspiranteId)} style={rowStyle(a.aspiranteId)}>
              <td style={{ ...tdStyle, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
              <td style={tdStyle}>{a.fullName}</td>
              <td style={tdStyle}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)' }}>{a.gradeLabel}</span></td>
              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 600, color: notaColor(moduleNota(a, modulo)) }}>{fmt(moduleNota(a, modulo))}</td>
              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--steel)' }}>{fmt(a.academica)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // fisico / actitud / asistencia
  const catLabel = EVAL_CATEGORIA_LABELS[menu as EvalCategoria]
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
      <thead>
        <tr>
          <th style={thStyle}>#</th>
          <th style={thStyle}>Nombres</th>
          <th style={thStyle}>Grado</th>
          <th style={thStyle}>Nota {catLabel}</th>
          <th style={thStyle}>{menu === 'fisico' ? 'Métricas' : menu === 'actitud' ? 'Comentario' : '% / Detalle'}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a, i) => {
          const nota = a[menu as 'fisico' | 'actitud' | 'asistencia']
          const last = latestEval(a.evaluaciones, menu as EvalCategoria)
          return (
            <tr key={a.aspiranteId} onClick={() => onSelect(a.aspiranteId)} style={rowStyle(a.aspiranteId)}>
              <td style={{ ...tdStyle, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
              <td style={tdStyle}>{a.fullName}</td>
              <td style={tdStyle}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)' }}>{a.gradeLabel}</span></td>
              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 600, color: notaColor(nota) }}>{fmt(nota)}</td>
              <td style={{ ...tdStyle, color: 'var(--steel)', fontSize: 12 }}>
                {menu === 'fisico' && last?.metricas
                  ? Object.entries(last.metricas).map(([k, v]) => `${k}: ${v}`).join(' · ')
                  : menu === 'actitud'
                    ? (last?.comentario ? truncate(last.comentario, 60) : '—')
                    : '—'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

// ── panel de detalle ─────────────────────────────────────────────────────────
function DetailPanel({ aspirante, menu, modulo, canManage, onClose, onAdd, onDelete }: {
  aspirante: AspiranteRegistro
  menu: MenuKey
  modulo: Modulo
  canManage: boolean
  onClose: () => void
  onAdd: (categoria: EvalCategoria, existing?: AspiranteEvaluacion, moduloHint?: Modulo) => void
  onDelete: (evalId: string) => void
}) {
  const cardHead: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brass)', marginBottom: 6 }

  return (
    <aside style={{ border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', padding: 16, position: 'sticky', top: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--bone)', fontSize: '1.05rem', lineHeight: 1.2 }}>{aspirante.fullName}</h3>
          <p style={{ color: 'var(--steel)', fontSize: 11, fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {aspirante.gradeLabel}{aspirante.promocion ? ` · ${aspirante.promocion}` : ''}
          </p>
        </div>
        <button onClick={onClose} className="btn btn--ghost btn--sm" aria-label="Cerrar">✕</button>
      </div>

      {/* Resumen de las 4 categorías */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 14 }}>
        <MiniStat label="Académica" value={aspirante.academica} />
        <MiniStat label="Físico" value={aspirante.fisico} />
        <MiniStat label="Actitud" value={aspirante.actitud} />
        <MiniStat label="Asistencia" value={aspirante.asistencia} />
        <div style={{ gridColumn: '1 / -1' }}>
          <MiniStat label="General" value={aspirante.general} big />
        </div>
      </div>

      {/* Desglose según la categoría activa */}
      {(menu === 'general' || menu === 'academica') && (
        <div style={{ marginBottom: 14 }}>
          <div style={cardHead}>Académica — ESBAS · módulos y lecciones</div>
          {aspirante.academicaModulos.map((mod) => (
            <div key={mod.modulo} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid var(--ink-line)', padding: '6px 0' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--bone)' }}>Módulo {mod.modulo}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: notaColor(mod.promedio), fontSize: 13 }}>{fmt(mod.promedio)}</span>
                  {canManage && <button className="btn btn--ghost btn--sm" style={{ padding: '2px 8px' }} onClick={() => onAdd('academica', undefined, mod.modulo)}>+ lección</button>}
                </span>
              </div>
              {mod.lecciones.length === 0 ? (
                <p style={{ color: 'var(--graphite)', fontSize: 11, padding: '4px 0 4px 10px' }}>Sin lecciones registradas.</p>
              ) : mod.lecciones.map((l) => (
                <div key={l.evalId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 0 5px 10px', borderBottom: '1px solid var(--ink-surface)' }}>
                  <span style={{ color: 'var(--steel)', fontSize: 12 }}>{l.titulo}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: notaColor(l.nota), fontSize: 12 }}>{fmt(l.nota)}</span>
                    {canManage && (
                      <>
                        <button className="btn btn--ghost btn--sm" style={{ padding: '2px 6px' }} onClick={() => onAdd('academica', aspirante.evaluaciones.find((e) => e.evalId === l.evalId))}>✎</button>
                        <button className="btn btn--ghost btn--sm" style={{ padding: '2px 6px' }} onClick={() => onDelete(l.evalId)}>✕</button>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {(menu === 'general' || menu === 'fisico') && (
        <div style={{ marginBottom: 14 }}>
          <div style={cardHead}>Físico — métricas</div>
          {(() => {
            const ev = latestEval(aspirante.evaluaciones, 'fisico')
            if (!ev) return <p style={{ color: 'var(--graphite)', fontSize: 12 }}>Sin datos.</p>
            const metricas = ev.metricas ?? {}
            return (
              <>
                {Object.entries(metricas).map(([k, v]) => (
                  <DetailRow key={k} label={k} value={String(v)} />
                ))}
                <DetailRow label="Nota Físico" value={fmt(ev.nota)} color={notaColor(ev.nota)}
                  canManage={canManage} onEdit={() => onAdd('fisico', ev)} onDelete={() => onDelete(ev.evalId)} />
              </>
            )
          })()}
        </div>
      )}

      {(menu === 'general' || menu === 'actitud') && (
        <div style={{ marginBottom: 14 }}>
          <div style={cardHead}>Actitud bomberil — comentarios</div>
          {aspirante.evaluaciones.filter((e) => e.categoria === 'actitud').length === 0 && (
            <p style={{ color: 'var(--graphite)', fontSize: 12 }}>Sin comentarios.</p>
          )}
          {aspirante.evaluaciones.filter((e) => e.categoria === 'actitud').map((ev) => (
            <div key={ev.evalId} style={{ borderBottom: '1px solid var(--ink-line)', padding: '6px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: notaColor(ev.nota), fontSize: 13 }}>{fmt(ev.nota)}</span>
                <span style={{ color: 'var(--graphite)', fontSize: 11 }}>{fecha(ev.fecha || ev.createdAt)}</span>
              </div>
              {ev.comentario && <p style={{ color: 'var(--steel)', fontSize: 12, marginTop: 3 }}>{ev.comentario}</p>}
              {ev.evaluadoPorNombre && <p style={{ color: 'var(--graphite)', fontSize: 10, marginTop: 2, fontFamily: 'var(--font-mono)' }}>— {ev.evaluadoPorNombre}</p>}
              {canManage && (
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => onAdd('actitud', ev)}>Editar</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => onDelete(ev.evalId)}>Eliminar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(menu === 'general' || menu === 'asistencia') && (
        <div style={{ marginBottom: 14 }}>
          <div style={cardHead}>Asistencia</div>
          {(() => {
            const ev = latestEval(aspirante.evaluaciones, 'asistencia')
            return (
              <DetailRow label="Nota / %" value={ev ? fmt(ev.nota) : '—'} color={notaColor(ev?.nota)}
                canManage={canManage} onEdit={() => onAdd('asistencia', ev)} onDelete={ev ? () => onDelete(ev.evalId) : undefined} />
            )
          })()}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {canManage && menu !== 'general' && (
          <button className="btn btn--ghost btn--sm" onClick={() => onAdd(menu as EvalCategoria, undefined, menu === 'academica' ? modulo : undefined)}>
            + Registrar {menu === 'academica' ? `lección (Mód. ${modulo})` : 'nota'}
          </button>
        )}
        <Link href={`/areas/instruccion/registro/${aspirante.aspiranteId}`} className="btn btn--primary btn--sm" style={{ textAlign: 'center', textDecoration: 'none' }}>
          Generar informe
        </Link>
      </div>
    </aside>
  )
}

function MiniStat({ label, value, big }: { label: string; value: number | null; big?: boolean }) {
  return (
    <div style={{ border: '1px solid var(--ink-line)', padding: big ? '8px 10px' : '6px 8px', background: 'var(--ink-surface)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--steel)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: big ? 20 : 15, color: notaColor(value) }}>{fmt(value)}</div>
    </div>
  )
}

function DetailRow({ label, value, color, canManage, onEdit, onDelete }: {
  label: string; value: string; color?: string; canManage?: boolean; onEdit?: () => void; onDelete?: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid var(--ink-line)', padding: '6px 0' }}>
      <span style={{ color: 'var(--steel)', fontSize: 12, textTransform: 'capitalize' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: color ?? 'var(--bone)', fontSize: 13 }}>{value}</span>
        {canManage && onEdit && <button className="btn btn--ghost btn--sm" onClick={onEdit} style={{ padding: '2px 6px' }}>✎</button>}
        {canManage && onDelete && <button className="btn btn--ghost btn--sm" onClick={onDelete} style={{ padding: '2px 6px' }}>✕</button>}
      </span>
    </div>
  )
}

// ── modal de registro/edición de nota (reutilizable — workspace + registro) ───
export function EvalModal({ aspiranteId, fullName, categoria, existing, defaultModulo, onClose, onSaved }: {
  aspiranteId: string
  fullName: string
  categoria: EvalCategoria
  existing?: AspiranteEvaluacion
  defaultModulo: Modulo
  onClose: () => void
  onSaved: () => void
}) {
  const [nota, setNota] = useState<string>(existing ? String(existing.nota) : '')
  const [modulo, setModulo] = useState<Modulo>(existing?.modulo ?? defaultModulo)
  const [leccion, setLeccion] = useState(existing?.leccion ?? '')
  const [comentario, setComentario] = useState(existing?.comentario ?? '')
  const [fechaVal, setFechaVal] = useState(existing?.fecha?.split('T')[0] ?? '')
  const [metricas, setMetricas] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {}
    for (const m of METRICAS_FISICAS) base[m] = ''
    if (existing?.metricas) for (const [k, v] of Object.entries(existing.metricas)) base[k] = String(v)
    return base
  })
  const [customName, setCustomName] = useState('')
  const [customVal, setCustomVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const notaNum = Number(nota)
    if (Number.isNaN(notaNum) || notaNum < 0 || notaNum > 20) {
      setError('La nota debe estar entre 0 y 20.')
      return
    }
    if (categoria === 'academica' && !leccion.trim()) {
      setError('Indica el nombre de la lección.')
      return
    }
    let metricasObj: Record<string, number> | undefined
    if (categoria === 'fisico') {
      metricasObj = {}
      for (const [k, v] of Object.entries(metricas)) {
        if (v.trim() !== '' && !Number.isNaN(Number(v))) metricasObj[k] = Number(v)
      }
      if (customName.trim() && customVal.trim() && !Number.isNaN(Number(customVal))) {
        metricasObj[customName.trim()] = Number(customVal)
      }
    }

    setSaving(true)
    const res = await upsertEvaluacion({
      evalId: existing?.evalId,
      aspiranteId,
      categoria,
      modulo: categoria === 'academica' ? modulo : undefined,
      leccion: categoria === 'academica' ? leccion.trim() : undefined,
      nota: notaNum,
      metricas: metricasObj,
      comentario: comentario.trim() || undefined,
      fecha: fechaVal || undefined,
    })
    setSaving(false)
    if (!res.ok) setError(res.error)
    else onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <form onSubmit={submit} style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', padding: 28, width: 460, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--bone)', marginBottom: 4 }}>
          {existing ? 'Editar' : 'Registrar'} nota — {EVAL_CATEGORIA_LABELS[categoria]}
        </h2>
        <p style={{ color: 'var(--steel)', fontSize: 12, marginBottom: 20 }}>{fullName}</p>

        {categoria === 'academica' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Módulo (ESBAS)</label>
              <select value={modulo} onChange={(e) => setModulo(e.target.value as Modulo)} style={inputStyle}>
                {MODULOS.map((m) => <option key={m} value={m}>Módulo {m}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Lección</label>
              <input value={leccion} onChange={(e) => setLeccion(e.target.value)} required placeholder="Ej. Identidad institucional, Nudos y amarres…" style={inputStyle} />
            </div>
          </>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Nota de la lección (0 – 20)</label>
          <input type="number" step="0.01" min="0" max="20" value={nota} onChange={(e) => setNota(e.target.value)} required style={inputStyle} />
        </div>

        {categoria === 'fisico' && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Métricas físicas</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {METRICAS_FISICAS.map((m) => (
                <div key={m}>
                  <label style={{ ...labelStyle, fontSize: 10 }}>{m}</label>
                  <input type="number" step="0.01" value={metricas[m] ?? ''} onChange={(e) => setMetricas((s) => ({ ...s, [m]: e.target.value }))} style={inputStyle} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Métrica personalizada</label>
                <input placeholder="Ej. circuito BREC (s)" value={customName} onChange={(e) => setCustomName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Valor</label>
                <input type="number" step="0.01" value={customVal} onChange={(e) => setCustomVal(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>
        )}

        {(categoria === 'actitud' || categoria === 'academica' || categoria === 'asistencia' || categoria === 'fisico') && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Comentario {categoria === 'actitud' ? '(iniciativa, apoyo a la compañía, disciplina)' : '(opcional)'}</label>
            <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={categoria === 'actitud' ? 4 : 2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Fecha de evaluación</label>
          <input type="date" value={fechaVal} onChange={(e) => setFechaVal(e.target.value)} style={inputStyle} />
        </div>

        {error && <p style={{ color: 'var(--red-163)', fontSize: 12, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}
