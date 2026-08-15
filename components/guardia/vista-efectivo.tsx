"use client"

import { useState, useMemo, useTransition } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type {
  GuardiaData,
  BedWithReservation,
  DayReservationStats,
} from '@/lib/guardia-nocturna/get-guardia-data'
import { reserveBed, cancelReservation } from '@/lib/guardia-nocturna/actions'

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function isoToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatIsoDay(iso: string): string {
  const d = parseIso(iso)
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return `${days[d.getDay()]} ${d.getDate()} · ${MESES_LARGOS[d.getMonth()]} · ${d.getFullYear()}`
}

/** Devuelve el weekday con lunes = 0, domingo = 6 */
function mondayFirstWeekday(d: Date): number {
  const js = d.getDay() // 0=domingo
  return (js + 6) % 7
}

export function VistaEfectivo({ data }: { data: GuardiaData }) {
  const [selectedDate, setSelectedDate] = useState(data.selectedDate)
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const today = isoToday()
  const isPast = selectedDate < today

  // Map indice date → stat
  const statsByDate = useMemo(() => {
    const m = new Map<string, DayReservationStats>()
    for (const s of data.monthStats) m.set(s.date, s)
    return m
  }, [data.monthStats])

  // Reserva del usuario en la fecha seleccionada
  const mineOnSelected = useMemo(() => {
    for (const bunk of data.dormitory.bunks) {
      for (const bed of bunk.beds) {
        if (bed.isMine && bed.bed.bedId && bed.reservation && selectedDate === data.selectedDate) {
          return bed
        }
      }
    }
    for (const bed of data.dormitory.looseBeds) {
      if (bed.isMine && bed.reservation && selectedDate === data.selectedDate) return bed
    }
    return null
  }, [data, selectedDate])

  // Helpers de UI
  const selectedStats = statsByDate.get(selectedDate)
  const reservedCount = selectedStats?.reserved ?? 0

  const handleBedClick = (bed: BedWithReservation) => {
    if (bed.bed.status === 'indisponible') return
    if (bed.reservation && !bed.isMine) return
    if (bed.isMine) {
      // Click en mi reserva → seleccionada para cancelar
      setSelectedBedId(bed.bed.bedId)
      return
    }
    // Seleccionar para reservar
    setSelectedBedId(bed.bed.bedId)
  }

  const handleConfirm = () => {
    if (!selectedBedId) {
      toast.error('Seleccione una cama primero')
      return
    }
    startTransition(async () => {
      // Find bunkId and dormId for the selected bed
      let bunkId = ''
      for (const bunk of data.dormitory.bunks) {
        const found = bunk.beds.find(b => b.bed.bedId === selectedBedId)
        if (found) { bunkId = bunk.bunkId; break }
      }
      const res = await fetch('/api/guard/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedId: selectedBedId, bunkId, dormId: data.dormitory.id, date: selectedDate }),
      }).then(r => r.json())
      if (!res.ok) {
        toast.error(res.error || 'Error al reservar')
      } else {
        toast.success('Reserva confirmada')
        setSelectedBedId(null)
        window.location.href = `/guardia-nocturna?date=${selectedDate}`
      }
    })
  }

  const handleCancel = () => {
    if (!mineOnSelected?.reservation) {
      toast.error('No tiene reserva para esta fecha')
      return
    }
    startTransition(async () => {
      const res = await cancelReservation(mineOnSelected.reservation!.id)
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success('Reserva cancelada')
        setSelectedBedId(null)
      }
    })
  }

  // Construir el grid del calendario
  const [year, month] = data.monthYear.split('-').map(Number)
  const firstDayOfMonth = new Date(year, month - 1, 1)
  const lastDayOfMonth = new Date(year, month, 0).getDate()
  const leadingPad = mondayFirstWeekday(firstDayOfMonth)

  // Próxima reserva (del data.stats)
  const next = data.stats.nextReservation
  let nextDayLabel = '—'
  let nextDateLabel = '—'
  if (next) {
    const d = parseIso(next.date)
    const diaSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()]
    nextDayLabel = diaSemana
    nextDateLabel = `${d.getDate().toString().padStart(2, '0')} · ${MESES_CORTOS[d.getMonth()].toUpperCase()}`
  }

  return (
    <section>
      {/* Stats */}
      <div className="guardia-stats">
        <div className="guardia-stat-card guardia-stat-card--next">
          <div className="guardia-stat-label">PRÓXIMA GUARDIA</div>
          <div className="guardia-stat-value">
            {next ? (
              <>
                <span className="guardia-stat-value-num">{nextDayLabel}</span>
                <span className="guardia-stat-value-date mono">{nextDateLabel}</span>
              </>
            ) : (
              <span className="guardia-stat-value-unit">Sin reservas próximas</span>
            )}
          </div>
          {next && (
            <div className="guardia-stat-detail">
              <span className="guardia-detail-label">Cama reservada</span>
              <span className="guardia-detail-value mono">
                N.° {String(next.bedNumber).padStart(2, '0')}
                {next.bunkLabel && ` · Camarote ${next.bunkLabel}`}
                {next.position && ` · ${next.position}`}
              </span>
            </div>
          )}
        </div>

        <div className="guardia-stat-card">
          <div className="guardia-stat-label">ESTE MES</div>
          <div className="guardia-stat-value">
            <span className="guardia-stat-value-num mono">{data.stats.completedThisMonth}</span>
            <span className="guardia-stat-value-unit">guardias cumplidas</span>
          </div>
        </div>

        <div className="guardia-stat-card">
          <div className="guardia-stat-label">PENDIENTES</div>
          <div className="guardia-stat-value">
            <span className="guardia-stat-value-num mono">{data.stats.pendingReservations}</span>
            <span className="guardia-stat-value-unit">reservas activas</span>
          </div>
        </div>

        <div className="guardia-stat-card">
          <div className="guardia-stat-label">HORAS ACREDITADAS</div>
          <div className="guardia-stat-value">
            <span className="guardia-stat-value-num mono">{data.stats.hoursCreditedThisMonth}</span>
            <span className="guardia-stat-value-unit">
              horas · {MESES_LARGOS[new Date().getMonth()].toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Main: calendario + camas */}
      <div className="guardia-main">
        {/* Calendario */}
        <div className="guardia-calendar-card">
          <div className="guardia-card-header">
            <div>
              <h3 className="guardia-card-title">Disponibilidad del mes</h3>
              <p className="guardia-card-sub">
                Seleccione una fecha para ver camas disponibles y reservar
              </p>
            </div>
            <div className="guardia-calendar-nav">
              <button className="guardia-nav-btn" disabled title="Próximamente">
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <span className="guardia-nav-month">{data.monthLabel}</span>
              <button className="guardia-nav-btn" disabled title="Próximamente">
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="guardia-calendar">
            {DOW.map((d, i) => (
              <div key={`dow-${i}`} className="guardia-calendar-dow">
                {d}
              </div>
            ))}
            {Array.from({ length: leadingPad }).map((_, i) => (
              <div key={`pad-${i}`} className="cal-day cal-day--pad" />
            ))}
            {Array.from({ length: lastDayOfMonth }).map((_, i) => {
              const day = i + 1
              const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const stat = statsByDate.get(iso)
              const isTodayDay = iso === today
              const isPastDay = iso < today
              const isSelected = iso === selectedDate
              const isFull = stat?.isFull ?? false
              const hasMine = stat?.hasMineReservation ?? false

              let cls = 'cal-day'
              if (isPastDay) cls += ' cal-day--past'
              if (isTodayDay && !isSelected) cls += ' cal-day--today'
              if (isSelected) cls += ' cal-day--selected'
              if (!isPastDay && !isFull && !isSelected && !isTodayDay) cls += ' cal-day--available'
              if (isFull && !isSelected && !isPastDay) cls += ' cal-day--full'
              if (hasMine) cls += ' cal-day--mine'

              return (
                <button
                  key={iso}
                  className={cls}
                  onClick={() => {
                    if (isPastDay) return
                    window.location.href = `/guardia-nocturna?date=${iso}`
                  }}
                  disabled={isPastDay}
                  type="button"
                >
                  {day}
                  {hasMine && <span className="cal-day-dot" />}
                </button>
              )
            })}
          </div>

          <div className="guardia-calendar-legend">
            <div className="legend-item">
              <span className="legend-box legend-box--selected" />
              <span>Seleccionada</span>
            </div>
            <div className="legend-item">
              <span className="legend-box legend-box--mine" />
              <span>Mis reservas</span>
            </div>
            <div className="legend-item">
              <span className="legend-box legend-box--available" />
              <span>Con cupo</span>
            </div>
            <div className="legend-item">
              <span className="legend-box legend-box--full" />
              <span>Sin cupo</span>
            </div>
            <div className="legend-item">
              <span className="legend-box legend-box--past" />
              <span>Pasada</span>
            </div>
          </div>
        </div>

        {/* Panel camas */}
        <div className="guardia-beds-panel">
          <div className="profile-card-bracket profile-card-bracket--tl" />
          <div className="profile-card-bracket profile-card-bracket--tr" />
          <div className="profile-card-bracket profile-card-bracket--bl" />
          <div className="profile-card-bracket profile-card-bracket--br" />

          <div className="guardia-card-header">
            <div>
              <h3 className="guardia-card-title">{formatIsoDay(selectedDate)}</h3>
              <p className="guardia-card-sub">
                {data.dormitory.name} · {reservedCount} de {data.dormitory.totalBeds} camas reservadas
              </p>
            </div>
          </div>

          {data.dormitory.totalBeds === 0 ? (
            <div className="guardia-empty">
              Aún no hay camas configuradas en este dormitorio. Contacte al Jefe de Guardia.
            </div>
          ) : (
            <div className="beds-grid">
              {data.dormitory.bunks.map((bunk) => (
                <div key={bunk.id} className="bunk">
                  <div className="bunk-label mono">Camarote {bunk.label}</div>
                  <div className="bunk-beds">
                    {bunk.beds.map((bed) => (
                      <BedButton
                        key={bed.bed.bedId}
                        bed={bed}
                        isSelected={selectedBedId === bed.bed.bedId}
                        disabled={isPast || pending}
                        onClick={() => handleBedClick(bed)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {data.dormitory.looseBeds.length > 0 && (
                <div className="bunk">
                  <div className="bunk-label mono">Camas sueltas</div>
                  <div className="bunk-beds">
                    {data.dormitory.looseBeds.map((bed) => (
                      <BedButton
                        key={bed.bed.bedId}
                        bed={bed}
                        isSelected={selectedBedId === bed.bed.bedId}
                        disabled={isPast || pending}
                        onClick={() => handleBedClick(bed)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="guardia-beds-footer">
            <div className="guardia-legend-inline">
              <span className="legend-item">
                <span className="legend-dot legend-dot--available" />Disponible
              </span>
              <span className="legend-item">
                <span className="legend-dot legend-dot--reserved" />Reservada
              </span>
              <span className="legend-item">
                <span className="legend-dot legend-dot--unavailable" />Fuera de servicio
              </span>
            </div>

            <div className="guardia-actions">
              {mineOnSelected?.reservation && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={handleCancel}
                  disabled={pending || isPast}
                >
                  {pending ? 'Cancelando…' : 'Cancelar reserva'}
                </button>
              )}
              {!mineOnSelected?.reservation && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleConfirm}
                  disabled={pending || isPast || !selectedBedId}
                >
                  {pending ? 'Confirmando…' : 'Confirmar reserva'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function BedButton({
  bed,
  isSelected,
  disabled,
  onClick,
}: {
  bed: BedWithReservation
  isSelected: boolean
  disabled: boolean
  onClick: () => void
}) {
  const { bed: b, reservation, isMine } = bed
  const isUnavailable = b.status === 'indisponible'
  const isReservedByOther = !!reservation && !isMine

  let cls = 'bed'
  if (isUnavailable) cls += ' bed--unavailable'
  else if (isMine) cls += ' bed--reserved'
  else if (reservation) cls += ' bed--reserved'
  else cls += ' bed--available'
  if (isSelected && !isUnavailable) cls += ' bed--selected'

  const isDisabled = disabled || isUnavailable || isReservedByOther

  const statusLabel = isUnavailable
    ? 'Fuera de servicio'
    : isSelected
      ? 'Seleccionada'
      : isMine
        ? 'Su reserva'
        : reservation
          ? 'Reservada'
          : 'Disponible'

  const reservedBy = reservation && !isMine
    ? lastNameCode(reservation.profileName)
    : isUnavailable
      ? b.unavailableReason ?? 'Indisponible'
      : null

  return (
    <button
      type="button"
      className={cls}
      disabled={isDisabled}
      onClick={onClick}
    >
      {isSelected && !isMine && (
        <span className="bed-selected-badge">
          <Check className="w-2.5 h-2.5" strokeWidth={3} />
          SELECCIONADA
        </span>
      )}
      {isMine && (
        <span className="bed-mine-badge">
          <Check className="w-2.5 h-2.5" strokeWidth={3} />
          MI RESERVA
        </span>
      )}
      <div className="bed-number mono">{String(b.number).padStart(2, '0')}</div>
      {b.position && <div className="bed-position">{capitalize(b.position)}</div>}
      <div className="bed-status-label">{statusLabel}</div>
      {reservedBy && <div className="bed-reserved-by mono">{reservedBy}</div>}
    </button>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Extrae apellido + inicial: "TORRES LÓPEZ, Andrea" → "TORRES L." */
function lastNameCode(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) return fullName.split(' ').slice(0, 2).join(' ')
  const apellidos = parts[0].trim().split(/\s+/)
  const primerApellido = apellidos[0] ?? ''
  const inicialSegundoApellido = apellidos[1]?.charAt(0) ?? ''
  return inicialSegundoApellido
    ? `${primerApellido} ${inicialSegundoApellido}.`
    : primerApellido
}
