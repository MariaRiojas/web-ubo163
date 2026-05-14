"use client"

import Link from 'next/link'
import { GraduationCap, BookOpen, Users, ExternalLink } from 'lucide-react'
import type {
  CourseStats, AspiranteInEsbas, InstruccionExtraData,
} from '@/lib/areas/get-instruccion-data'

const STATUS_LABELS: Record<string, string> = {
  postulante: 'Postulante',
  aspirante_en_curso: 'Aspirante en formación',
  activo: 'Activo',
}

export function InstruccionPanel({ extra }: { extra: InstruccionExtraData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ESBAS */}
      {extra.esbasStats && (
        <section>
          <h3 className="faena-section-title" style={{ marginBottom: 12 }}>
            <GraduationCap className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--brass)' }} />
            Escuela Básica de Bomberos (ESBAS)
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <MiniKpi label="INSCRIPTOS TOTAL" value={extra.esbasStats.totalEnrolled} />
            <MiniKpi label="EN CURSO" value={extra.esbasStats.activeEnrolled} variant="warn" />
            <MiniKpi label="COMPLETADOS" value={extra.esbasStats.completedEnrolled} variant="ok" />
            <MiniKpi label="HORAS CURSO" value={extra.esbasStats.durationHours ?? 0} suffix="h" />
          </div>

          {extra.aspirantesInEsbas.length > 0 && (
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: 'var(--graphite)',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  paddingBottom: 6,
                  borderBottom: '1px solid var(--ink-line-soft)',
                }}
              >
                ASPIRANTES Y POSTULANTES ({extra.aspirantesInEsbas.length})
              </div>
              <div className="area-personal">
                {extra.aspirantesInEsbas.map((a) => (
                  <AspiranteRow key={a.profileId} aspirante={a} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Top cursos Escuela Técnica */}
      {extra.topCourses.length > 0 && (
        <section>
          <h3 className="faena-section-title" style={{ marginBottom: 12 }}>
            <BookOpen className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--red-glow)' }} />
            Cursos activos más demandados
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            {extra.topCourses.map((c) => (
              <CourseStatsCard key={c.courseId} course={c} />
            ))}
          </div>
        </section>
      )}

      {/* Distribución por categoría */}
      {Object.keys(extra.totalsByCategory).length > 0 && (
        <section>
          <h3 className="faena-section-title" style={{ marginBottom: 12 }}>
            <Users className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--steel)' }} />
            Distribución por categoría
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
            }}
          >
            {Object.entries(extra.totalsByCategory).map(([cat, t]) => (
              <div key={cat} className="area-kpi">
                <div className="area-kpi-label">{formatCategoryLabel(cat)}</div>
                <div className="area-kpi-value mono" style={{ fontSize: 22 }}>
                  {t.total}
                </div>
                <div className="area-kpi-sub">
                  {t.active} activos · {t.completed} completados
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function MiniKpi({
  label, value, suffix, variant,
}: {
  label: string
  value: number
  suffix?: string
  variant?: 'ok' | 'warn' | 'alert'
}) {
  const cls = variant ? `area-kpi area-kpi--${variant}` : 'area-kpi'
  return (
    <div className={cls}>
      <div className="area-kpi-label">{label}</div>
      <div className="area-kpi-value mono">
        {value}{suffix && <span style={{ fontSize: 14, marginLeft: 4 }}>{suffix}</span>}
      </div>
    </div>
  )
}

function CourseStatsCard({ course }: { course: CourseStats }) {
  return (
    <Link
      href={`/capacitacion/${course.slug}`}
      style={{
        background: 'var(--ink-deep)',
        border: '1px solid var(--ink-line)',
        borderLeft: '3px solid var(--brass-deep)',
        borderRadius: 2,
        padding: 14,
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'all 160ms ease',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          color: 'var(--brass)',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {formatCategoryLabel(course.category)}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h4
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 500,
            color: 'var(--bone)',
            flex: 1,
            letterSpacing: '-0.005em',
          }}
        >
          {course.title}
        </h4>
        <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.6} style={{ color: 'var(--graphite)' }} />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          paddingTop: 8,
          borderTop: '1px solid var(--ink-line-soft)',
          fontSize: 11,
        }}
      >
        <Stat label="INSCRIPTOS" value={course.totalEnrolled} />
        <Stat label="ACTIVOS" value={course.activeEnrolled} color="var(--flame)" />
        <Stat label="COMPLETOS" value={course.completedEnrolled} color="var(--emerald-glow)" />
      </div>
    </Link>
  )
}

function Stat({
  label, value, color,
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
          color: 'var(--graphite)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 16,
          fontWeight: 600,
          color: color ?? 'var(--bone)',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function AspiranteRow({ aspirante }: { aspirante: AspiranteInEsbas }) {
  const initials = getInitials(aspirante.fullName)
  const statusLabel = STATUS_LABELS[aspirante.status] ?? aspirante.status
  const enrolled = !!aspirante.enrollmentStatus
  const completed = aspirante.enrollmentStatus === 'completada'

  return (
    <div className="area-person-row">
      <div
        className="area-person-initials"
        style={{
          color: 'var(--brass)',
          borderColor: 'var(--brass-deep)',
          background: 'rgba(196, 160, 98, 0.08)',
        }}
      >
        {initials}
      </div>
      <div>
        <div className="area-person-name">{aspirante.fullName}</div>
        <div className="area-person-grade">{statusLabel}</div>
      </div>
      <div
        className="area-person-role"
        style={{
          color: completed ? 'var(--emerald-glow)' : enrolled ? 'var(--flame)' : 'var(--steel)',
          background: completed ? 'rgba(16, 185, 129, 0.08)' : enrolled ? 'rgba(245, 158, 11, 0.08)' : 'var(--ink-black)',
        }}
      >
        {completed ? `APROBADO${aspirante.finalGrade ? ` · ${Number(aspirante.finalGrade).toFixed(0)}/20` : ''}`
          : enrolled ? 'ESBAS EN CURSO'
          : 'NO INSCRIPTO'}
      </div>
      <div className="area-person-code">{aspirante.codigoCgbvp ?? '—'}</div>
    </div>
  )
}

function getInitials(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length >= 2) {
    const ap = parts[0].trim().split(/\s+/)[0]?.[0] ?? ''
    const nm = parts[1].trim().split(/\s+/)[0]?.[0] ?? ''
    return `${nm}${ap}`.toUpperCase()
  }
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function formatCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    esbas: 'ESBAS',
    escuela_tecnica: 'Escuela Técnica',
    webinar: 'Webinar',
    workshop: 'Taller',
    norma: 'Normas',
    otro: 'Otro',
  }
  return map[cat] ?? cat
}
