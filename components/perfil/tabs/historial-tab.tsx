"use client"

import type { PerfilData } from '@/lib/perfil/get-perfil-data'
import { formatMonthYear } from '../format'

const TRIMESTER_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  al_dia: { label: 'Al día', className: 'trimester-metric-value trimester-metric-value--ok' },
  riesgo: { label: 'En riesgo', className: 'trimester-metric-value' },
  incumple: { label: 'En incumplimiento', className: 'trimester-metric-value' },
}

const EMERGENCY_CODE_LABEL: Record<string, string> = {
  incendio: 'INC',
  medica: 'EMG',
  rescate: 'RES',
  otro: 'OTR',
}

function formatEmergencyDate(d: Date | null): string {
  if (!d) return '—'
  const dd = new Date(d)
  return dd.toISOString().slice(0, 10)
}

export function HistorialTab({ data }: { data: PerfilData }) {
  const { trimester, attendanceRecent, recentEmergencies } = data
  const statusInfo = TRIMESTER_STATUS_LABEL[trimester.status]
  const markerLeft = `${Math.min(100, Math.max(0, trimester.percentage))}%`

  return (
    <>
      {/* Dashboard trimestre */}
      <div className="profile-card profile-card--featured">
        <div className="profile-card-bracket profile-card-bracket--tl" />
        <div className="profile-card-bracket profile-card-bracket--tr" />
        <div className="profile-card-bracket profile-card-bracket--bl" />
        <div className="profile-card-bracket profile-card-bracket--br" />

        <div className="trimester-header">
          <div className="trimester-title">
            <span className="trimester-label">CUMPLIMIENTO REGLAMENTARIO</span>
            <span className="trimester-period">{trimester.quarterLabel}</span>
          </div>
          <div className="trimester-countdown">
            <span className="trimester-countdown-value mono">{trimester.daysRemaining}</span>
            <span className="trimester-countdown-unit">días restantes</span>
          </div>
        </div>

        <div className="trimester-main">
          <div className="trimester-progress">
            <div className="trimester-progress-track">
              <div
                className="trimester-progress-fill"
                style={{ width: `${trimester.percentage}%` }}
              />
              <div
                className="trimester-progress-marker"
                style={{ left: markerLeft }}
              >
                <span className="trimester-progress-value mono">
                  {trimester.hoursAccumulated} h
                </span>
              </div>
            </div>
            <div className="trimester-progress-labels">
              <span>0 h</span>
              <span className="trimester-progress-label-target">Meta: {trimester.hoursTarget} h</span>
            </div>
          </div>

          <div className="trimester-metrics">
            <div className="trimester-metric">
              <span className="trimester-metric-label">HORAS ACUMULADAS</span>
              <span className="trimester-metric-value mono">{trimester.hoursAccumulated} h</span>
            </div>
            <div className="trimester-metric">
              <span className="trimester-metric-label">HORAS RESTANTES</span>
              <span className="trimester-metric-value mono">{trimester.hoursRemaining} h</span>
            </div>
            <div className="trimester-metric">
              <span className="trimester-metric-label">PROYECCIÓN AL CIERRE</span>
              <span
                className={`trimester-metric-value mono ${
                  trimester.projection >= trimester.hoursTarget
                    ? 'trimester-metric-value--ok'
                    : ''
                }`}
              >
                {trimester.projection} h
              </span>
            </div>
            <div className="trimester-metric">
              <span className="trimester-metric-label">ESTADO</span>
              <span className={statusInfo?.className ?? 'trimester-metric-value'}>
                {statusInfo?.label ?? '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Historial mensual + últimas emergencias */}
      <div className="profile-grid profile-grid--two">
        <div className="profile-card">
          <div className="profile-card-header">
            <h3>Últimos meses</h3>
          </div>

          {attendanceRecent.length === 0 ? (
            <div className="profile-card-note">
              <span>Aún no hay registros de asistencia.</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>MES</th>
                    <th>DÍAS</th>
                    <th>GUARDIAS</th>
                    <th>HORAS</th>
                    <th>EMERG.</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecent.slice(0, 8).map((a, idx) => (
                    <tr key={a.id}>
                      <td>
                        {idx === 0 ? (
                          <strong>{formatMonthYear(a.mes, a.anio)}</strong>
                        ) : (
                          formatMonthYear(a.mes, a.anio)
                        )}
                      </td>
                      <td className="mono">{a.diasAsistidos ?? 0}</td>
                      <td className="mono">{a.diasGuardia ?? 0}</td>
                      <td className="mono">{a.horasAcumuladas ?? 0}</td>
                      <td className="mono">{a.numEmergencias ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="profile-card">
          <div className="profile-card-header">
            <h3>Últimas emergencias atendidas</h3>
          </div>

          {recentEmergencies.length === 0 ? (
            <div className="profile-card-note">
              <span>
                Aún no ha sido registrado al mando de ninguna emergencia.
              </span>
            </div>
          ) : (
            <div className="emergency-list">
              {recentEmergencies.map((e) => (
                <div key={e.id} className="emergency-item">
                  <div className={`emergency-item-type emergency-item-type--${e.tipoCodigo}`}>
                    {EMERGENCY_CODE_LABEL[e.tipoCodigo]}
                  </div>
                  <div className="emergency-item-body">
                    <div className="emergency-item-title">
                      {e.tipo ?? 'Emergencia'}
                    </div>
                    <div className="emergency-item-meta mono">
                      {formatEmergencyDate(e.fechaDespacho)}
                      {e.numeroParte && ` · parte ${e.numeroParte}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
