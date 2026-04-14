"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  CalendarDays, Plus, Instagram, Youtube, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, Pencil, XCircle, Link2, FileImage,
  Cake, Star, Megaphone, Shield, Flame, Users, Heart, Building2,
} from "lucide-react"
import { toast } from "sonner"
import type { ContentItem, ContentType, ContentStatus, ContentCategory } from "./page"

// ── Etiquetas y colores ────────────────────────────────────────────
const TYPE_LABELS: Record<ContentType, string> = {
  post: 'Post', reel: 'Reel', video: 'Video', story: 'Story', carousel: 'Carrusel',
}
const TYPE_COLORS: Record<ContentType, string> = {
  post: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  reel: 'bg-pink-500/10 text-pink-700 border-pink-500/20',
  video: 'bg-red-500/10 text-red-700 border-red-500/20',
  story: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  carousel: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
}

const STATUS_LABELS: Record<ContentStatus, string> = {
  planificado: 'Planificado',
  en_proceso: 'En diseño',
  publicado: 'Publicado',
  cancelado: 'Cancelado',
}
const STATUS_COLORS: Record<ContentStatus, string> = {
  planificado: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  en_proceso: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  publicado: 'bg-green-500/10 text-green-700 border-green-500/20',
  cancelado: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
}
const STATUS_ICONS: Record<ContentStatus, React.ElementType> = {
  planificado: Clock,
  en_proceso: Pencil,
  publicado: CheckCircle2,
  cancelado: XCircle,
}

const CATEGORY_LABELS: Record<ContentCategory, string> = {
  aniversario: 'Aniversario', cumpleanos: 'Cumpleaños', fecha_especial: 'Fecha especial',
  prevencion: 'Prevención', emergencias: 'Emergencia', reclutamiento: 'Reclutamiento',
  reconocimiento: 'Reconocimiento', comunidad: 'Comunidad', institucional: 'Institucional',
}
const CATEGORY_ICONS: Record<ContentCategory, React.ElementType> = {
  aniversario: Star, cumpleanos: Cake, fecha_especial: CalendarDays,
  prevencion: Shield, emergencias: Flame, reclutamiento: Users,
  reconocimiento: Heart, comunidad: Heart, institucional: Building2,
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  facebook: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  tiktok: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.95a8.24 8.24 0 0 0 4.82 1.55V7.07a4.85 4.85 0 0 1-1.05-.38z"/>
    </svg>
  ),
  youtube: Youtube,
}

// ── Helpers ────────────────────────────────────────────────────────
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

// ── Props ──────────────────────────────────────────────────────────
interface ContenidoClientProps {
  items: ContentItem[]
  canManage: boolean
}

