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
  Package, Plus, Search, AlertTriangle, CheckCircle2,
  Wrench, Car, Shield, Radio, Stethoscope, Sword, FlaskConical,
  Box, Sofa, User, Calendar, MapPin, Hash, ClipboardEdit,
} from "lucide-react"
import { toast } from "sonner"
import type { InventoryItem, InventoryCategory, InventoryCondition } from "./page"

// ── Etiquetas ──────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  epp: 'EPP',
  herramienta: 'Herramienta',
  vehiculo: 'Vehículo',
  comunicacion: 'Comunicación',
  medico: 'Médico',
  rescate: 'Rescate',
  hazmat: 'HazMat',
  insumo: 'Insumo',
  mobiliario: 'Mobiliario',
}

const CATEGORY_ICONS: Record<InventoryCategory, React.ElementType> = {
  epp: Shield,
  herramienta: Wrench,
  vehiculo: Car,
  comunicacion: Radio,
  medico: Stethoscope,
  rescate: Sword,
  hazmat: FlaskConical,
  insumo: Box,
  mobiliario: Sofa,
}

const CATEGORY_COLORS: Record<InventoryCategory, string> = {
  epp: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  herramienta: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  vehiculo: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
  comunicacion: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
  medico: 'bg-red-500/10 text-red-700 border-red-500/20',
  rescate: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  hazmat: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  insumo: 'bg-green-500/10 text-green-700 border-green-500/20',
  mobiliario: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
}

const CONDITION_LABELS: Record<InventoryCondition, string> = {
  operativo: 'Operativo',
  mantenimiento: 'Mantenimiento',
  baja: 'Baja',
  pendiente_revision: 'Pdte. Revisión',
}

const CONDITION_COLORS: Record<InventoryCondition, string> = {
  operativo: 'bg-green-500/10 text-green-700 border-green-500/20',
  mantenimiento: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  baja: 'bg-red-500/10 text-red-700 border-red-500/20',
  pendiente_revision: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
}

// ── Props ──────────────────────────────────────────────────────────
interface InventarioClientProps {
  items: InventoryItem[]
  myItems: InventoryItem[]
  maintenanceItems: InventoryItem[]
  canManage: boolean
  currentUserName: string
}

