"use client"

import { Triangle, CheckCircle2, Circle, Check } from 'lucide-react'
import type { PerfilData } from '@/lib/perfil/get-perfil-data'
import { GRADE_LABEL } from '@/lib/cgbvp/grades'
import { formatShortDate, formatLongDate } from '../format'

type TimelineEntry = {
  grade: string
  date: Date | string
  description: string
  meta?: string
  isCurrent: boolean
}

function buildTimelineEntries(data: PerfilData): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  const { profile, statusHistory } = data

  // Grado actual (más reciente)
  entries.push({
    grade: GRADE_LABEL[profile.grade as keyof typeof GRADE_LABEL] ?? profile.grade,
    date: profile.joinDate ?? profile.createdAt ?? new Date(),
    description: `Situación actual: ${profile.status}. ${
      profile.esbasPromotion
        ? `Egresado de la promoción ${profile.esbasPromotion} de la ESBAS.`
        : ''
    }`.trim(),
    isCurrent: true,
  })

  // Historial (descartamos el duplicado del grado actual)
  for (const row of statusHistory) {
    if (!row.estadoNuevo) continue
    // Si coincide con el grado actual, no duplicamos
    if (row.estadoNuevo === profile.grade && entries[0].isCurrent) continue
    entries.push({
      grade: GRADE_LABEL[row.estadoNuevo as keyof typeof GRADE_LABEL] ?? row.estadoNuevo,
      date: row.createdAt ?? new Date(),
      description: row.estadoAnterior
        ? `Cambio de ${row.estadoAnterior} a ${row.estadoNuevo}.`
        : `Registrado como ${row.estadoNuevo}.`,
      meta: row.fuente ? `Fuente: ${row.fuente}` : undefined,
      isCurrent: false,
    })
  }

  return entries
}

export function AscensosTab({ data }: { data: PerfilData }) {
  const entries = buildTimelineEntries(data)
  const { nextGrade } = data

  return (
    <>
      <div className="timeline">
        {entries.map((entry, idx) => (
          <div
            key={idx}
            className={`timeline-item ${entry.isCurrent ? 'timeline-item--current' : ''}`}
          >
            <div
              className={`timeline-marker ${entry.isCurrent ? '' : 'timeline-marker--past'}`}
            >
              {entry.isCurrent ? (
                <Triangle className="w-3.5 h-3.5 fill-current" strokeWidth={2} />
              ) : (
                <Check className="w-3.5 h-3.5" strokeWidth={2} />
              )}
            </div>
            <div className="timeline-body">
              <div className="timeline-head">
                <span className="timeline-grade">{entry.grade}</span>
                <span className="timeline-date mono">{formatShortDate(entry.date)}</span>
              </div>
              <div className="timeline-desc">{entry.description}</div>
              {entry.meta && <div className="timeline-meta">{entry.meta}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Próximo ascenso */}
      {nextGrade.nextGrade && (
        <div className="next-grade-card">
          <div className="next-grade-header">
            <span className="next-grade-label">PRÓXIMO ASCENSO POSIBLE</span>
            {nextGrade.canApplyFrom && (
              <span className="next-grade-date mono">
                Disponible desde {formatLongDate(nextGrade.canApplyFrom)}
              </span>
            )}
          </div>

          <div>
            <div className="next-grade-name">{nextGrade.nextGradeLabel}</div>

            <div>
              {nextGrade.requirements.map((req, idx) => {
                const reqClass = `next-grade-requirement ${
                  req.met ? 'next-grade-requirement--ok' : 'next-grade-requirement--pending'
                }`
                return (
                  <div key={idx} className={reqClass}>
                    {req.met ? (
                      <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                    ) : (
                      <Circle className="w-3.5 h-3.5" strokeWidth={2} />
                    )}
                    <span>{req.label}</span>
                    <span
                      className={`req-status ${req.met ? '' : 'req-status--pending'} mono`}
                    >
                      {req.detail}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