// ── Componente principal ───────────────────────────────────────────
export function ContenidoClient({ items, canManage }: ContenidoClientProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addDate, setAddDate] = useState('')
  const [addType, setAddType] = useState<ContentType>('post')
  const [addCategory, setAddCategory] = useState<ContentCategory>('institucional')
  const [addCaption, setAddCaption] = useState('')
  const [addNotes, setAddNotes] = useState('')

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Generar días del mes para calendario
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=Dom

  // Items del mes actual
  const monthItems = items.filter(item => {
    const d = new Date(item.date)
    return d.getFullYear() === year && d.getMonth() === month
  })

  // Items por día
  const itemsByDay: Record<number, ContentItem[]> = {}
  monthItems.forEach(item => {
    const day = new Date(item.date).getDate()
    if (!itemsByDay[day]) itemsByDay[day] = []
    itemsByDay[day].push(item)
  })

  // Stats
  const totalItems = items.length
  const publishedCount = items.filter(i => i.status === 'publicado').length
  const pendingCount = items.filter(i => i.status === 'planificado' || i.status === 'en_proceso').length
  const thisMonthCount = monthItems.length

  function handleAddContent() {
    if (!addTitle || !addDate) { toast.error('Título y fecha son requeridos'); return }
    toast.success(`"${addTitle}" agregado al calendario`)
    setShowAddDialog(false)
    setAddTitle(''); setAddDate(''); setAddCaption(''); setAddNotes('')
  }

  return (
    <>
      <Tabs defaultValue="calendario">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
          <TabsTrigger value="lista">
            Lista
            <Badge variant="secondary" className="ml-2 text-xs">{items.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── CALENDARIO ───────────────────────────────────────── */}
        <TabsContent value="calendario" className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total planificado', value: totalItems, color: 'text-foreground' },
              { label: 'Este mes', value: thisMonthCount, color: 'text-primary' },
              { label: 'Publicados', value: publishedCount, color: 'text-green-600' },
              { label: 'Pendientes', value: pendingCount, color: 'text-amber-600' },
            ].map(k => (
              <Card key={k.label} className="glass border-primary/10">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cabecera de mes */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold">{MONTHS[month]} {year}</h3>
              {canManage && (
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Grid de calendario */}
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Cabecera días semana */}
            <div className="grid grid-cols-7 bg-muted/50">
              {DAYS_SHORT.map(d => (
                <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
            </div>
            {/* Días */}
            <div className="grid grid-cols-7 divide-x divide-border border-t border-border">
              {/* Celdas vacías antes del primer día */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] bg-muted/20" />
              ))}
              {/* Días del mes */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dayItems = itemsByDay[day] ?? []
                const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
                return (
                  <div key={day} className={`min-h-[80px] p-1.5 border-b border-border last:border-b-0 ${isToday ? 'bg-primary/5' : ''}`}>
                    <p className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-primary text-white' : 'text-muted-foreground'
                    }`}>{day}</p>
                    <div className="space-y-0.5">
                      {dayItems.slice(0, 2).map(item => {
                        const StatusIcon = STATUS_ICONS[item.status]
                        return (
                          <button
                            key={item.id}
                            className={`w-full text-left rounded px-1 py-0.5 text-xs truncate flex items-center gap-1 transition-opacity hover:opacity-80 ${STATUS_COLORS[item.status]}`}
                            onClick={() => setSelectedItem(item)}
                          >
                            <StatusIcon className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </button>
                        )
                      })}
                      {dayItems.length > 2 && (
                        <p className="text-xs text-muted-foreground pl-1">+{dayItems.length - 2} más</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── LISTA ────────────────────────────────────────────── */}
        <TabsContent value="lista" className="space-y-3">
          {['planificado', 'en_proceso', 'publicado'].map(status => {
            const statusItems = items.filter(i => i.status === status)
            if (statusItems.length === 0) return null
            const StatusIcon = STATUS_ICONS[status as ContentStatus]
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-2">
                  <StatusIcon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">{STATUS_LABELS[status as ContentStatus]}</h3>
                  <Badge variant="secondary" className="text-xs">{statusItems.length}</Badge>
                </div>
                <div className="space-y-2">
                  {statusItems.map(item => {
                    const CatIcon = CATEGORY_ICONS[item.category]
                    return (
                      <Card
                        key={item.id}
                        className="glass border-primary/10 cursor-pointer hover:border-primary/30 transition-colors"
                        onClick={() => setSelectedItem(item)}
                      >
                        <CardContent className="py-3 flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                            <CatIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{item.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                              </span>
                              <Badge variant="outline" className={`text-xs ${TYPE_COLORS[item.type]}`}>
                                {TYPE_LABELS[item.type]}
                              </Badge>
                              <div className="flex gap-1">
                                {item.platform.map(p => {
                                  const PIcon = PLATFORM_ICONS[p]
                                  return PIcon ? <PIcon key={p} className="h-3 w-3 text-muted-foreground" /> : null
                                })}
                              </div>
                            </div>
                          </div>
                          {item.assignedTo && (
                            <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                              {item.assignedTo.split(' ').slice(-2).join(' ')}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </TabsContent>
      </Tabs>

      {/* ── DIALOG: Detalle ──────────────────────────────────────── */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        {selectedItem && (() => {
          const CatIcon = CATEGORY_ICONS[selectedItem.category]
          const StatusIcon = STATUS_ICONS[selectedItem.status]
          return (
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CatIcon className="h-5 w-5 text-primary" />
                  {selectedItem.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs ${TYPE_COLORS[selectedItem.type]}`}>
                    {TYPE_LABELS[selectedItem.type]}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${STATUS_COLORS[selectedItem.status]}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {STATUS_LABELS[selectedItem.status]}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {CATEGORY_LABELS[selectedItem.category]}
                  </Badge>
                </div>

                <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Fecha:</span>
                    <span className="font-medium">
                      {new Date(selectedItem.date).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileImage className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Plataformas:</span>
                    <div className="flex gap-1.5">
                      {selectedItem.platform.map(p => {
                        const PIcon = PLATFORM_ICONS[p]
                        return PIcon ? <PIcon key={p} className="h-4 w-4 text-muted-foreground" /> : null
                      })}
                    </div>
                  </div>
                  {selectedItem.assignedTo && (
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Asignado a:</span>
                      <span className="font-medium">{selectedItem.assignedTo}</span>
                    </div>
                  )}
                  {selectedItem.templateUrl && (
                    <div className="flex items-center gap-2">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <a href={selectedItem.templateUrl} target="_blank" rel="noreferrer"
                        className="text-primary underline text-xs">
                        Ver template
                      </a>
                    </div>
                  )}
                </div>

                {selectedItem.caption && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Caption</p>
                    <p className="text-sm">{selectedItem.caption}</p>
                  </div>
                )}

                {selectedItem.notes && (
                  <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-xs text-amber-700">
                    {selectedItem.notes}
                  </div>
                )}
              </div>
              {canManage && (
                <DialogFooter className="gap-2">
                  <Button size="sm" variant="outline" className="flex-1"
                    onClick={() => { toast.info('Edición disponible en Fase 4'); setSelectedItem(null) }}>
                    Editar
                  </Button>
                  {selectedItem.status !== 'publicado' && (
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => { toast.success('Marcado como publicado'); setSelectedItem(null) }}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Marcar publicado
                    </Button>
                  )}
                </DialogFooter>
              )}
            </DialogContent>
          )
        })()}
      </Dialog>

      {/* ── DIALOG: Agregar ──────────────────────────────────────── */}
      {canManage && (
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Nueva publicación
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ct-title">Título *</Label>
                <Input id="ct-title" placeholder="Ej: Campaña prevención incendios" value={addTitle} onChange={e => setAddTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ct-date">Fecha *</Label>
                  <Input id="ct-date" type="date" value={addDate} onChange={e => setAddDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={addType} onValueChange={v => setAddType(v as ContentType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_LABELS) as ContentType[]).map(k => (
                        <SelectItem key={k} value={k}>{TYPE_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={addCategory} onValueChange={v => setAddCategory(v as ContentCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABELS) as ContentCategory[]).map(k => (
                      <SelectItem key={k} value={k}>{CATEGORY_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ct-caption">Caption <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Textarea id="ct-caption" rows={2} placeholder="Texto para la publicación..." value={addCaption} onChange={e => setAddCaption(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ct-notes">Notas internas <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input id="ct-notes" placeholder="Solo visible para el equipo" value={addNotes} onChange={e => setAddNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
              <Button onClick={handleAddContent} className="bg-primary hover:bg-primary/90 text-white">
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
