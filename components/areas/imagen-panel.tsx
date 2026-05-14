"use client"

import { Calendar, Megaphone, Instagram, Facebook, BarChart2, ExternalLink } from 'lucide-react'
import type { ImagenExtraData, CalendarEntry, PublishedAnnouncement } from '@/lib/areas/get-imagen-data'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'IG',
  facebook: 'FB',
  tiktok: 'TK',
  youtube: 'YT',
  twitter: 'TW',
  linkedin: 'LI',
  whatsapp: 'WA',
}

const CATEGORY_LABELS: Record<string, string> = {
  aniversario: 'Aniversario',
  cumpleanos: 'Cumpleaños',
  fecha_especial: 'Fecha especial',
  prevencion: 'Prevención',
  emergencias: 'Emergencias',
  reclutamiento: 'Reclutamiento',
  reconocimiento: 'Reconocimiento',
  comunidad: 'Comunidad',
  institucional: 'Institucional',
}

const STATUS_COLORS: Record<string, string> = {
  publicado: 'var(--emerald-glow)',
  en_proceso: 'var(--flame)',
  planificado: 'var(--steel)',
  cancelado: 'var(--graphite)',
}

type TabKey = 'calendario' | 'anuncios' | 'stats'

export function ImagenPanel({ extra }: { extra: ImagenExtraData }) {
  const [tab, setTab] = useState<TabKey>('calendario')
  const { upcomingContent, recentContent, publishedAnnouncements, stats } = extra

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <MiniKpi label="ESTE MES" value={stats.totalThisMonth} sub="publicaciones totales" />
        <MiniKpi label="PUBLICADOS" value={stats.publishedThisMonth} sub="ya publicados" variant="ok" />
        <MiniKpi label="EN PROCESO" value={stats.inProgressThisMonth} sub="en elaboración" variant={stats.inProgressThisMonth > 0 ? 'warn' : undefined} />
        <MiniKpi label="PLANIFICADOS" value={stats.plannedThisMonth} sub="pendientes" />
        <MiniKpi label="ANUNCIOS" value={stats.totalAnnouncements} sub="publicados en total" />
      </div>

      {/* Tabs */}
      <nav className="area-inbox-tabs">
        <TabBtn active={tab === 'calendario'} onClick={() => setTab('calendario')} icon={Calendar}>
          Calendario <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)' }}>({upcomingContent.length})</span>
        </TabBtn>
        <TabBtn active={tab === 'anuncios'} onClick={() => setTab('anuncios')} icon={Megaphone}>
          Anuncios publicados <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)' }}>({publishedAnnouncements.length})</span>
        </TabBtn>
        <TabBtn active={tab === 'stats'} onClick={() => setTab('stats')} icon={BarChart2}>
          Estadísticas
        </TabBtn>
      </nav>

      {tab === 'calendario' && (
        <CalendarioTab upcoming={upcomingContent} recent={recentContent} />
      )}
      {tab === 'anuncios' && (
        <AnunciosTab announcements={publishedAnnouncements} />
      )}
      {tab === 'stats' && (
        <StatsTab stats={stats} />
      )}

    </div>
  )
}

function TabBtn({
  active, onClick, icon: Icon, children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={cn('area-inbox-tab', active && 'area-inbox-tab--active')}
      onClick={onClick}
    >
      <Icon className="w-3 h-3" strokeWidth={1.8} />
      {children}
    </button>
  )
}

// ─── Calendario ───

