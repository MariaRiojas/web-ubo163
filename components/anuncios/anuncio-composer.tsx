"use client"

import { useState, useTransition, useEffect } from 'react'
import { Send, Save, AlertCircle, Users, UserCheck, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  createAnnouncementDraft,
  updateAnnouncementDraft,
  type CreateDraftInput,
} from '@/lib/anuncios/actions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

interface SectionOption {
  id: string
  key: string
  name: string
}

interface ProfileOption {
  id: string
  fullName: string
  grade: string
  codigoCgbvp: string | null
}

export interface AnuncioComposerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sections: SectionOption[]
  /** Para autocomplete de destinatarios directos */
  profilesForDirect: ProfileOption[]
  /** Si estamos editando un borrador existente */
  editing?: {
    id: string
    title: string
    content: string
    priority: 'normal' | 'importante' | 'urgente'
    originSectionId: string | null
    audienceAllBomberos: boolean
    audienceGrades: string[]
    audienceAspirantes: boolean
    audiencePostulantes: boolean
    directToProfileId: string | null
    isPinned: boolean
    expiresAt: Date | null
  } | null
}

const GRADE_OPTIONS = [
  { value: 'seccionario', label: 'Seccionarios' },
  { value: 'subteniente', label: 'Subtenientes' },
  { value: 'teniente', label: 'Tenientes' },
  { value: 'capitan', label: 'Capitanes' },
  { value: 'teniente_brigadier', label: 'Ten. Brigadieres' },
  { value: 'brigadier', label: 'Brigadieres' },
  { value: 'brigadier_mayor', label: 'Brig. Mayores' },
  { value: 'brigadier_general', label: 'Brig. Generales' },
]

type AudienceMode = 'todos' | 'grados' | 'directo'

