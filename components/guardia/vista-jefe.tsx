"use client"

import { useState, useTransition } from 'react'
import { X, Check, RotateCcw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { GuardiaData, JefeDashboardItem } from '@/lib/guardia-nocturna/get-guardia-data'
import { toggleBedStatus, markReservationStatus, cancelReservation } from '@/lib/guardia-nocturna/actions'

const MESES_CORTOS_UPPER = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function capitalize(s: string | null | undefined): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const GRADE_LABEL_SHORT: Record<string, string> = {
  aspirante: 'Aspirante',
  seccionario: 'Seccionario',
  subteniente: 'Subteniente',
  teniente: 'Teniente',
  capitan: 'Capitán',
  teniente_brigadier: 'Ten. Brigadier',
  brigadier: 'Brigadier',
  brigadier_mayor: 'Brig. Mayor',
  brigadier_general: 'Brig. General',
}

export function VistaJefe({ data }: { data: GuardiaData }) {
  const isFemale = data.dormitory.gender === 'femenino'
  const sealLabel = isFemale ? 'JGF' : 'JGM'
  const cargoLabel = isFemale ? 'Jefa de Guardia Femenina' : 'Jefe de Guardia Masculina'

  // Calcular ocupación media del dormitorio
  const occupancy = data.monthStats.length > 0
    ? Math.round(
        data.monthStats.reduce((acc, s) => acc + s.reserved, 0) / data.monthStats.length,
      )
    : 0

  return (
    <section>
      {/* Banner de cargo */}
      <div className="jefe-banner">
        <div className="jefe-banner-seal">{sealLabel}</div>
        <div className="jefe-banner-body">
          <div className="jefe-banner-label mono">CARGO ACTIVO</div>
          <div className="jefe-banner-title">{cargoLabel}</div>
          <div className="jefe-banner-sub">
            Usted puede configurar camas, verificar reservas y marcar asistencia de las
            guardias del {data.dormitory.name}.
          </div>
        </div>
        <div className="jefe-banner-stats">
          <div>
            <div className="jefe-banner-stat-value mono">{data.dormitory.totalBeds}</div>
            <div className="jefe-banner-stat-label">camas totales</div>
          </div>
          <div>
            <div className="jefe-banner-stat-value mono">{occupancy}</div>
            <div className="jefe-banner-stat-label">ocupación media</div>
          </div>
        </div>
      </div>

      {/* Configuración del dormitorio */}
      <ConfigPanel data={data} />

      {/* Reservas activas */}
      <ReservasPanel items={data.jefeUpcoming ?? []} />
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Panel de configuración de camas
// ═══════════════════════════════════════════════════════════════════

function ConfigPanel({ data }: { data: GuardiaData }) {
  const [pending, startTransition] = useTransition()
  const [toggling, setToggling] = useState<string | null>(null)

  const allBeds: Array<{
    id: string
    number: number
    position: string | null
    status: string
    unavailableReason: string | null
    bunkLabel: string | null
  }> = []
  for (const bunk of data.dormitory.bunks) {
    for (const bed of bunk.beds) {
      allBeds.push({
        id: bed.bed.bedId,
        number: bed.bed.number,
        position: bed.bed.position,
        status: bed.bed.status,
        unavailableReason: bed.bed.unavailableReason,
        bunkLabel: bunk.label,
      })
    }
  }
  for (const bed of data.dormitory.looseBeds) {
    allBeds.push({
      id: bed.bed.bedId,
      number: bed.bed.number,
      position: bed.bed.position,
      status: bed.bed.status,
      unavailableReason: bed.bed.unavailableReason,
      bunkLabel: null,
    })
  }
  allBeds.sort((a, b) => a.number - b.number)

  const handleToggle = (bedId: string, currentStatus: string) => {
    const reason = currentStatus === 'disponible'
      ? prompt('Motivo de indisponibilidad:')
      : undefined
    if (currentStatus === 'disponible' && (!reason || !reason.trim())) {
      toast.error('Debe indicar un motivo')
      return
    }
    setToggling(bedId)
    startTransition(async () => {
      const res = await toggleBedStatus({
        bedId,
        reason: reason?.trim(),
      })
      setToggling(null)
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success(
          res.newStatus === 'indisponible'
            ? 'Cama marcada como fuera de servicio'
            : 'Cama restaurada',
        )
      }
    })
  }

  return (
    <div className="jefe-panel">
      <div className="jefe-panel-header">
        <div>
          <h3 className="jefe-panel-title">Configuración del dormitorio</h3>
          <p className="jefe-panel-sub">
            Agregue o quite camas, marque indisponibilidades temporales. Los cambios se
            aplican a partir del día siguiente.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost"
          title="La gestión de camarotes se habilita en una próxima entrega"
          disabled
        >
          <span>Agregar camarote</span>
        </button>
      </div>

      {allBeds.length === 0 ? (
        <div className="guardia-empty">
          Aún no se han configurado camas en este dormitorio. Contacte a Administración.
        </div>
      ) : (
        <div className="jefe-bunks-table">
          <div className="jefe-bunk-row jefe-bunk-row--header">
            <div>CAMAROTE</div>
            <div>CAMA N.°</div>
            <div>POSICIÓN</div>
            <div>ESTADO</div>
            <div>MOTIVO</div>
            <div />
          </div>

          {allBeds.map((bed) => {
            const isUnavailable = bed.status === 'indisponible'
            const rowClass = isUnavailable
              ? 'jefe-bunk-row jefe-bunk-row--unavailable'
              : 'jefe-bunk-row'
            return (
              <div key={bed.id} className={rowClass}>
                <div className="mono jefe-bunk-label">{bed.bunkLabel ?? '—'}</div>
                <div className="mono">{String(bed.number).padStart(2, '0')}</div>
                <div>{capitalize(bed.position)}</div>
                <div>
                  <span
                    className={`jefe-bed-status ${
                      isUnavailable ? 'jefe-bed-status--out' : 'jefe-bed-status--ok'
                    }`}
                  >
                    {isUnavailable ? 'Fuera de servicio' : 'Disponible'}
                  </span>
                </div>
                <div className="jefe-bunk-reason">{bed.unavailableReason ?? '—'}</div>
                <div className="jefe-bunk-actions">
                  <button
                    type="button"
                    className={`jefe-action-btn ${isUnavailable ? 'jefe-action-btn--restore' : ''}`}
                    onClick={() => handleToggle(bed.id, bed.status)}
                    disabled={pending && toggling === bed.id}
                    title={isUnavailable ? 'Restaurar' : 'Marcar fuera de servicio'}
                  >
                    {isUnavailable ? (
                      <RotateCcw className="w-3 h-3" strokeWidth={1.8} />
                    ) : (
                      <X className="w-3 h-3" strokeWidth={1.8} />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Panel de reservas
// ═══════════════════════════════════════════════════════════════════

function ReservasPanel({ items }: { items: JefeDashboardItem[] }) {
  const [pending, startTransition] = useTransition()
  const [acting, setActing] = useState<string | null>(null)

  const handleMark = (id: string, status: 'cumplida' | 'no_asistio') => {
    setActing(id)
    startTransition(async () => {
      const res = await markReservationStatus(id, status)
      setActing(null)
      if (!res.ok) toast.error(res.error)
      else toast.success(status === 'cumplida' ? 'Asistencia registrada' : 'Inasistencia registrada')
    })
  }

  const handleCancel = (id: string) => {
    if (!confirm('¿Cancelar esta reserva?')) return
    setActing(id)
    startTransition(async () => {
      const res = await cancelReservation(id)
      setActing(null)
      if (!res.ok) toast.error(res.error)
      else toast.success('Reserva cancelada')
    })
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="jefe-panel">
      <div className="jefe-panel-header">
        <div>
          <h3 className="jefe-panel-title">Reservas activas del dormitorio</h3>
          <p className="jefe-panel-sub">
            Próximas guardias reservadas. Verifique asistencia al momento del check-in.
          </p>
        </div>
        <div className="jefe-panel-filter mono">Últimos 3 días + próximos 7</div>
      </div>

      {items.length === 0 ? (
        <div className="guardia-empty">
          No hay reservas activas en el rango de fechas.
        </div>
      ) : (
        <div className="jefe-reservas-list">
          {items.map((r) => {
            const d = parseIso(r.date)
            const isPast = r.date < today
            const statusClass = `jefe-reserva-status ${
              r.status === 'cumplida'
                ? 'jefe-reserva-status--completed'
                : r.status === 'cancelada'
                  ? 'jefe-reserva-status--cancelled'
                  : 'jefe-reserva-status--pending'
            }`
            const statusLabel = r.status === 'cumplida'
              ? 'CUMPLIDA'
              : r.status === 'cancelada'
                ? 'CANCELADA'
                : r.status === 'no_asistio'
                  ? 'NO ASISTIÓ'
                  : 'PENDIENTE'

            const gradeLabel = GRADE_LABEL_SHORT[r.profile.grade] ?? r.profile.grade
            const canMarkAttendance = r.status === 'activa' && !isPast
            const canCancel = r.status === 'activa'

            return (
              <div key={r.id} className="jefe-reserva-item">
                <div className={`jefe-reserva-date ${isPast ? 'jefe-reserva-date--past' : ''}`}>
                  <div className="jefe-reserva-day mono">{d.getDate()}</div>
                  <div className="jefe-reserva-month">{MESES_CORTOS_UPPER[d.getMonth()]}</div>
                </div>
                <div className="jefe-reserva-body">
                  <div className="jefe-reserva-name">
                    {gradeLabel} {shortenForList(r.profile.fullName)}
                  </div>
                  <div className="jefe-reserva-meta mono">
                    {r.profile.codigoCgbvp ? `${r.profile.codigoCgbvp} · ` : ''}
                    Cama {String(r.bedNumber).padStart(2, '0')}
                    {r.bunkLabel && ` · Camarote ${r.bunkLabel}`}
                    {r.position && ` ${r.position}`}
                  </div>
                </div>
                <div className={statusClass}>
                  {r.status === 'cumplida' && <Check className="w-2.5 h-2.5" strokeWidth={2.5} />}
                  {statusLabel}
                </div>
                <div className="jefe-reserva-actions">
                  {canMarkAttendance && (
                    <>
                      <button
                        type="button"
                        className="jefe-action-btn jefe-action-btn--restore"
                        onClick={() => handleMark(r.id, 'cumplida')}
                        disabled={pending && acting === r.id}
                        title="Marcar como cumplida"
                      >
                        <Check className="w-3 h-3" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        className="jefe-action-btn"
                        onClick={() => handleMark(r.id, 'no_asistio')}
                        disabled={pending && acting === r.id}
                        title="Marcar inasistencia"
                      >
                        <AlertCircle className="w-3 h-3" strokeWidth={2} />
                      </button>
                    </>
                  )}
                  {canCancel && (
                    <button
                      type="button"
                      className="jefe-action-btn"
                      onClick={() => handleCancel(r.id)}
                      disabled={pending && acting === r.id}
                      title="Cancelar reserva"
                    >
                      <X className="w-3 h-3" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function shortenForList(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) return fullName
  const apellidos = parts[0].trim()
  const nombres = parts[1].trim().split(/\s+/)
  const primerNombre = nombres[0] ?? ''
  return `${apellidos}, ${primerNombre}`
}
