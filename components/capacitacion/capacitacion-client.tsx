"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Clock, ShieldCheck, GraduationCap, BookOpen, Download,
  FileText, Award, AlertTriangle, Atom, Link2, Triangle,
  Shield, Lock, Check, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  CapacitacionData,
  CatalogCardData,
  CourseInProgress,
  LibraryCardData,
  EsbasCardData,
} from '@/lib/capacitacion/get-capacitacion-data'
import type { ComponentType, SVGProps } from 'react'

// Mapeo por categorySlug para íconos
const CATALOG_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  matpel: Atom,
  rescate: AlertTriangle,
  cuerdas: Triangle,
  normas: FileText,
  autoproteccion: Shield,
  default: Award,
}

const CATEGORY_FILTER_LABELS: Record<string, string> = {
  matpel: 'HazMat',
  rescate: 'Rescate',
  cuerdas: 'Cuerdas',
  normas: 'Normas',
  autoproteccion: 'Autoprotección',
}

export function CapacitacionClient({
  data,
  esbasPromotionFromProfile,
}: {
  data: CapacitacionData
  esbasPromotionFromProfile: string | null
}) {
  const [activeFilter, setActiveFilter] = useState<string>('todos')

  const filteredCatalog = useMemo(() => {
    if (activeFilter === 'todos') return data.escuelaTecnica
    return data.escuelaTecnica.filter((c) => c.categorySlug === activeFilter)
  }, [activeFilter, data.escuelaTecnica])

  return (
    <>
      {/* Summary */}
      <SummarySection summary={data.summary} />

      {/* Continue donde lo dejó */}
      {data.inProgressCourses.length > 0 && (
        <section className="cap-section">
          <div className="cap-section-header">
            <h2 className="cap-section-title">
              <Clock className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--flame)' }} />
              Continúe donde lo dejó
            </h2>
          </div>
          <div className="cap-in-progress-grid">
            {data.inProgressCourses.map((c) => (
              <InProgressCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}

      {/* Escuela Técnica */}
      <section className="cap-section">
        <div className="cap-section-header">
          <h2 className="cap-section-title">
            <ShieldCheck className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--red-glow)' }} />
            Escuela Técnica
          </h2>
          {data.availableCategories.length > 1 && (
            <div className="cap-section-filter">
              <button
                className={cn('cap-filter-chip', activeFilter === 'todos' && 'cap-filter-chip--active')}
                onClick={() => setActiveFilter('todos')}
              >
                Todos
              </button>
              {data.availableCategories.map((cat) => (
                <button
                  key={cat}
                  className={cn('cap-filter-chip', activeFilter === cat && 'cap-filter-chip--active')}
                  onClick={() => setActiveFilter(cat)}
                >
                  {CATEGORY_FILTER_LABELS[cat] ?? cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredCatalog.length === 0 ? (
          <div className="guardia-empty">
            No hay cursos de la categoría seleccionada.
          </div>
        ) : (
          <div className="cap-courses-grid">
            {filteredCatalog.map((c) => (
              <CatalogCard key={c.id} card={c} />
            ))}
          </div>
        )}
      </section>

      {/* ESBAS */}
      {data.esbas && (
        <section className="cap-section">
          <div className="cap-section-header">
            <h2 className="cap-section-title">
              <GraduationCap className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--brass)' }} />
              Curso ESBAS
            </h2>
          </div>
          <EsbasCard esbas={data.esbas} promotionOverride={esbasPromotionFromProfile} />
        </section>
      )}

      {/* Biblioteca */}
      <section className="cap-section">
        <div className="cap-section-header">
          <h2 className="cap-section-title">
            <BookOpen className="w-5 h-5" strokeWidth={1.6} style={{ color: 'var(--brass)' }} />
            Biblioteca institucional
          </h2>
          <Link href="/biblioteca" className="cap-section-link">
            Ver biblioteca completa →
          </Link>
        </div>

        {data.library.length === 0 ? (
          <div className="guardia-empty">
            Aún no hay documentos disponibles para su grado.
          </div>
        ) : (
          <div className="cap-library-grid">
            {data.library.map((doc) => (
              <LibraryItem key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════

function SummarySection({ summary }: { summary: CapacitacionData['summary'] }) {
  const circumference = 2 * Math.PI * 26
  const dashOffset = circumference * (1 - summary.progressPercent / 100)

  return (
    <section className="capacitacion-summary">
      <div className="capacitacion-summary-card capacitacion-summary-card--featured">
        <div className="profile-card-bracket profile-card-bracket--tl" />
        <div className="profile-card-bracket profile-card-bracket--tr" />
        <div className="profile-card-bracket profile-card-bracket--bl" />
        <div className="profile-card-bracket profile-card-bracket--br" />

        <div className="summary-featured-head">
          <div>
            <div className="summary-featured-label">MI PROGRESO FORMATIVO</div>
            <div className="summary-featured-value">
              {summary.totalHours} <span className="summary-featured-unit">horas acumuladas</span>
            </div>
          </div>
          <div className="summary-featured-chart">
            <div className="ring-progress">
              <svg viewBox="0 0 60 60" width="80" height="80">
                <circle cx="30" cy="30" r="26" stroke="var(--ink-line)" strokeWidth="4" fill="none" />
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  stroke="var(--brass)"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 30 30)"
                />
              </svg>
              <div className="ring-progress-value mono">{summary.progressPercent}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="capacitacion-summary-card">
        <div className="cap-metric-label">COMPLETADOS</div>
        <div className="cap-metric-value mono">{summary.completedCount}</div>
        <div className="cap-metric-sub">
          curso{summary.completedCount === 1 ? '' : 's'} finalizado{summary.completedCount === 1 ? '' : 's'}
        </div>
      </div>

      <div className="capacitacion-summary-card">
        <div className="cap-metric-label cap-metric-label--flame">EN CURSO</div>
        <div className="cap-metric-value cap-metric-value--flame mono">{summary.inProgressCount}</div>
        <div className="cap-metric-sub">
          {summary.inProgressCount === 0 ? 'sin inscripciones activas' : 'inscripciones activas'}
        </div>
      </div>

      <div className="capacitacion-summary-card">
        <div className="cap-metric-label">CERTIFICACIONES</div>
        <div className="cap-metric-value mono">{summary.verifiedCertificates}</div>
        <div className="cap-metric-sub">verificadas</div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════
// InProgressCard
// ═══════════════════════════════════════════════════════════════════

function InProgressCard({ course }: { course: CourseInProgress }) {
  const bannerClass = `cap-course-card-banner cap-course-card-banner--${course.categorySlug}`

  return (
    <article className="cap-course-card">
      <div className={bannerClass}>
        <div className="cap-course-banner-category mono">{course.category}</div>
        <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="cap-course-banner-decoration">
          {course.categorySlug === 'brec' ? (
            <>
              <path
                d="M 0 80 L 40 60 L 80 85 L 120 55 L 160 75 L 200 50"
                stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3"
              />
              <path
                d="M 0 90 L 50 70 L 100 85 L 150 65 L 200 80"
                stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5"
              />
            </>
          ) : course.categorySlug === 'matpel' ? (
            <>
              <circle cx="50" cy="50" r="16" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
              <circle cx="130" cy="40" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
              <circle cx="170" cy="70" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" />
            </>
          ) : (
            <path
              d="M 0 50 Q 50 20 100 50 T 200 50"
              stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3"
            />
          )}
        </svg>
      </div>
      <div className="cap-course-card-body">
        <h3 className="cap-course-card-title">{course.title}</h3>
        {course.subtitle && <p className="cap-course-card-subtitle">{course.subtitle}</p>}

        <div className="cap-course-progress">
          <div className="cap-course-progress-header">
            <span className="cap-course-progress-percent mono">{course.percent} %</span>
            {course.durationHours && (
              <span className="cap-course-progress-detail">
                {course.completedHours} / {course.durationHours} horas
              </span>
            )}
          </div>
          <div className="cap-course-progress-bar">
            <div className="cap-course-progress-fill" style={{ width: `${course.percent}%` }} />
          </div>
        </div>

        {course.nextLessonTitle && (
          <div className="cap-course-next">
            <div className="cap-course-next-label">PRÓXIMA LECCIÓN</div>
            <div className="cap-course-next-title">
              {course.nextLessonNumber != null && `Lección ${course.nextLessonNumber} · `}
              {course.nextLessonTitle}
            </div>
          </div>
        )}

        <Link
          href={`/capacitacion/${course.slug}`}
          className="btn btn--primary btn--full"
          style={{ textDecoration: 'none' }}
        >
          Continuar curso
        </Link>
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════════════
// CatalogCard
// ═══════════════════════════════════════════════════════════════════

function CatalogCard({ card }: { card: CatalogCardData }) {
  const Icon = CATALOG_ICONS[card.categorySlug] ?? Award
  const cardClass = cn(
    'cap-catalog-card',
    card.status === 'completado' && 'cap-catalog-card--completed',
    card.status === 'progreso' && 'cap-catalog-card--progress',
  )

  const statusClass = {
    completado: 'cap-catalog-card-status cap-catalog-card-status--completed',
    progreso: 'cap-catalog-card-status cap-catalog-card-status--progress',
    disponible: 'cap-catalog-card-status cap-catalog-card-status--available',
    locked: 'cap-catalog-card-status cap-catalog-card-status--locked',
  }[card.status]

  const statusContent = {
    completado: (
      <>
        <Check className="w-3 h-3" strokeWidth={2.5} />
        Completado
      </>
    ),
    progreso: (
      <>
        <Clock className="w-3 h-3" strokeWidth={1.8} />
        En curso{card.progressPercent != null ? ` · ${card.progressPercent} %` : ''}
      </>
    ),
    disponible: <>Disponible</>,
    locked: (
      <>
        <Lock className="w-3 h-3" strokeWidth={1.8} />
        Requiere grado
      </>
    ),
  }[card.status]

  return (
    <Link href={`/capacitacion/${card.slug}`} className={cardClass}>
      <div className="cap-catalog-card-icon">
        <Icon className="w-7 h-7" strokeWidth={1.5} />
      </div>
      <div className="cap-catalog-card-body">
        <div className="cap-catalog-card-category mono">{card.category}</div>
        <h3 className="cap-catalog-card-title">{card.title}</h3>
        {card.subtitle && <p className="cap-catalog-card-desc">{card.subtitle}</p>}
        <div className="cap-catalog-card-meta">
          {card.durationHours && (
            <>
              <span className="cap-catalog-meta-item">
                <Clock className="w-3 h-3" strokeWidth={1.8} />
                {card.durationHours} h
              </span>
              {card.minGradeLabel && <span className="cap-catalog-meta-sep">·</span>}
            </>
          )}
          {card.minGradeLabel && (
            <span className="cap-catalog-meta-item">{card.minGradeLabel}</span>
          )}
        </div>
      </div>
      <div className={statusClass}>{statusContent}</div>
    </Link>
  )
}

// ═══════════════════════════════════════════════════════════════════
// EsbasCard
// ═══════════════════════════════════════════════════════════════════

function EsbasCard({
  esbas,
  promotionOverride,
}: {
  esbas: EsbasCardData
  promotionOverride: string | null
}) {
  const promotionLabel = promotionOverride ?? esbas.promotion ?? '—'

  return (
    <article className="cap-esbas-card">
      <div className="cap-esbas-shield">
        <Shield strokeWidth={0.8} />
      </div>
      <div className="cap-esbas-body">
        <div className="cap-esbas-meta">CURSO FUNDACIONAL DEL CGBVP</div>
        <h3 className="cap-esbas-title">Escuela Básica de Bomberos (ESBAS)</h3>
        <p className="cap-esbas-desc">
          Obligatorio para postulantes y aspirantes. Disponible de forma libre para bomberos
          que deseen repasar los fundamentos del servicio voluntario.
        </p>

        <div className="cap-esbas-stats">
          <div className="cap-esbas-stat">
            <div className="cap-esbas-stat-label">ESTADO</div>
            {esbas.status === 'completado' ? (
              <div className="cap-esbas-stat-value cap-esbas-stat-value--ok">
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                Completado
              </div>
            ) : esbas.status === 'en_curso' ? (
              <div className="cap-esbas-stat-value cap-esbas-stat-value--brass">En curso</div>
            ) : (
              <div className="cap-esbas-stat-value">No iniciado</div>
            )}
          </div>
          <div className="cap-esbas-stat">
            <div className="cap-esbas-stat-label">PROMOCIÓN</div>
            <div className="cap-esbas-stat-value cap-esbas-stat-value--brass mono">
              {promotionLabel}
            </div>
          </div>
          <div className="cap-esbas-stat">
            <div className="cap-esbas-stat-label">CALIFICACIÓN</div>
            <div className="cap-esbas-stat-value cap-esbas-stat-value--brass">
              {esbas.finalGrade ? `${Number(esbas.finalGrade).toFixed(1)} / 20` : '—'}
            </div>
          </div>
          <div className="cap-esbas-stat">
            <div className="cap-esbas-stat-label">HORAS</div>
            <div className="cap-esbas-stat-value mono">
              {esbas.completedHours != null
                ? `${esbas.completedHours}${esbas.totalHours ? ` / ${esbas.totalHours}` : ''} h`
                : esbas.totalHours
                  ? `${esbas.totalHours} h`
                  : '—'}
            </div>
          </div>
        </div>

        <div className="cap-esbas-actions">
          {esbas.status === 'completado' && (
            <button className="btn btn--ghost" type="button" title="Disponible en una próxima entrega">
              <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
              Descargar certificado
            </button>
          )}
          <Link
            href={`/capacitacion/${esbas.slug}`}
            className="btn btn--ghost"
            style={{ textDecoration: 'none' }}
          >
            {esbas.status === 'completado' ? 'Repasar lecciones' :
             esbas.status === 'en_curso' ? 'Continuar' : 'Ver curso'}
          </Link>
        </div>
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════════════
// LibraryItem
// ═══════════════════════════════════════════════════════════════════

const LIBRARY_CATEGORY_LABELS: Record<string, string> = {
  reglamentos: 'REGLAMENTOS',
  manuales: 'MANUALES',
  procedimientos: 'PROCEDIMIENTOS',
  normativa_externa: 'NORMATIVA EXTERNA',
  fichas_tecnicas: 'FICHAS TÉCNICAS',
  general: 'GENERAL',
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatMimeType(mime: string | null): string {
  if (!mime) return 'PDF'
  if (mime.includes('pdf')) return 'PDF'
  if (mime.includes('word')) return 'DOCX'
  if (mime.includes('excel') || mime.includes('sheet')) return 'XLSX'
  return mime.split('/')[1]?.toUpperCase() ?? 'ARCHIVO'
}

function formatUploadMonth(d: Date): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return `${meses[d.getMonth()]} ${d.getFullYear()}`
}

function LibraryItem({ doc }: { doc: LibraryCardData }) {
  const sizeStr = formatFileSize(doc.fileSizeBytes)
  const mimeStr = formatMimeType(doc.mimeType)

  return (
    <a
      href={`/api/library/${doc.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="cap-library-item"
    >
      <div className="cap-library-icon">
        <FileText className="w-5 h-5" strokeWidth={1.5} />
      </div>
      <div>
        <div className="cap-library-category mono">
          {LIBRARY_CATEGORY_LABELS[doc.category] ?? doc.category.toUpperCase()}
        </div>
        <div className="cap-library-title">{doc.title}</div>
        <div className="cap-library-meta">
          {mimeStr}
          {sizeStr && ` · ${sizeStr}`}
          {` · ${formatUploadMonth(doc.uploadedAt)}`}
        </div>
      </div>
      <div className="cap-library-action">
        <ChevronRight className="w-4 h-4" strokeWidth={1.8} />
      </div>
    </a>
  )
}
