"use client"

import { useState, useTransition } from 'react'
import { Plus, Check, AlertTriangle, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { FaenaData, IncidentCard } from '@/lib/faena/get-faena-data'
import { createIncident } from '@/lib/faena/actions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'

interface SectionOption {
  id: string
  name: string
}

const INCIDENT_CATEGORIES = [
  { value: 'equipamiento', label: 'Equipamiento' },
  { value: 'infraestructura', label: 'Infraestructura' },
  { value: 'personal', label: 'Personal' },
  { value: 'vehiculo', label: 'Vehículo' },
  { value: 'otro', label: 'Otro' },
]

const PRIORITIES = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

export function IncidenciasTab({
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
        <h2 className="faena-section-title">Mis incidencias reportadas</h2>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Reportar incidencia
        </button>
      </div>

      {data.myIncidents.length === 0 ? (
        <div className="guardia-empty">
          Aún no ha reportado incidencias.
        </div>
      ) : (
        <div className="incident-list">
          {data.myIncidents.map((incident) => (
            <IncidentCardUI key={incident.id} incident={incident} />
          ))}
        </div>
      )}

      <CreateIncidentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sections={sections}
      />
    </>
  )
}

function IncidentCardUI({ incident }: { incident: IncidentCard }) {
  const statusClass = cn(
    'incident-card',
    incident.status === 'resuelta' && 'incident-card--resolved',
    incident.status === 'en_proceso' && 'incident-card--in-progress',
    incident.status === 'pendiente' && 'incident-card--pending',
  )

  const pillClass =
    incident.status === 'resuelta'
      ? 'incident-status-pill incident-status-pill--resolved'
      : incident.status === 'en_proceso'
        ? 'incident-status-pill incident-status-pill--in-progress'
        : incident.status === 'rechazada'
          ? 'incident-status-pill incident-status-pill--rejected'
          : 'incident-status-pill incident-status-pill--pending'

  const pillLabel = {
    pendiente: 'PENDIENTE',
    en_proceso: 'EN PROCESO',
    resuelta: 'RESUELTA',
    rechazada: 'RECHAZADA',
  }[incident.status] ?? incident.status.toUpperCase()

  return (
    <article className={statusClass}>
      <div className="incident-card-left">
        {incident.code && <div className="incident-card-code mono">{incident.code}</div>}
        {incident.category && (
          <div className={`incident-card-category incident-card-category--${incident.categorySlug}`}>
            {incident.category}
          </div>
        )}
      </div>
      <div>
        <h4 className="incident-card-title">{incident.title}</h4>
        <p className="incident-card-desc">{incident.description}</p>
        <div className="incident-card-meta">
          {incident.assignedSectionName && (
            <div className="incident-meta-item">
              <span className="incident-meta-label">ASIGNADA A</span>
              <span>{incident.assignedSectionName}</span>
            </div>
          )}
          <div className="incident-meta-item">
            <span className="incident-meta-label">REPORTADA</span>
            <span className="mono">{timeAgo(new Date(incident.createdAt))}</span>
          </div>
          <div className="incident-meta-item">
            <span className="incident-meta-label">PRIORIDAD</span>
            <span className={priorityClass(incident.priority)}>
              {capitalize(incident.priority)}
            </span>
          </div>
          {incident.resolvedAt && (
            <div className="incident-meta-item">
              <span className="incident-meta-label">CERRADA</span>
              <span className="mono">{timeAgo(new Date(incident.resolvedAt))}</span>
            </div>
          )}
        </div>
      </div>
      <div className="incident-card-status">
        <span className={pillClass}>
          {incident.status === 'resuelta' && <Check className="w-2.5 h-2.5" strokeWidth={2.5} />}
          {pillLabel}
        </span>
      </div>
    </article>
  )
}

function CreateIncidentDialog({
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
  const [category, setCategory] = useState('equipamiento')
  const [priority, setPriority] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media')
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '')

  const handleSubmit = () => {
    if (!title.trim() || !description.trim() || !sectionId) {
      toast.error('Todos los campos son obligatorios')
      return
    }
    startTransition(async () => {
      const res = await createIncident({
        title,
        description,
        category,
        priority,
        sectionId,
      })
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success(`Incidencia ${res.code} creada`)
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
          <DialogTitle>Reportar incidencia</DialogTitle>
          <DialogDescription>
            Describa el problema detectado. El área asignada recibirá la notificación.
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
              placeholder="Ej: Hacha con mango suelto"
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
              placeholder="Explique qué pasó, dónde, y el contexto…"
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
                onChange={(e) => setCategory(e.target.value)}
              >
                {INCIDENT_CATEGORIES.map((c) => (
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
                Área a asignar
              </label>
              <select
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
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
            {pending ? 'Enviando…' : 'Enviar incidencia'}
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
