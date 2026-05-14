"use client"

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import Link from 'next/link'
import {
  Truck, HeartPulse, Wrench, Package, QrCode, Circle, Check,
  Activity, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { FaenaData, MachineInspectionCard } from '@/lib/faena/get-faena-data'
import { startOrContinueExecution } from '@/lib/faena/actions'
import type { MachineKind } from '@/lib/db/schema'
import type { ComponentType, SVGProps } from 'react'

const MACHINE_ICON: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  autobomba: Truck,
  ambulancia: HeartPulse,
  rescate: Wrench,
  auxiliar: Truck,
  cisterna: Truck,
  otra: Package,
}

const MACHINE_KIND_LABEL: Record<MachineKind, string> = {
  autobomba: 'Autobomba',
  ambulancia: 'Atención prehospitalaria',
  rescate: 'Unidad de rescate técnico',
  auxiliar: 'Unidad auxiliar',
  cisterna: 'Cisterna',
  otra: 'Otra',
}

export function InspeccionesTab({ data }: { data: FaenaData }) {
  const { shift, machinesToInspect, summary } = data

  return (
    <section>
      {/* Banner de turno */}
      <div className="turno-banner">
        <div className="turno-banner-pulse">
          <Activity className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="turno-banner-body">
          <div className="turno-banner-title">Turno en curso · {shift.label}</div>
          <div className="turno-banner-stats">
            <span className="turno-stat">
              <strong>{summary.pending}</strong> inspecciones pendientes
            </span>
            <span className="turno-stat turno-stat--ok">
              <strong>{summary.completed}</strong> completada{summary.completed === 1 ? '' : 's'}
            </span>
            {summary.inProgress > 0 && (
              <span className="turno-stat turno-stat--warn">
                <strong>{summary.inProgress}</strong> en curso
              </span>
            )}
          </div>
        </div>
        <div className="turno-banner-countdown">
          <span className="turno-countdown-label">QUEDAN</span>
          <span className="turno-countdown-value mono">{shift.remainingLabel}</span>
        </div>
      </div>

      <h2 className="faena-section-title">Máquinas del turno</h2>

      {machinesToInspect.length === 0 ? (
        <div className="guardia-empty">
          Aún no hay máquinas registradas en la compañía. Contacte al Jefe de Máquinas.
        </div>
      ) : (
        <div className="machine-grid">
          {machinesToInspect.map((card) => (
            <MachineCardUI key={card.machine.id} card={card} />
          ))}
        </div>
      )}
    </section>
  )
}

function MachineCardUI({ card }: { card: MachineInspectionCard }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const Icon = MACHINE_ICON[card.machine.kind] ?? Package
  const kindLabel = MACHINE_KIND_LABEL[card.machine.kind as MachineKind] ?? card.machine.kind

  const statusBadgeClass =
    card.status === 'completada'
      ? 'machine-card-status-badge machine-card-status-badge--ok'
      : card.status === 'en_curso'
        ? 'machine-card-status-badge machine-card-status-badge--progress'
        : 'machine-card-status-badge machine-card-status-badge--pending'

  const statusBadgeLabel =
    card.status === 'completada' ? 'COMPLETADA'
      : card.status === 'en_curso' ? 'EN CURSO'
      : 'PENDIENTE'

  const cardClass = cn(
    'machine-card',
    card.status === 'completada' && 'machine-card--completed',
    card.status === 'en_curso' && 'machine-card--progress',
    card.status === 'pendiente' && 'machine-card--pending',
  )

  const pctFill =
    card.totalCompartments > 0
      ? (card.verifiedCompartments / card.totalCompartments) * 100
      : 0
  const fillClass =
    card.status === 'completada' ? 'compart-progress-fill compart-progress-fill--ok'
      : card.status === 'en_curso' ? 'compart-progress-fill compart-progress-fill--warn'
      : 'compart-progress-fill'

  const handleStart = () => {
    // Este botón sin compartimiento específico inicia el primero pendiente.
    // Si no sabemos cuál, redirigimos al detalle de la máquina (futuro).
    // Por ahora, si hay en curso, intenta reanudarlo.
    toast.info('Escanee el QR del compartimiento para empezar')
  }

  return (
    <article className={cardClass}>
      <div className="machine-card-header">
        <div className="machine-card-icon">
          <Icon className="w-7 h-7" strokeWidth={1.4} />
        </div>
        <div className="machine-card-identity">
          <div className="machine-card-label mono">{card.machine.label}</div>
          <div className="machine-card-kind">{kindLabel}</div>
        </div>
        <div className={statusBadgeClass}>{statusBadgeLabel}</div>
      </div>

      <div className="machine-card-compartments">
        <div className="compart-row">
          <span className="compart-label mono">
            {card.totalCompartments} compartimiento{card.totalCompartments === 1 ? '' : 's'}
          </span>
          <span className="compart-sep">·</span>
          <span className="compart-label mono">
            {card.verifiedCompartments} / {card.totalCompartments} verificados
          </span>
        </div>
        <div className="compart-progress">
          <div className={fillClass} style={{ width: `${pctFill}%` }} />
        </div>
      </div>

      <div className="machine-card-footer">
        {card.status === 'completada' && card.lastCompletedBy ? (
          <div className="machine-card-scan-hint machine-card-scan-hint--ok">
            <Check className="w-3.5 h-3.5" strokeWidth={2} />
            <span>
              Verificada
              {card.lastCompletedAt && ` ${formatHourLabel(card.lastCompletedAt)}`}
              {` por ${shortName(card.lastCompletedBy)}`}
            </span>
          </div>
        ) : card.status === 'en_curso' ? (
          <div className="machine-card-scan-hint">
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--flame)' }} strokeWidth={1.6} />
            <span>
              Continúe con los {card.totalCompartments - card.verifiedCompartments} compartimientos restantes
            </span>
          </div>
        ) : (
          <div className="machine-card-scan-hint">
            <QrCode className="w-3.5 h-3.5" strokeWidth={1.6} />
            <span>Escanee el QR del primer compartimiento</span>
          </div>
        )}

        <button
          type="button"
          className={cn(
            'btn btn--sm',
            card.status === 'en_curso' ? 'btn--primary' : 'btn--ghost',
          )}
          onClick={handleStart}
          disabled={pending}
        >
          {card.status === 'completada'
            ? 'Ver detalles'
            : card.status === 'en_curso'
              ? 'Continuar'
              : 'Iniciar manualmente'}
        </button>
      </div>
    </article>
  )
}

function formatHourLabel(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `a las ${h}:${m}`
}

function shortName(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) return fullName
  const apellidos = parts[0].trim().split(/\s+/)[0]
  const nombre = parts[1].trim().split(/\s+/)[0]
  return `${nombre} ${apellidos}`
}
