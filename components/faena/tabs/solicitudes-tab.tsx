"use client"

import { useState, useTransition } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { FaenaData, RequestCard } from '@/lib/faena/get-faena-data'
import { createRequest, cancelMyRequest } from '@/lib/faena/actions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'

interface SectionOption {
  id: string
  name: string
}

const REQUEST_CATEGORIES = [
  { value: 'repuesto', label: 'Repuesto' },
  { value: 'reparacion', label: 'Reparación' },
  { value: 'reposicion_insumo', label: 'Reposición de insumo' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'capacitacion', label: 'Capacitación' },
  { value: 'permiso', label: 'Permiso' },
  { value: 'otro', label: 'Otro' },
] as const
type RequestCategory = typeof REQUEST_CATEGORIES[number]['value']

const PRIORITIES = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
] as const

export function SolicitudesTab({
  data,
  sections,
}: {
  data: FaenaData
  sections: SectionOption[]
}) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <div className="faena-view-header">
        <h2 className="faena-section-title">Mis solicitudes a las áreas</h2>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Nueva solicitud
        </button>
      </div>

      {data.myRequests.length === 0 ? (
        <div className="guardia-empty">
          Aún no ha enviado solicitudes.
        </div>
      ) : (
        <div className="incident-list">
          {data.myRequests.map((r) => (
            <RequestCardUI key={r.id} request={r} />
          ))}
        </div>
      )}

      <CreateRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sections={sections}
      />
    </>
  )
}

function RequestCardUI({ request }: { request: RequestCard }) {
  const [pending, startTransition] = useTransition()

  const statusClass = cn(
    'incident-card',
    ['completada', 'aprobada'].includes(request.status) && 'incident-card--resolved',
    request.status === 'en_proceso' && 'incident-card--in-progress',
    request.status === 'pendiente' && 'incident-card--pending',
  )

  const pillClass =
    ['completada', 'aprobada'].includes(request.status)
      ? 'incident-status-pill incident-status-pill--resolved'
      : request.status === 'en_proceso'
        ? 'incident-status-pill incident-status-pill--in-progress'
        : request.status === 'rechazada' || request.status === 'cancelada'
          ? 'incident-status-pill incident-status-pill--rejected'
          : 'incident-status-pill incident-status-pill--pending'

  const pillLabel = {
    pendiente: 'PENDIENTE',
    aprobada: 'APROBADA',
    rechazada: 'RECHAZADA',
    en_proceso: 'EN PROCESO',
    completada: 'COMPLETADA',
    cancelada: 'CANCELADA',
  }[request.status] ?? request.status.toUpperCase()

  const handleCancel = () => {
    if (!confirm(`¿Cancelar la solicitud ${request.code}?`)) return
    startTransition(async () => {
      const res = await cancelMyRequest(request.id)
      if (!res.ok) toast.error(res.error)
      else toast.success('Solicitud cancelada')
    })
  }

  const canCancel = ['pendiente', 'aprobada'].includes(request.status)

  return (
    <article className={statusClass}>
      <div className="incident-card-left">
        {request.code && <div className="incident-card-code mono">{request.code}</div>}
        <div className={`incident-card-category incident-card-category--${request.categorySlug}`}>
          {request.category}
        </div>
      </div>
      <div>
        <h4 className="incident-card-title">{request.title}</h4>
        <p className="incident-card-desc">{request.description}</p>
        <div className="incident-card-meta">
          {request.targetSectionName && (
            <div className="incident-meta-item">
              <span className="incident-meta-label">DIRIGIDA A</span>
              <span>{request.targetSectionName}</span>
            </div>
          )}
          <div className="incident-meta-item">
            <span className="incident-meta-label">ENVIADA</span>
            <span className="mono">{timeAgo(request.createdAt)}</span>
          </div>
          <div className="incident-meta-item">
            <span className="incident-meta-label">PRIORIDAD</span>
            <span className={priorityClass(request.priority)}>
              {capitalize(request.priority)}
            </span>
          </div>
        </div>
      </div>
      <div className="incident-card-status">
        <span className={pillClass}>
          {['completada', 'aprobada'].includes(request.status) && (
            <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
          )}
          {pillLabel}
        </span>
        {canCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={pending}
            className="ml-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
          >
            {pending ? '…' : 'Cancelar'}
          </button>
        )}
      </div>
    </article>
  )
}

function CreateRequestDialog({
  open,
  onOpenChange,
  sections,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sections: SectionOption[]
}) {
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<RequestCategory>('reposicion_insumo')
  const [priority, setPriority] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media')
  const [targetSectionId, setTargetSectionId] = useState(sections[0]?.id ?? '')

  const handleSubmit = () => {
    if (!title.trim() || !description.trim() || !targetSectionId) {
      toast.error('Todos los campos son obligatorios')
      return
    }
    startTransition(async () => {
      const res = await createRequest({
        title,
        description,
        category,
        priority,
        targetSectionId,
      })
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success(`Solicitud ${res.code} enviada`)
        setTitle('')
        setDescription('')
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nueva solicitud</DialogTitle>
          <DialogDescription>
            Las solicitudes llegan al área destino para que sean aprobadas y atendidas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Título
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              placeholder="Ej: Reposición de vendajes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Descripción
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm min-h-[100px]"
              placeholder="Contexto y detalles de la solicitud…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Categoría
              </label>
              <select
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as RequestCategory)}
              >
                {REQUEST_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Prioridad
              </label>
              <select
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Área destino
              </label>
              <select
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={pending}
          >
            {pending ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function priorityClass(p: string): string {
  if (p === 'alta') return 'incident-meta-value--alta'
  if (p === 'urgente') return 'incident-meta-value--urgente'
  return ''
}

function timeAgo(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 60) return 'hace unos segundos'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `hace ${mins} minuto${mins === 1 ? '' : 's'}`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} hora${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} día${days === 1 ? '' : 's'}`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `hace ${weeks} semana${weeks === 1 ? '' : 's'}`
  const months = Math.floor(days / 30)
  return `hace ${months} mes${months === 1 ? '' : 'es'}`
}
