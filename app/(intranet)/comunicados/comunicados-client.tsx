"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  Megaphone, Pin, Plus, Search, Clock, AlertCircle,
  ChevronDown, ChevronUp, Users, CalendarClock,
} from "lucide-react"
import { toast } from "sonner"

// ── Tipos ──────────────────────────────────────────────────────────
type Priority = 'baja' | 'media' | 'alta' | 'urgente'

interface Announcement {
  id: string
  title: string
  content: string
  priority: Priority
  author: string
  targetSections: string[]
  targetGrades: string[]
  publishedAt: string
  expiresAt: string | null
  isPinned: boolean
}

interface ComunicadosClientProps {
  announcements: Announcement[]
  canCreate: boolean
  currentUserName: string
}

// ── Constantes ─────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dot: string }> = {
  baja:    { label: 'Baja',    color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',     dot: 'bg-gray-400' },
  media:   { label: 'Media',   color: 'bg-blue-500/10 text-blue-700 border-blue-500/20',    dot: 'bg-blue-500' },
  alta:    { label: 'Alta',    color: 'bg-orange-500/10 text-orange-700 border-orange-500/20', dot: 'bg-orange-500' },
  urgente: { label: 'Urgente', color: 'bg-red-500/10 text-red-700 border-red-500/20',        dot: 'bg-red-500' },
}

const SECTION_LABELS: Record<string, string> = {
  all: 'Toda la compañía',
  jefatura: 'Jefatura',
  maquinas: 'Máquinas',
  servicios_generales: 'Servicios Generales',
  instruccion: 'Instrucción',
  prehospitalaria: 'Prehospitalaria',
  administracion: 'Administración',
  imagen: 'Imagen',
}

const GRADE_LABELS: Record<string, string> = {
  all: 'Todos los grados',
  aspirante: 'Aspirante', seccionario: 'Seccionario', subteniente: 'Subteniente',
  teniente: 'Teniente', capitan: 'Capitán', teniente_brigadier: 'Ten. Brigadier',
  brigadier: 'Brigadier', brigadier_mayor: 'Brig. Mayor', brigadier_general: 'Brig. General',
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7)  return `Hace ${days} días`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `Hace ${weeks} semana${weeks > 1 ? 's' : ''}`
  return new Date(dateStr).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

// ── Componente ─────────────────────────────────────────────────────
export function ComunicadosClient({ announcements: initial, canCreate, currentUserName }: ComunicadosClientProps) {
  const [announcements, setAnnouncements] = useState(initial)
  const [search, setSearch]         = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Form
  const [formTitle, setFormTitle]         = useState('')
  const [formContent, setFormContent]     = useState('')
  const [formPriority, setFormPriority]   = useState<Priority>('media')
  const [formPinned, setFormPinned]       = useState(false)
  const [formExpires, setFormExpires]     = useState('')

  const filtered = useMemo(() => {
    return announcements
      .filter(a => {
        if (isExpired(a.expiresAt)) return false
        if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
        if (filterPriority !== 'all' && a.priority !== filterPriority) return false
        return true
      })
      .sort((a, b) => {
        // Pinned first, then by priority weight, then by date
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        const weights = { urgente: 4, alta: 3, media: 2, baja: 1 }
        const pw = (weights[b.priority] ?? 0) - (weights[a.priority] ?? 0)
        if (pw !== 0) return pw
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      })
  }, [announcements, search, filterPriority])

  const pinned    = filtered.filter(a => a.isPinned)
  const regular   = filtered.filter(a => !a.isPinned)
  const urgente   = announcements.filter(a => a.priority === 'urgente' && !isExpired(a.expiresAt)).length

  function handleCreate() {
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error('Completá título y contenido')
      return
    }
    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title: formTitle.trim(),
      content: formContent.trim(),
      priority: formPriority,
      author: currentUserName,
      targetSections: ['all'],
      targetGrades: ['all'],
      publishedAt: new Date().toISOString(),
      expiresAt: formExpires ? new Date(formExpires).toISOString() : null,
      isPinned: formPinned,
    }
    setAnnouncements(prev => [newAnn, ...prev])
    toast.success('Comunicado publicado correctamente')
    setShowCreate(false)
    setFormTitle(''); setFormContent(''); setFormPriority('media'); setFormPinned(false); setFormExpires('')
  }

  function AnnouncementCard({ ann }: { ann: Announcement }) {
    const cfg      = PRIORITY_CONFIG[ann.priority]
    const expanded = expandedId === ann.id
    const expired  = isExpired(ann.expiresAt)

    const targetLabel = ann.targetSections.includes('all')
      ? 'Toda la compañía'
      : ann.targetSections.map(s => SECTION_LABELS[s] ?? s).join(', ')

    return (
      <Card className={`glass border-primary/10 transition-all hover:border-primary/30 ${ann.isPinned ? 'border-l-4 border-l-primary' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            {/* Punto de prioridad */}
            <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${cfg.dot}`} />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {ann.isPinned && (
                    <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                  <h3 className="font-semibold text-sm leading-tight">{ann.title}</h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                    {cfg.label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setExpandedId(expanded ? null : ann.id)}
                  >
                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeAgo(ann.publishedAt)} · {ann.author}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {targetLabel}
                </span>
                {ann.expiresAt && (
                  <span className="flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Vence {new Date(ann.expiresAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0">
            <div className="border-t border-border/50 pt-3">
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {ann.content}
              </p>
              {ann.targetGrades[0] !== 'all' && (
                <p className="text-xs text-muted-foreground mt-3">
                  Dirigido a: {ann.targetGrades.map(g => GRADE_LABELS[g] ?? g).join(', ')}
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <>
      {/* Banner urgente */}
      {urgente > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 mb-5">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">
            Hay <span className="font-semibold">{urgente}</span> comunicado{urgente > 1 ? 's' : ''} de prioridad urgente activo{urgente > 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar comunicado..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canCreate && (
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-primary hover:bg-primary/90 text-white ml-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo comunicado
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="glass border-primary/10">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No hay comunicados activos.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Fijados */}
          {pinned.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Pin className="h-3 w-3" /> Fijados
              </p>
              {pinned.map(a => <AnnouncementCard key={a.id} ann={a} />)}
            </div>
          )}

          {/* Regulares */}
          {regular.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Recientes
                </p>
              )}
              {regular.map(a => <AnnouncementCard key={a.id} ann={a} />)}
            </div>
          )}
        </div>
      )}

      {/* Dialog: Nuevo comunicado */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Nuevo comunicado
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ann-title">Título *</Label>
              <Input
                id="ann-title"
                placeholder="Asunto del comunicado..."
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ann-content">Contenido *</Label>
              <Textarea
                id="ann-content"
                placeholder="Redactá el comunicado completo..."
                rows={5}
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={formPriority} onValueChange={v => setFormPriority(v as Priority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-expires">Vence el <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input
                  id="ann-expires"
                  type="date"
                  value={formExpires}
                  onChange={e => setFormExpires(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Fijar en la parte superior</p>
                <p className="text-xs text-muted-foreground">Aparecerá destacado para todos los usuarios</p>
              </div>
              <Switch checked={formPinned} onCheckedChange={setFormPinned} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-white">
              <Megaphone className="h-4 w-4 mr-2" />
              Publicar comunicado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
