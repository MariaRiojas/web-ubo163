"use client"

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Check, X, AlertTriangle, QrCode, Info, ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ChecklistExecutionDetail } from '@/lib/faena/get-faena-data'
import type { ItemResultStatus } from '@/lib/faena/actions'
import { setItemResult, finishExecution } from '@/lib/faena/actions'

export function ChecklistExecutor({
  detail,
}: {
  detail: ChecklistExecutionDetail
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [finishing, setFinishing] = useState(false)

  // Estado local de los resultados (sincroniza con el servidor por ítem)
  type LocalResult = {
    status: ItemResultStatus | null
    notes: string | null
  }
  const [results, setResults] = useState<Record<string, LocalResult>>(() => {
    const init: Record<string, LocalResult> = {}
    for (const it of detail.items) {
      init[it.inventoryId] = {
        status: it.result.status,
        notes: it.result.notes,
      }
    }
    return init
  })

  const verified = Object.values(results).filter((r) => r.status != null).length
  const total = detail.items.length
  const pct = total > 0 ? (verified / total) * 100 : 0
  const allVerified = verified === total && total > 0

  const handleMark = (inventoryId: string, status: ItemResultStatus) => {
    // Optimistic update
    setResults((prev) => ({
      ...prev,
      [inventoryId]: { ...prev[inventoryId], status },
    }))
    startTransition(async () => {
      const res = await setItemResult({
        machineId: detail.execution.machineId,
        checklistId: detail.execution.checklistId,
        inventoryId,
        status,
      })
      if (!res.ok) {
        toast.error(res.error)
        // Revertir
        setResults((prev) => ({
          ...prev,
          [inventoryId]: { ...prev[inventoryId], status: null },
        }))
      }
    })
  }

  const handleFinish = () => {
    if (!allVerified) {
      toast.error(`Faltan ${total - verified} ítems por verificar`)
      return
    }
    setFinishing(true)
    startTransition(async () => {
      const res = await finishExecution(detail.execution.machineId, detail.execution.checklistId)
      setFinishing(false)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const msgs: string[] = [
        `Checklist finalizado: ${res.summary.presentes}/${res.summary.total} presentes`,
      ]
      if (res.summary.autoIncidencia) msgs.push('Se creó una incidencia automática')
      if (res.summary.autoSolicitud) msgs.push('Se creó una solicitud de reposición')
      toast.success(msgs.join(' · '))
      router.push('/faena')
    })
  }

  const isReadOnly = detail.execution.status === 'completado'

  return (
    <article className="checklist-detail">
      <div className="profile-card-bracket profile-card-bracket--tl" style={{ borderColor: 'var(--flame)' }} />
      <div className="profile-card-bracket profile-card-bracket--tr" style={{ borderColor: 'var(--flame)' }} />
      <div className="profile-card-bracket profile-card-bracket--bl" style={{ borderColor: 'var(--flame)' }} />
      <div className="profile-card-bracket profile-card-bracket--br" style={{ borderColor: 'var(--flame)' }} />

      <div className="checklist-detail-header">
        <div className="checklist-detail-left">
          <div className="checklist-detail-qr-mini">
            <QrCode className="w-5 h-5" strokeWidth={1.4} />
          </div>
          <div>
            <div className="checklist-detail-breadcrumb mono">
              {detail.machine.label} → {detail.compartment.name.toUpperCase()}
            </div>
            <h3 className="checklist-detail-title">Verificación de inventario</h3>
          </div>
        </div>
        <div className="checklist-detail-qr-id mono">{detail.compartment.qrCode}</div>
      </div>

      <div className="checklist-hint">
        <Info className="w-3.5 h-3.5" strokeWidth={1.6} />
        <span>
          Marque el estado de cada ítem. Si marca{' '}
          <strong>faltante</strong> o <strong>dañado</strong>, al finalizar se generará
          automáticamente una solicitud de reposición o una incidencia.
        </span>
      </div>

      {detail.items.length === 0 ? (
        <div className="guardia-empty">
          Este compartimiento aún no tiene ítems registrados. Agregue inventario desde
          Administración antes de ejecutar un checklist.
        </div>
      ) : (
        <div className="checklist-items">
          {detail.items.map((item) => {
            const current = results[item.inventoryId]?.status ?? null
            const itemClass = cn(
              'checklist-item',
              current === 'presente' && 'checklist-item--presente',
              current === 'faltante' && 'checklist-item--faltante',
              current === 'danado' && 'checklist-item--danado',
            )
            return (
              <div key={item.inventoryId} className={itemClass}>
                <div className="checklist-item-info">
                  <div className="checklist-item-name">{item.name}</div>
                  <div className="checklist-item-meta">
                    {(item.brand || item.model) && (
                      <>
                        <span>{[item.brand, item.model].filter(Boolean).join(' · ')}</span>
                        <span className="checklist-item-sep">·</span>
                      </>
                    )}
                    {item.lote && (
                      <>
                        <span className="mono">Lote {item.lote}</span>
                        <span className="checklist-item-sep">·</span>
                      </>
                    )}
                    <span>
                      Esperadas: {item.expectedQuantity}
                    </span>
                  </div>

                  {current === 'faltante' && (
                    <div className="checklist-item-alert">
                      <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                      Se creará una solicitud de reposición al finalizar
                    </div>
                  )}
                  {current === 'danado' && (
                    <div className="checklist-item-alert">
                      <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                      Se creará una incidencia al Área de Máquinas al finalizar
                    </div>
                  )}
                </div>

                <div className="checklist-item-actions">
                  <CheckBtn
                    label="Presente"
                    variant="presente"
                    active={current === 'presente'}
                    disabled={pending || isReadOnly}
                    icon={<Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    onClick={() => handleMark(item.inventoryId, 'presente')}
                  />
                  <CheckBtn
                    label="Faltante"
                    variant="faltante"
                    active={current === 'faltante'}
                    disabled={pending || isReadOnly}
                    icon={<X className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    onClick={() => handleMark(item.inventoryId, 'faltante')}
                  />
                  <CheckBtn
                    label="Dañado"
                    variant="danado"
                    active={current === 'danado'}
                    disabled={pending || isReadOnly}
                    icon={<AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    onClick={() => handleMark(item.inventoryId, 'danado')}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!isReadOnly && (
        <div className="checklist-footer">
          <div className="checklist-progress-info">
            <span className="mono">
              {verified} de {total} ítems verificados
            </span>
            <div className="checklist-mini-progress">
              <div className="checklist-mini-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="checklist-actions">
            <Link
              href="/faena"
              className="btn btn--ghost"
              style={{ textDecoration: 'none' }}
            >
              Guardar y continuar después
            </Link>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleFinish}
              disabled={pending || finishing || !allVerified}
            >
              {finishing ? 'Finalizando…' : 'Finalizar compartimiento'}
            </button>
          </div>
        </div>
      )}

      {isReadOnly && (
        <div className="checklist-footer">
          <div className="checklist-progress-info">
            <span className="mono" style={{ color: 'var(--emerald-glow)' }}>
              ✓ Checklist finalizado
              {detail.execution.completedAt &&
                ` a las ${new Date(detail.execution.completedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          </div>
          <div className="checklist-actions">
            <Link href="/faena" className="btn btn--ghost" style={{ textDecoration: 'none' }}>
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.8} />
              Volver a Faena
            </Link>
          </div>
        </div>
      )}
    </article>
  )
}

function CheckBtn({
  label,
  variant,
  active,
  disabled,
  icon,
  onClick,
}: {
  label: string
  variant: 'presente' | 'faltante' | 'danado'
  active: boolean
  disabled: boolean
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'check-btn',
        `check-btn--${variant}`,
        active && 'check-btn--active',
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {active && icon}
      {label}
    </button>
  )
}