function CalendarioTab({ upcoming, recent }: { upcoming: CalendarEntry[]; recent: CalendarEntry[] }) {
  if (upcoming.length === 0 && recent.length === 0) {
    return (
      <div className="guardia-empty">
        Sin publicaciones en el calendario. Agrega entradas desde el módulo de Imagen.
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {upcoming.length > 0 && (
        <section>
          <SubTitle>Próximas publicaciones ({upcoming.length})</SubTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {upcoming.map((e) => <ContentCard key={e.id} entry={e} />)}
          </div>
        </section>
      )}
      {recent.length > 0 && (
        <section>
          <SubTitle>Publicadas recientemente</SubTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {recent.map((e) => <ContentCard key={e.id} entry={e} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function ContentCard({ entry }: { entry: CalendarEntry }) {
  const statusColor = STATUS_COLORS[entry.status] ?? 'var(--steel)'
  const statusLabel = {
    publicado: 'PUBLICADO',
    en_proceso: 'EN PROCESO',
    planificado: 'PLANIFICADO',
    cancelado: 'CANCELADO',
  }[entry.status] ?? entry.status.toUpperCase()

  return (
    <div
      style={{
        background: 'var(--ink-deep)',
        border: '1px solid var(--ink-line)',
        borderLeft: `3px solid ${statusColor}`,
        borderRadius: 2,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--brass)',
            letterSpacing: '0.04em',
          }}
        >
          {formatCalendarDate(entry.date)}
        </div>
        <span
          style={{
            padding: '2px 7px',
            border: `1px solid ${statusColor}`,
            background: `${statusColor}18`,
            borderRadius: 2,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: statusColor,
            fontWeight: 700,
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Título */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bone)', lineHeight: 1.4 }}>
        {entry.title}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        {entry.type && (
          <span style={{ padding: '2px 7px', background: 'var(--ink-black)', border: '1px solid var(--ink-line)', borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)', letterSpacing: '0.08em' }}>
            {entry.type.toUpperCase()}
          </span>
        )}
        {entry.category && (
          <span style={{ padding: '2px 7px', background: 'var(--ink-black)', border: '1px solid var(--ink-line)', borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--steel)', letterSpacing: '0.06em' }}>
            {CATEGORY_LABELS[entry.category] ?? entry.category}
          </span>
        )}
        {entry.platform && entry.platform.length > 0 && entry.platform.map((p) => (
          <span
            key={p}
            style={{
              padding: '2px 7px',
              background: 'rgba(196,160,98,0.08)',
              border: '1px solid var(--brass-deep)',
              borderRadius: 2,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--brass)',
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}
          >
            {PLATFORM_ICONS[p] ?? p.toUpperCase()}
          </span>
        ))}
      </div>

      {/* Asignado + template */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {entry.assignedToName && (
          <span style={{ fontSize: 11, color: 'var(--graphite)' }}>
            {shortName(entry.assignedToName)}
          </span>
        )}
        {entry.templateUrl && (
          <a
            href={entry.templateUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--brass)',
              textDecoration: 'none',
            }}
          >
            Ver plantilla <ExternalLink className="w-2.5 h-2.5" strokeWidth={1.8} />
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Anuncios ───

function AnunciosTab({ announcements }: { announcements: PublishedAnnouncement[] }) {
  if (announcements.length === 0) {
    return <div className="guardia-empty">Sin anuncios publicados aún.</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {announcements.map((a) => <AnnouncementRow key={a.id} announcement={a} />)}
    </div>
  )
}

function AnnouncementRow({ announcement }: { announcement: PublishedAnnouncement }) {
  const priorityColor = announcement.priority === 'urgente' ? 'var(--red-glow)'
    : announcement.priority === 'importante' ? 'var(--flame)'
    : 'var(--steel)'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: 'var(--ink-deep)',
        border: '1px solid var(--ink-line)',
        borderRadius: 2,
      }}
    >
      <div
        style={{
          padding: '3px 7px',
          border: `1px solid ${priorityColor}`,
          background: `${priorityColor}18`,
          borderRadius: 2,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: priorityColor,
          fontWeight: 700,
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
        }}
      >
        {announcement.priority.toUpperCase()}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bone)', marginBottom: 2 }}>
          {announcement.title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
          {announcement.authorName ?? '—'} · {announcement.audienceSummary}
          {announcement.publishedAt && ` · ${formatTimeAgo(announcement.publishedAt)}`}
        </div>
      </div>
      <Megaphone className="w-3.5 h-3.5" strokeWidth={1.6} style={{ color: 'var(--graphite)' }} />
    </div>
  )
}

// ─── Stats ───

function StatsTab({ stats }: { stats: ImagenExtraData['stats'] }) {
  const platformEntries = Object.entries(stats.byPlatform).sort((a, b) => b[1] - a[1])
  const categoryEntries = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])
  const maxPlatform = platformEntries[0]?.[1] ?? 1
  const maxCategory = categoryEntries[0]?.[1] ?? 1

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div>
        <SubTitle>Por plataforma</SubTitle>
        {platformEntries.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--graphite)' }}>Sin datos</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {platformEntries.map(([p, n]) => (
              <BarRow key={p} label={p.charAt(0).toUpperCase() + p.slice(1)} value={n} max={maxPlatform} />
            ))}
          </div>
        )}
      </div>
      <div>
        <SubTitle>Por categoría</SubTitle>
        {categoryEntries.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--graphite)' }}>Sin datos</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categoryEntries.map(([c, n]) => (
              <BarRow key={c} label={CATEGORY_LABELS[c] ?? c} value={n} max={maxCategory} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: 'var(--bone)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--brass)' }}>{value}</span>
      </div>
      <div style={{ height: 3, background: 'var(--ink-line)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brass)', borderRadius: 2 }} />
      </div>
    </div>
  )
}

// ─── Shared ───

function MiniKpi({ label, value, sub, variant }: { label: string; value: number; sub: string; variant?: 'ok' | 'warn' | 'alert' }) {
  const cls = variant === 'alert' && value > 0 ? 'area-kpi area-kpi--alert'
    : variant === 'warn' && value > 0 ? 'area-kpi area-kpi--warn'
    : variant === 'ok' && value > 0 ? 'area-kpi area-kpi--ok'
    : 'area-kpi'
  return (
    <div className={cls}>
      <div className="area-kpi-label">{label}</div>
      <div className="area-kpi-value mono">{value}</div>
      <div className="area-kpi-sub">{sub}</div>
    </div>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--graphite)', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--ink-line-soft)' }}>
      {children}
    </div>
  )
}

function shortName(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) return fullName
  const apellidos = parts[0].trim().split(/\s+/)[0]
  const nombre = parts[1].trim().split(/\s+/)[0]
  return `${nombre} ${apellidos}`
}

function formatCalendarDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${day?.toString().padStart(2, '0')} ${meses[(month ?? 1) - 1]} ${year}`
}

function formatTimeAgo(d: Date): string {
  const secs = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (secs < 60) return 'ahora'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} días`
  return `hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) === 1 ? '' : 'es'}`
}
