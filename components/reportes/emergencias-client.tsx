'use client'

import { useState, useMemo } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { Flame, MapPin, Clock, TrendingUp, Award, Search, ListFilter, BarChart3 } from 'lucide-react'
import type { EmergenciasData } from '@/lib/reportes/get-emergencias-data'

const BRASS = '#C4A062'
const RED = '#DC2626'
const INK_LINE = '#232B3B'
const STEEL = '#8B96A5'
const BONE = '#E8EBF0'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--ink-black)', border: '1px solid var(--ink-line)', borderRadius: 3, padding: '6px 10px', fontSize: 12 }}>
      <div style={{ color: 'var(--steel)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{label}</div>
      <div style={{ color: 'var(--bone)', fontWeight: 600 }}>{payload[0].value} emergencias</div>
    </div>
  )
}

function Panel({ title, icon, children, sub }: { title: string; icon: React.ReactNode; children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', borderRadius: 3, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: 'var(--brass)' }}>{icon}</span>
        <h3 style={{ fontSize: 13, color: 'var(--bone)', fontWeight: 600 }}>{title}</h3>
        {sub && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>{sub}</span>}
      </div>
      {children}
    </div>
  )
}

export function EmergenciasClient({ data }: { data: EmergenciasData }) {
  const [tab, setTab] = useState<'resumen' | 'registro'>('resumen')
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return data.recientes
    return data.recientes.filter(r =>
      r.tipo.toLowerCase().includes(s) || r.distrito.toLowerCase().includes(s) ||
      r.direccion.toLowerCase().includes(s) || r.numeroParte.toLowerCase().includes(s) ||
      r.alMando.toLowerCase().includes(s),
    )
  }, [q, data.recientes])

  const maxTipo = Math.max(...data.porTipo.map(d => d.value), 1)
  const maxDist = Math.max(...data.porDistrito.map(d => d.value), 1)

  return (
    <div>
      {/* Hero */}
      <header className="area-hero" style={{ marginBottom: 18 }}>
        <div className="area-hero-seal"><Flame className="w-6 h-6" strokeWidth={1.6} /></div>
        <div className="area-hero-body">
          <div className="area-hero-ref">COMANDO · INTELIGENCIA OPERATIVA</div>
          <h1 className="area-hero-title">Emergencias</h1>
          <p className="area-hero-desc">
            Análisis de la actividad operativa de la Compañía — patrones de demanda para evaluar
            operatividad y planificar recursos.
            {data.kpis.rangoDesde && (
              <> Datos del {data.kpis.rangoDesde} al {data.kpis.rangoHasta}.</>
            )}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { k: 'resumen', label: 'Resumen', icon: <BarChart3 className="w-3.5 h-3.5" strokeWidth={1.8} /> },
          { k: 'registro', label: `Registro de partes (${data.recientes.length})`, icon: <ListFilter className="w-3.5 h-3.5" strokeWidth={1.8} /> },
        ].map(t => (
          <button key={t.k} type="button" onClick={() => setTab(t.k as any)}
            className={tab === t.k ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' ? (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <Kpi label="Total emergencias" value={data.kpis.total} sub={`${data.kpis.promedioMensual}/mes promedio`} />
            <Kpi label="Último mes" value={data.kpis.ultimoMes} sub="partes atendidos" accent />
            <Kpi label="Tipo más frecuente" value={data.kpis.tipoMasFrecuente} sub="mayor demanda" small />
            <Kpi label="Distrito más atendido" value={data.kpis.distritoMasAtendido} sub="cobertura principal" small />
            {data.kpis.tiempoRespuestaProm != null && (
              <Kpi label="Tiempo prom. operación" value={`${data.kpis.tiempoRespuestaProm} min`} sub="despacho → retorno" small />
            )}
          </div>

          {/* Categorías operativas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
            <CatCard label="Incendios" value={data.categorias.incendios} color={RED} />
            <CatCard label="Emergencias médicas" value={data.categorias.medicas} color="#34D399" />
            <CatCard label="Rescates / accidentes" value={data.categorias.rescates} color={BRASS} />
            <CatCard label="Otras" value={data.categorias.otras} color={STEEL} />
          </div>

          {/* Tendencia mensual */}
          <div style={{ marginBottom: 12 }}>
            <Panel title="Tendencia mensual" icon={<TrendingUp className="w-4 h-4" strokeWidth={1.7} />} sub="últimos 12 meses">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.porMes} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gEmg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={RED} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={RED} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={INK_LINE} strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: STEEL, fontSize: 10 }} axisLine={{ stroke: INK_LINE }} tickLine={false} />
                  <YAxis tick={{ fill: STEEL, fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: BRASS, strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="value" stroke={RED} strokeWidth={2} fill="url(#gEmg)" />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, marginBottom: 12 }}>
            {/* Por tipo */}
            <Panel title="Por tipo de emergencia" icon={<Flame className="w-4 h-4" strokeWidth={1.7} />}>
              <BarList data={data.porTipo} max={maxTipo} color={RED} />
            </Panel>
            {/* Por distrito */}
            <Panel title="Por distrito" icon={<MapPin className="w-4 h-4" strokeWidth={1.7} />}>
              <BarList data={data.porDistrito} max={maxDist} color={BRASS} />
            </Panel>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, marginBottom: 12 }}>
            {/* Por hora */}
            <Panel title="Demanda por hora del día" icon={<Clock className="w-4 h-4" strokeWidth={1.7} />} sub="cuándo se necesita dotación">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.porHora} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke={INK_LINE} strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: STEEL, fontSize: 9 }} axisLine={{ stroke: INK_LINE }} tickLine={false} interval={2} />
                  <YAxis tick={{ fill: STEEL, fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(196,160,98,0.08)' }} />
                  <Bar dataKey="value" fill={BRASS} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
            {/* Por día de semana */}
            <Panel title="Por día de la semana" icon={<BarChart3 className="w-4 h-4" strokeWidth={1.7} />}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.porDiaSemana} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke={INK_LINE} strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: STEEL, fontSize: 10 }} axisLine={{ stroke: INK_LINE }} tickLine={false} />
                  <YAxis tick={{ fill: STEEL, fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(196,160,98,0.08)' }} />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {data.porDiaSemana.map((_, i) => <Cell key={i} fill={i === 0 || i === 6 ? RED : BRASS} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          {/* Al mando */}
          <Panel title="Liderazgo operativo — al mando" icon={<Award className="w-4 h-4" strokeWidth={1.7} />} sub="emergencias comandadas">
            {data.alMando.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--graphite)' }}>Sin datos de mando registrados.</p>
            ) : (
              <Podio items={data.alMando} />
            )}
          </Panel>
        </>
      ) : (
        /* Registro de partes */
        <>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--ink-black)', border: '1px solid var(--ink-line)', borderRadius: 2, padding: '8px 12px', maxWidth: 420 }}>
            <Search className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--graphite)' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por tipo, distrito, dirección, parte…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--bone)', fontSize: 13 }} />
          </div>
          <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', borderRadius: 3, overflowX: 'auto' }}>
            <div style={{ minWidth: 820 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '90px 100px 1fr 130px 150px 110px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--ink-line)', background: 'var(--ink-black)' }}>
                {['PARTE', 'FECHA', 'DIRECCIÓN', 'DISTRITO', 'TIPO', 'ESTADO'].map(h => (
                  <div key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', color: 'var(--graphite)' }}>{h}</div>
                ))}
              </div>
              <div style={{ maxHeight: 560, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <div className="guardia-empty">No hay partes que coincidan.</div>
                ) : filtered.map(r => (
                  <div key={r.emergencyId} style={{ display: 'grid', gridTemplateColumns: '90px 100px 1fr 130px 150px 110px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--ink-line-soft, #1D2432)', fontSize: 12, alignItems: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--brass)' }}>{r.numeroParte}</div>
                    <div style={{ color: 'var(--steel)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.date}{r.hora ? ` ${r.hora}` : ''}</div>
                    <div style={{ color: 'var(--bone)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.direccion}</div>
                    <div style={{ color: 'var(--steel)' }}>{r.distrito}</div>
                    <div style={{ color: 'var(--steel)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tipo}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', textTransform: 'uppercase' }}>{r.estado}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, sub, accent, small }: { label: string; value: number | string; sub: string; accent?: boolean; small?: boolean }) {
  return (
    <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', borderLeft: `3px solid ${accent ? RED : INK_LINE}`, borderRadius: 3, padding: '14px 16px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--graphite)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: small ? 'var(--font-ui)' : 'var(--font-display)', fontSize: small ? 16 : 30, lineHeight: 1, color: accent ? RED : 'var(--bone)', fontWeight: small ? 600 : 400 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 6 }}>{sub}</div>
    </div>
  )
}

function Podio({ items }: { items: { name: string; value: number }[] }) {
  const top3 = items.slice(0, 3)
  const resto = items.slice(3)
  // Orden visual del podio: 2° · 1° · 3°
  const orden = [top3[1], top3[0], top3[2]].filter(Boolean)
  const alturas: Record<number, number> = { 0: 64, 1: 92, 2: 48 } // por posición real
  const medallas: Record<number, string> = { 0: '#C4A062', 1: '#E8C766', 2: '#9C7B4A' }
  const posReal = (m: { name: string; value: number }) => top3.indexOf(m)

  return (
    <div style={{ marginTop: 10 }}>
      {/* Podio */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginBottom: resto.length ? 18 : 0 }}>
        {orden.map(m => {
          const pos = posReal(m)
          return (
            <div key={m.name} style={{ flex: 1, maxWidth: 180, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--bone)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: medallas[pos], lineHeight: 1, marginBottom: 6 }}>{m.value}</div>
              <div style={{
                height: alturas[pos], borderRadius: '3px 3px 0 0',
                background: `linear-gradient(180deg, ${medallas[pos]}33, ${medallas[pos]}0D)`,
                border: `1px solid ${medallas[pos]}66`, borderBottom: 'none',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 8,
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: medallas[pos] }}>{pos + 1}°</span>
              </div>
            </div>
          )
        })}
      </div>
      {/* Resto */}
      {resto.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {resto.map((m, i) => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--ink-black)', border: '1px solid var(--ink-line)', borderRadius: 2 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)', width: 20 }}>{i + 4}°</span>
              <span style={{ fontSize: 12, color: 'var(--steel)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--bone)' }}>{m.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', borderTop: `2px solid ${color}`, borderRadius: 3, padding: '12px 14px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 1, color: 'var(--bone)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 6 }}>{label}</div>
    </div>
  )
}

function BarList({ data, max, color }: { data: { name: string; value: number }[]; max: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      {data.map(d => (
        <div key={d.name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span style={{ color: 'var(--steel)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{d.name}</span>
            <span style={{ color: 'var(--bone)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{d.value}</span>
          </div>
          <div style={{ height: 5, background: 'var(--ink-black)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(d.value / max) * 100}%`, background: color, borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
