"use client"

import { CheckCircle2, Clock, Download, Plus } from 'lucide-react'
import type { PerfilData } from '@/lib/perfil/get-perfil-data'
import { formatShortDate } from '../format'

export function FormacionTab({ data }: { data: PerfilData }) {
  const completed = data.enrolledCourses.filter((e) => e.status === 'completada')
  const inProgress = data.enrolledCourses.filter((e) => e.status === 'activa')

  // Cálculo aproximado: suma duración de los completados
  const totalHours = completed.reduce((acc, e) => acc + (e.course.durationHours ?? 0), 0)

  return (
    <>
      {/* Stats */}
      <div className="formation-stats">
        <div className="formation-stat">
          <div className="formation-stat-value mono">{completed.length}</div>
          <div className="formation-stat-label">CURSOS COMPLETADOS</div>
        </div>
        <div className="formation-stat">
          <div className="formation-stat-value mono">{inProgress.length}</div>
          <div className="formation-stat-label">EN PROGRESO</div>
        </div>
        <div className="formation-stat">
          <div className="formation-stat-value mono">{totalHours}</div>
          <div className="formation-stat-label">HORAS ACUMULADAS</div>
        </div>
      </div>

      {/* Cursos completados */}
      <div className="profile-card">
        <div className="profile-card-header">
          <h3>Cursos completados</h3>
        </div>

        {completed.length === 0 ? (
          <div className="profile-card-note">
            <span>Aún no ha completado ningún curso.</span>
          </div>
        ) : (
          <div className="course-history">
            {completed.map((e) => (
              <div key={e.id} className="course-item course-item--certified">
                <div className="course-item-icon">
                  <CheckCircle2 className="w-5 h-5" strokeWidth={1.6} />
                </div>
                <div className="course-item-body">
                  <div className="course-item-head">
                    <span className="course-item-title">{e.course.title}</span>
                    {e.finalGrade != null && (
                      <span className="course-item-grade mono">{Number(e.finalGrade).toFixed(1)}/20</span>
                    )}
                  </div>
                  <div className="course-item-sub">{e.course.subtitle ?? e.course.description ?? ''}</div>
                  <div className="course-item-meta">
                    <span>Completado {formatShortDate(e.completedAt)}</span>
                    {e.course.durationHours && (
                      <>
                        <span className="course-item-sep">·</span>
                        <span>{e.course.durationHours} horas</span>
                      </>
                    )}
                  </div>
                </div>
                {e.certificateKey && (
                  <button className="course-item-action" type="button">
                    <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
                    Certificado
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* En progreso */}
      {inProgress.length > 0 && (
        <div className="profile-card" style={{ marginTop: 20 }}>
          <div className="profile-card-header">
            <h3>En progreso</h3>
          </div>

          <div className="course-history">
            {inProgress.map((e) => (
              <div key={e.id} className="course-item course-item--progress">
                <div className="course-item-icon">
                  <Clock className="w-5 h-5" strokeWidth={1.6} />
                </div>
                <div className="course-item-body">
                  <div className="course-item-head">
                    <span className="course-item-title">{e.course.title}</span>
                    <span className="course-item-progress-label">En curso</span>
                  </div>
                  <div className="course-item-sub">{e.course.subtitle ?? e.course.description ?? ''}</div>
                  {/* TODO: barra real cuando haya cálculo de progreso por lecciones */}
                  <div className="course-progress-bar">
                    <div className="course-progress-fill" style={{ width: '0%' }} />
                  </div>
                  <div className="course-item-meta">
                    <span>Inició {formatShortDate(e.enrolledAt)}</span>
                    {e.course.durationHours && (
                      <>
                        <span className="course-item-sep">·</span>
                        <span>{e.course.durationHours} horas</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificados externos (placeholder — feature futuro) */}
      <div className="profile-card" style={{ marginTop: 20 }}>
        <div className="profile-card-header">
          <h3>Certificados externos</h3>
          <button className="profile-edit-btn" type="button" title="Disponible en una próxima entrega">
            <Plus className="w-3 h-3" strokeWidth={2} />
            <span>Agregar</span>
          </button>
        </div>
        <div className="profile-card-note">
          <span>
            Aún no ha registrado certificados externos. Desde este panel podrá subir los obtenidos
            fuera del CGBVP (Cruz Roja, Defensa Civil, NFPA, otros).
          </span>
        </div>
      </div>
    </>
  )
}