export function AnuncioComposer({
  open, onOpenChange, sections, profilesForDirect, editing,
}: AnuncioComposerProps) {
  const [pending, startTransition] = useTransition()

  const [title, setTitle] = useState(editing?.title ?? '')
  const [content, setContent] = useState(editing?.content ?? '')
  const [priority, setPriority] = useState<'normal' | 'importante' | 'urgente'>(
    editing?.priority ?? 'normal',
  )
  const [originSectionId, setOriginSectionId] = useState<string>(
    editing?.originSectionId ?? '',
  )
  const [isPinned, setIsPinned] = useState(editing?.isPinned ?? false)

  // Audiencia
  const initialMode: AudienceMode = editing?.directToProfileId
    ? 'directo'
    : editing?.audienceAllBomberos
      ? 'todos'
      : 'grados'
  const [audienceMode, setAudienceMode] = useState<AudienceMode>(initialMode)
  const [audienceAllBomberos, setAudienceAllBomberos] = useState(
    editing?.audienceAllBomberos ?? true,
  )
  const [selectedGrades, setSelectedGrades] = useState<Set<string>>(
    new Set(editing?.audienceGrades ?? []),
  )
  const [audienceAspirantes, setAudienceAspirantes] = useState(
    editing?.audienceAspirantes ?? false,
  )
  const [audiencePostulantes, setAudiencePostulantes] = useState(
    editing?.audiencePostulantes ?? false,
  )
  const [directToProfileId, setDirectToProfileId] = useState<string>(
    editing?.directToProfileId ?? '',
  )
  const [directSearch, setDirectSearch] = useState('')

  // Reset al abrir
  useEffect(() => {
    if (open && !editing) {
      setTitle('')
      setContent('')
      setPriority('normal')
      setOriginSectionId('')
      setIsPinned(false)
      setAudienceMode('todos')
      setAudienceAllBomberos(true)
      setSelectedGrades(new Set())
      setAudienceAspirantes(false)
      setAudiencePostulantes(false)
      setDirectToProfileId('')
      setDirectSearch('')
    }
  }, [open, editing])

  const toggleGrade = (g: string) => {
    setSelectedGrades((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })
  }

  // Filtered profiles para búsqueda de directo
  const filteredProfiles = directSearch.trim()
    ? profilesForDirect.filter((p) =>
        p.fullName.toLowerCase().includes(directSearch.toLowerCase()) ||
        (p.codigoCgbvp?.toLowerCase().includes(directSearch.toLowerCase()) ?? false),
      ).slice(0, 8)
    : []

  const selectedDirectProfile = profilesForDirect.find((p) => p.id === directToProfileId)

  // Summary de audiencia seleccionada
  const summary = buildSummaryPreview({
    mode: audienceMode,
    audienceAllBomberos,
    selectedGrades: Array.from(selectedGrades),
    audienceAspirantes,
    audiencePostulantes,
    directProfile: selectedDirectProfile,
  })

  const handleSubmit = (mode: 'draft' | 'approval') => {
    if (!title.trim() || !content.trim()) {
      toast.error('Título y contenido son obligatorios')
      return
    }

    // Validar audiencia
    if (audienceMode === 'directo') {
      if (!directToProfileId) {
        toast.error('Seleccione un destinatario')
        return
      }
    } else {
      const hasAny =
        (audienceMode === 'todos' && audienceAllBomberos) ||
        selectedGrades.size > 0 ||
        audienceAspirantes ||
        audiencePostulantes
      if (!hasAny) {
        toast.error('Seleccione al menos una audiencia')
        return
      }
    }

    const input: CreateDraftInput = {
      title: title.trim(),
      content: content.trim(),
      priority,
      originSectionId: originSectionId || null,
      audienceAllBomberos: audienceMode === 'todos' ? audienceAllBomberos : false,
      audienceGrades: audienceMode === 'grados' ? Array.from(selectedGrades) : [],
      audienceAspirantes: audienceMode !== 'directo' ? audienceAspirantes : false,
      audiencePostulantes: audienceMode !== 'directo' ? audiencePostulantes : false,
      directToProfileId: audienceMode === 'directo' ? directToProfileId : null,
      isPinned,
      submitForApproval: mode === 'approval',
    }

    startTransition(async () => {
      const res = editing
        ? await updateAnnouncementDraft(editing.id, input)
        : await createAnnouncementDraft(input)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(
        mode === 'approval'
          ? 'Anuncio enviado a aprobación'
          : 'Borrador guardado',
      )
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Editar anuncio' : 'Nuevo anuncio'}
          </DialogTitle>
          <DialogDescription>
            Redacte el anuncio y defina su audiencia. Será enviado al Primer Jefe para aprobación
            antes de publicarse.
          </DialogDescription>
        </DialogHeader>

        <div className="anuncio-composer">
          <div className="anuncio-composer-field">
            <label className="anuncio-composer-label">Título</label>
            <input
              type="text"
              className="anuncio-composer-input"
              placeholder="Ej: Suspensión de actividades por ejercicio operativo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="anuncio-composer-field">
            <label className="anuncio-composer-label">Contenido</label>
            <textarea
              className="anuncio-composer-textarea"
              placeholder="Describa el anuncio con claridad. Puede usar saltos de línea para estructurar la información."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
          </div>

          <div className="anuncio-composer-row">
            <div className="anuncio-composer-field">
              <label className="anuncio-composer-label">Prioridad</label>
              <select
                className="anuncio-composer-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
              >
                <option value="normal">Normal</option>
                <option value="importante">Importante</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div className="anuncio-composer-field">
              <label className="anuncio-composer-label">Sección origen (opcional)</label>
              <select
                className="anuncio-composer-select"
                value={originSectionId}
                onChange={(e) => setOriginSectionId(e.target.value)}
              >
                <option value="">— Auto-detectar —</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Audiencia granular */}
          <div className="anuncio-composer-field">
            <label className="anuncio-composer-label">Audiencia</label>
            <div className="anuncio-audience">
              <div className="anuncio-audience-mode">
                <button
                  type="button"
                  className={cn('anuncio-audience-btn', audienceMode === 'todos' && 'anuncio-audience-btn--active')}
                  onClick={() => setAudienceMode('todos')}
                >
                  <Users className="w-3.5 h-3.5" strokeWidth={1.8} />
                  Todos / Grupos
                </button>
                <button
                  type="button"
                  className={cn('anuncio-audience-btn', audienceMode === 'grados' && 'anuncio-audience-btn--active')}
                  onClick={() => setAudienceMode('grados')}
                >
                  <UserCheck className="w-3.5 h-3.5" strokeWidth={1.8} />
                  Por grados
                </button>
                <button
                  type="button"
                  className={cn('anuncio-audience-btn', audienceMode === 'directo' && 'anuncio-audience-btn--active')}
                  onClick={() => setAudienceMode('directo')}
                >
                  <User className="w-3.5 h-3.5" strokeWidth={1.8} />
                  Directo a persona
                </button>
              </div>

              {audienceMode === 'todos' && (
                <div className="anuncio-audience-panel">
                  <div className="anuncio-audience-checks">
                    <label
                      className={cn('anuncio-audience-check', audienceAllBomberos && 'anuncio-audience-check--active')}
                    >
                      <input
                        type="checkbox"
                        checked={audienceAllBomberos}
                        onChange={(e) => setAudienceAllBomberos(e.target.checked)}
                      />
                      Todos los bomberos activos
                    </label>
                    <label
                      className={cn('anuncio-audience-check', audienceAspirantes && 'anuncio-audience-check--active')}
                    >
                      <input
                        type="checkbox"
                        checked={audienceAspirantes}
                        onChange={(e) => setAudienceAspirantes(e.target.checked)}
                      />
                      Incluir aspirantes
                    </label>
                    <label
                      className={cn('anuncio-audience-check', audiencePostulantes && 'anuncio-audience-check--active')}
                    >
                      <input
                        type="checkbox"
                        checked={audiencePostulantes}
                        onChange={(e) => setAudiencePostulantes(e.target.checked)}
                      />
                      Incluir postulantes
                    </label>
                  </div>
                  <div className="anuncio-audience-hint">
                    "Bomberos activos" incluye todos los efectivos con grado desde Seccionario en adelante.
                  </div>
                </div>
              )}

              {audienceMode === 'grados' && (
                <div className="anuncio-audience-panel">
                  <div className="anuncio-audience-checks">
                    {GRADE_OPTIONS.map((g) => (
                      <label
                        key={g.value}
                        className={cn(
                          'anuncio-audience-check',
                          selectedGrades.has(g.value) && 'anuncio-audience-check--active',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGrades.has(g.value)}
                          onChange={() => toggleGrade(g.value)}
                        />
                        {g.label}
                      </label>
                    ))}
                  </div>
                  <div className="anuncio-audience-checks" style={{ marginTop: 4 }}>
                    <label
                      className={cn('anuncio-audience-check', audienceAspirantes && 'anuncio-audience-check--active')}
                    >
                      <input
                        type="checkbox"
                        checked={audienceAspirantes}
                        onChange={(e) => setAudienceAspirantes(e.target.checked)}
                      />
                      + Aspirantes
                    </label>
                    <label
                      className={cn('anuncio-audience-check', audiencePostulantes && 'anuncio-audience-check--active')}
                    >
                      <input
                        type="checkbox"
                        checked={audiencePostulantes}
                        onChange={(e) => setAudiencePostulantes(e.target.checked)}
                      />
                      + Postulantes
                    </label>
                  </div>
                </div>
              )}

              {audienceMode === 'directo' && (
                <div className="anuncio-audience-panel">
                  <input
                    type="text"
                    className="anuncio-composer-input"
                    placeholder="Buscar por nombre o código CGBVP…"
                    value={selectedDirectProfile ? selectedDirectProfile.fullName : directSearch}
                    onChange={(e) => {
                      setDirectSearch(e.target.value)
                      setDirectToProfileId('')
                    }}
                  />
                  {filteredProfiles.length > 0 && !directToProfileId && (
                    <div
                      style={{
                        marginTop: 4,
                        background: 'var(--ink-black)',
                        border: '1px solid var(--ink-line)',
                        borderRadius: 2,
                        maxHeight: 200,
                        overflowY: 'auto',
                      }}
                    >
                      {filteredProfiles.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setDirectToProfileId(p.id)
                            setDirectSearch('')
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid var(--ink-line-soft)',
                            color: 'var(--bone)',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{p.fullName}</div>
                          <div
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 10,
                              color: 'var(--graphite)',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {p.grade}
                            {p.codigoCgbvp && ` · ${p.codigoCgbvp}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="anuncio-audience-hint">
                    Solo el destinatario verá este anuncio. Útil para avisos personales formales.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary preview */}
          {summary.length > 0 && (
            <div className="anuncio-audience-summary">
              <span>Llegará a:</span>
              {summary.map((s, i) => (
                <span key={i} className="anuncio-audience-summary-tag">{s}</span>
              ))}
            </div>
          )}

          <div className="anuncio-composer-row">
            <label
              className={cn('anuncio-audience-check', isPinned && 'anuncio-audience-check--active')}
              style={{ cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
              />
              Fijar en la parte superior
            </label>
          </div>
        </div>

        <DialogFooter className="mt-4" style={{ gap: 8 }}>
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
            className="btn btn--ghost"
            onClick={() => handleSubmit('draft')}
            disabled={pending}
          >
            <Save className="w-3.5 h-3.5" strokeWidth={1.8} />
            {pending ? 'Guardando…' : 'Guardar borrador'}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => handleSubmit('approval')}
            disabled={pending}
          >
            <Send className="w-3.5 h-3.5" strokeWidth={1.8} />
            {pending ? 'Enviando…' : 'Enviar a aprobación'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function buildSummaryPreview(opts: {
  mode: AudienceMode
  audienceAllBomberos: boolean
  selectedGrades: string[]
  audienceAspirantes: boolean
  audiencePostulantes: boolean
  directProfile?: { fullName: string }
}): string[] {
  if (opts.mode === 'directo' && opts.directProfile) {
    return [`Directo → ${opts.directProfile.fullName}`]
  }
  const tags: string[] = []
  if (opts.mode === 'todos' && opts.audienceAllBomberos) {
    tags.push('Todos los bomberos activos')
  }
  if (opts.mode === 'grados' && opts.selectedGrades.length > 0) {
    const labels: Record<string, string> = {
      seccionario: 'Seccionarios',
      subteniente: 'Subtenientes',
      teniente: 'Tenientes',
      capitan: 'Capitanes',
      teniente_brigadier: 'Ten. Brigadieres',
      brigadier: 'Brigadieres',
      brigadier_mayor: 'Brig. Mayores',
      brigadier_general: 'Brig. Generales',
    }
    for (const g of opts.selectedGrades) {
      tags.push(labels[g] ?? g)
    }
  }
  if (opts.mode !== 'directo' && opts.audienceAspirantes) tags.push('Aspirantes')
  if (opts.mode !== 'directo' && opts.audiencePostulantes) tags.push('Postulantes')
  return tags
}