// ── Tabla de inventario ────────────────────────────────────────────
function InventoryTable({
  items,
  onSelect,
}: {
  items: InventoryItem[]
  onSelect: (item: InventoryItem) => void
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>No se encontraron items.</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Equipo</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Sección</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Estado</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Próx. Mantenimiento</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Cant.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map(item => {
              const Icon = CATEGORY_ICONS[item.category]
              const isOverdue = item.nextMaintenance && new Date(item.nextMaintenance) < new Date()
              return (
                <tr
                  key={item.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onSelect(item)}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`rounded-lg p-1.5 shrink-0 ${CATEGORY_COLORS[item.category]}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="font-medium leading-tight">{item.name}</p>
                        {item.serialNumber && (
                          <p className="text-xs text-muted-foreground">{item.serialNumber}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className="text-muted-foreground text-xs">{item.section}</span>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className={`text-xs ${CONDITION_COLORS[item.condition]}`}>
                      {CONDITION_LABELS[item.condition]}
                    </Badge>
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    {item.nextMaintenance ? (
                      <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        {isOverdue && '⚠ '}
                        {new Date(item.nextMaintenance).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-medium">{item.quantity}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────
export function InventarioClient({
  items,
  myItems,
  maintenanceItems,
  canManage,
  currentUserName,
}: InventarioClientProps) {
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterCondition, setFilterCondition] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addName, setAddName] = useState('')
  const [addCategory, setAddCategory] = useState<InventoryCategory>('herramienta')
  const [addSerial, setAddSerial] = useState('')
  const [addQty, setAddQty] = useState('1')
  const [addLocation, setAddLocation] = useState('')
  const [addNotes, setAddNotes] = useState('')

  // Filtrado
  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.serialNumber?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      item.section.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCategory === 'all' || item.category === filterCategory
    const matchCond = filterCondition === 'all' || item.condition === filterCondition
    return matchSearch && matchCat && matchCond
  })

  // KPIs
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const operativeCount = items.filter(i => i.condition === 'operativo').length
  const attentionCount = items.filter(i => i.condition !== 'operativo').length
  const overdueCount = items.filter(i => i.nextMaintenance && new Date(i.nextMaintenance) < new Date()).length

  function handleAddItem() {
    if (!addName || !addCategory) { toast.error('Nombre y categoría son requeridos'); return }
    toast.success(`"${addName}" agregado al inventario — pendiente de confirmación en DB`)
    setShowAddDialog(false)
    setAddName(''); setAddSerial(''); setAddQty('1'); setAddLocation(''); setAddNotes('')
  }

  return (
    <>
      <Tabs defaultValue="todo">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="todo">
            Todo
            <Badge variant="secondary" className="ml-2 text-xs">{items.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="mantenimiento">
            Atención
            {maintenanceItems.length > 0 && (
              <Badge className="ml-2 text-xs bg-amber-500/10 text-amber-700 border-amber-500/20">
                {maintenanceItems.length}
              </Badge>
            )}
          </TabsTrigger>
          {myItems.length > 0 && (
            <TabsTrigger value="mi-epp">
              Mi EPP
              <Badge variant="secondary" className="ml-2 text-xs">{myItems.length}</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── TODO ─────────────────────────────────────────────── */}
        <TabsContent value="todo" className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total items', value: items.length, sub: `${totalItems} unidades`, color: 'text-foreground' },
              { label: 'Operativos', value: operativeCount, sub: `${Math.round(operativeCount/items.length*100)}% del total`, color: 'text-green-600' },
              { label: 'Necesitan atención', value: attentionCount, sub: 'No operativos', color: attentionCount > 0 ? 'text-amber-600' : 'text-muted-foreground' },
              { label: 'Mantenimiento vencido', value: overdueCount, sub: 'Fecha superada', color: overdueCount > 0 ? 'text-red-600' : 'text-muted-foreground' },
            ].map(kpi => (
              <Card key={kpi.label} className="glass border-primary/10">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, serie, sección..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {(Object.keys(CATEGORY_LABELS) as InventoryCategory[]).map(k => (
                  <SelectItem key={k} value={k}>{CATEGORY_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCondition} onValueChange={setFilterCondition}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {(Object.keys(CONDITION_LABELS) as InventoryCondition[]).map(k => (
                  <SelectItem key={k} value={k}>{CONDITION_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManage && (
              <Button onClick={() => setShowAddDialog(true)} className="bg-primary hover:bg-primary/90 text-white ml-auto">
                <Plus className="h-4 w-4 mr-2" />
                Agregar item
              </Button>
            )}
          </div>

          <InventoryTable items={filtered} onSelect={setSelectedItem} />
        </TabsContent>

        {/* ── ATENCIÓN ─────────────────────────────────────────── */}
        <TabsContent value="mantenimiento" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Items con condición no operativa o con mantenimiento próximo/vencido.
          </p>
          {maintenanceItems.length === 0 ? (
            <Card className="glass border-primary/10">
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30 text-green-500" />
                <p>No hay items que requieran atención inmediata.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {maintenanceItems.map(item => {
                const isOverdue = item.nextMaintenance && new Date(item.nextMaintenance) < new Date()
                const Icon = CATEGORY_ICONS[item.category]
                return (
                  <Card
                    key={item.id}
                    className={`glass border cursor-pointer hover:border-primary/30 transition-colors ${
                      item.condition !== 'operativo' ? 'border-amber-500/20' : 'border-primary/10'
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <CardContent className="pt-4 flex items-start gap-3">
                      <div className={`rounded-lg p-2 shrink-0 ${CATEGORY_COLORS[item.category]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <p className="font-medium text-sm">{item.name}</p>
                          <Badge variant="outline" className={`text-xs shrink-0 ${CONDITION_COLORS[item.condition]}`}>
                            {CONDITION_LABELS[item.condition]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.section}</p>
                        {item.nextMaintenance && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <AlertTriangle className={`h-3 w-3 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`} />
                            <span className={isOverdue ? 'text-red-600 font-medium' : 'text-amber-600'}>
                              {isOverdue ? 'Vencido: ' : 'Mantenimiento: '}
                              {new Date(item.nextMaintenance).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── MI EPP ───────────────────────────────────────────── */}
        {myItems.length > 0 && (
          <TabsContent value="mi-epp" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Equipos de protección personal asignados a {currentUserName}.
            </p>
            {myItems.map(item => {
              const Icon = CATEGORY_ICONS[item.category]
              return (
                <Card
                  key={item.id}
                  className="glass border-primary/10 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="pt-4 flex items-center gap-3">
                    <div className={`rounded-lg p-2 shrink-0 ${CATEGORY_COLORS[item.category]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.serialNumber ?? 'Sin serie'}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${CONDITION_COLORS[item.condition]}`}>
                      {CONDITION_LABELS[item.condition]}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>
        )}
      </Tabs>

      {/* ── DIALOG: Detalle de item ──────────────────────────────── */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        {selectedItem && (() => {
          const Icon = CATEGORY_ICONS[selectedItem.category]
          return (
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={`rounded-lg p-2 ${CATEGORY_COLORS[selectedItem.category]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {selectedItem.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Categoría</p>
                    <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[selectedItem.category]}`}>
                      {CATEGORY_LABELS[selectedItem.category]}
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <Badge variant="outline" className={`text-xs ${CONDITION_COLORS[selectedItem.condition]}`}>
                      {CONDITION_LABELS[selectedItem.condition]}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 rounded-lg bg-muted/30 p-3">
                  {[
                    { icon: Hash, label: 'N° de serie', value: selectedItem.serialNumber },
                    { icon: Package, label: 'Cantidad', value: selectedItem.quantity.toString() },
                    { icon: MapPin, label: 'Ubicación', value: selectedItem.location },
                    { icon: User, label: 'Asignado a', value: selectedItem.assignedTo },
                    { icon: Calendar, label: 'Último mantenimiento', value: selectedItem.lastMaintenance ? new Date(selectedItem.lastMaintenance).toLocaleDateString('es-PE') : null },
                    { icon: Calendar, label: 'Próx. mantenimiento', value: selectedItem.nextMaintenance ? new Date(selectedItem.nextMaintenance).toLocaleDateString('es-PE') : null },
                  ].filter(r => r.value).map(({ icon: RowIcon, label, value }) => (
                    <div key={label} className="flex items-center gap-2">
                      <RowIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{label}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                {selectedItem.notes && (
                  <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-xs text-amber-700">
                    {selectedItem.notes}
                  </div>
                )}
              </div>
              {canManage && (
                <DialogFooter>
                  <Button
                    size="sm"
                    className="w-full"
                    variant="outline"
                    onClick={() => { toast.info('Edición de item — disponible en Fase 4'); setSelectedItem(null) }}
                  >
                    <ClipboardEdit className="h-4 w-4 mr-2" />
                    Editar item
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          )
        })()}
      </Dialog>

      {/* ── DIALOG: Agregar item ─────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Agregar al inventario
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inv-name">Nombre del equipo *</Label>
              <Input id="inv-name" placeholder="Ej: Extintor CO2 5kg" value={addName} onChange={e => setAddName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoría *</Label>
                <Select value={addCategory} onValueChange={v => setAddCategory(v as InventoryCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABELS) as InventoryCategory[]).map(k => (
                      <SelectItem key={k} value={k}>{CATEGORY_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-qty">Cantidad</Label>
                <Input id="inv-qty" type="number" min="1" value={addQty} onChange={e => setAddQty(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="inv-serial">N° de serie</Label>
                <Input id="inv-serial" placeholder="Opcional" value={addSerial} onChange={e => setAddSerial(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-loc">Ubicación</Label>
                <Input id="inv-loc" placeholder="Ej: Bahía 1" value={addLocation} onChange={e => setAddLocation(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-notes">Notas <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Textarea id="inv-notes" rows={2} placeholder="Observaciones relevantes..." value={addNotes} onChange={e => setAddNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddItem} className="bg-primary hover:bg-primary/90 text-white">
              Guardar item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
