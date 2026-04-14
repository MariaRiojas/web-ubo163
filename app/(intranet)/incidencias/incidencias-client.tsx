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
import {
  AlertTriangle, Plus, Search, CheckCircle2, Clock,
  XCircle, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react"
import { toast } from "sonner"

// ── Tipos ──────────────────────────────────────────────────────────
type Priority = 'baja' | 'media' | 'alta' | 'urgente'
type Status   = 'pendiente' | 'en_proceso' | 'resuelta' | 'rechazada'

interface Incident {
  id: string
  code: string
  title: string
  description: string
  priority: Priority
  status: Status
  category: string
  section: string
  reportedBy: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
}

interface IncidenciasClientProps {
  incidents: Incident[]
  canManageAll: boolean
  canManageSection: boolean
  canCreate: boolean
  currentUserName: string
}

// ── Constantes ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: React.ElementType }> = {
  pendiente:  { label: 'Pendiente',  color: 'bg-amber-500/10 text-amber-700 border-amber-500/20',  icon: Clock },
  en_proceso: { label: 'En proceso', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20',    icon: AlertCircle },
  resuelta:   { label: 'Resuelta',   color: 'bg-green-500/10 text-green-700 border-green-500/20', icon: CheckCircle2 },
  rechazada:  { label: 'Rechazada',  color: 'bg-red-500/10 text-red-700 border-red-500/20',       icon: XCircle },
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  baja:    { label: 'Baja',    color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
  media:   { label: 'Media',   color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
  alta:    { label: 'Alta',    color: 'bg-orange-500/10 text-orange-700 border-orange-500/20' },
  urgente: { label: 'Urgente', color: 'bg-red-500/10 text-red-700 border-red-500/20 font-semibold' },
}

const CATEGORIES = [
  'equipamiento', 'vehiculos', 'infraestructura', 'insumos',
  'personal', 'seguridad', 'administrativa', 'otro',
]

// ── Componente ─────────────────────────────────────────────────────
export function IncidenciasClient({
  incidents: initialIncidents,
  canManageAll,
  canManageSection,
  canCreate,
  currentUserName,
}: IncidenciasClientProps) {
  const canManage = canManageAll || canManageSection

  const [incidents, setIncidents] = useState(initialIncidents)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Form state
  const [formTitle, setFormTitle]     = useState('')
  const [formDesc, setFormDesc]       = useState('')
  const [formPriority, setFormPriority] = useState<Priority>('media')
  const [formCategory, setFormCategory] = useState('')

  const filtered = useMemo(() => {
    return incidents.filter(inc => {
      if (search && !inc.title.toLowerCase().includes(search.toLowerCase()) &&
          !inc.code.toLowerCase().includes(search.toLowerCase())) return false
      if (filterStatus !== 'all' && inc.status !== filterStatus) return false
      if (filterPriority !== 'all' && inc.priority !== filterPriority) return false
      return true
    })
  }, [incidents, search, filterStatus, filterPriority])

  const counts = useMemo(() => ({
    total:    incidents.length,
    pending:  incidents.filter(i => i.status === 'pendiente').length,
    inProgress: incidents.filter(i => i.status === 'en_proceso').length,
    resolved: incidents.filter(i => i.status === 'resuelta').length,
  }), [incidents])

  function handleUpdateStatus(id: string, newStatus: Status) {
    setIncidents(prev => prev.map(inc =>
      inc.id === id ? { ...inc, status: newStatus, updatedAt: new Date().toISOString() } : inc
    ))
    toast.success(`Incidencia marcada como: ${STATUS_CONFIG[newStatus].label}`)
  }

  function handleCreate() {
    if (!formTitle.trim() || !formCategory) {
      toast.error('Completá título y categoría')
      return
    }
    const newId = `inc-${Date.now()}`
    const newCode = `INC-${new Date().getFullYear()}-${String(incidents.length + 1).padStart(3, '0')}`
    setIncidents(prev => [{
      id: newId,
      code: newCode,
      title: formTitle.trim(),
      description: formDesc.trim(),
      priority: formPriority,
      status: 'pendiente' as Status,
      category: formCategory,
      section: '—',
      reportedBy: currentUserName,
      assignedTo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, ...prev])
    toast.success(`Incidencia ${newCode} creada correctamente`)
    setShowCreate(false)
    setFormTitle(''); setFormDesc(''); setFormPriority('media'); setFormCategory('')
  }

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total',       value: counts.total,      color: '' },
          { label: 'Pendientes',  value: counts.pending,    color: 'text-amber-600' },
          { label: 'En proceso',  value: counts.inProgress, color: 'text-blue-600' },
          { label: 'Resueltas',   value: counts.resolved,   color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="glass border-primary/10">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título o código..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            Nueva incidencia
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Mostrando <span className="font-medium text-foreground">{filtered.length}</span> de {incidents.length} incidencias
      </p>

      {/* Lista */}
      <div className="space-y-3">
        {filtered.map(inc => {
          const statusCfg   = STATUS_CONFIG[inc.status]
          const priorityCfg = PRIORITY_CONFIG[inc.priority]
          const StatusIcon  = statusCfg.icon
          const isExpanded  = expandedId === inc.id
          const canEdit     = canManageAll || canManageSection

          return (
            <Card key={inc.id} className="glass border-primary/10 hover:border-primary/30 transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{inc.code}</span>
                      <Badge variant="outline" className={`text-xs ${priorityCfg.color}`}>
                        {priorityCfg.label}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm leading-tight">{inc.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {inc.section} · Reportado por {inc.reportedBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusCfg.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setExpandedId(isExpanded ? null : inc.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-3 border-t border-border/50 mt-2">
                  <p className="text-sm text-muted-foreground pt-3">{inc.description || 'Sin descripción adicional.'}</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span>Categoría: <span className="text-foreground capitalize">{inc.category}</span></span>
                    {inc.assignedTo && <span>Asignado a: <span className="text-foreground">{inc.assignedTo}</span></span>}
                    <span>Creado: {new Date(inc.createdAt).toLocaleDateString('es-PE', { dateStyle: 'medium' })}</span>
                    <span>Actualizado: {new Date(inc.updatedAt).toLocaleDateString('es-PE', { dateStyle: 'medium' })}</span>
                  </div>
                  {canEdit && inc.status !== 'resuelta' && inc.status !== 'rechazada' && (
                    <div className="flex gap-2 flex-wrap pt-1">
                      {inc.status === 'pendiente' && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(inc.id, 'en_proceso')}>
                          Marcar En proceso
                        </Button>
                      )}
                      {(inc.status === 'pendiente' || inc.status === 'en_proceso') && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleUpdateStatus(inc.id, 'resuelta')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Marcar Resuelta
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-500/10 hover:text-red-700"
                        onClick={() => handleUpdateStatus(inc.id, 'rechazada')}
                      >
                        Rechazar
                      </Button>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}

        {filtered.length === 0 && (
          <Card className="glass border-primary/10">
            <CardContent className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No se encontraron incidencias con los filtros aplicados.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog: Nueva incidencia */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Reportar nueva incidencia
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inc-title">Título *</Label>
              <Input
                id="inc-title"
                placeholder="Describe brevemente la incidencia..."
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridad *</Label>
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
                <Label>Categoría *</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inc-desc">Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Textarea
                id="inc-desc"
                placeholder="Detallá el problema, ubicación, equipos afectados..."
                rows={3}
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Crear incidencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
