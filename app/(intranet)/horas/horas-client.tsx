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
import { Progress } from "@/components/ui/progress"
import {
  Clock, Plus, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, Users, Calendar, Download, Shield,
} from "lucide-react"
import { toast } from "sonner"

// ── Tipos ──────────────────────────────────────────────────────────
const HOUR_TYPES: Record<string, string> = {
  guardia_nocturna:     'Guardia Nocturna',
  emergencia:           'Emergencia',
  instruccion:          'Instrucción',
  administrativo:       'Administrativo',
  mantenimiento:        'Mantenimiento',
  evento_institucional: 'Evento Institucional',
  comision:             'Comisión',
}

const TYPE_COLORS: Record<string, string> = {
  guardia_nocturna:     'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
  emergencia:           'bg-red-500/10 text-red-700 border-red-500/20',
  instruccion:          'bg-blue-500/10 text-blue-700 border-blue-500/20',
  administrativo:       'bg-gray-500/10 text-gray-700 border-gray-500/20',
  mantenimiento:        'bg-amber-500/10 text-amber-700 border-amber-500/20',
  evento_institucional: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  comision:             'bg-teal-500/10 text-teal-700 border-teal-500/20',
}

const GRADE_LABELS: Record<string, string> = {
  aspirante: 'Aspirante', seccionario: 'Seccionario', subteniente: 'Subteniente',
  teniente: 'Teniente', capitan: 'Capitán', teniente_brigadier: 'Ten. Brigadier',
  brigadier: 'Brigadier', brigadier_mayor: 'Brig. Mayor', brigadier_general: 'Brig. General',
}

// ── Helpers ────────────────────────────────────────────────────────
function getComplianceColor(pct: number) {
  if (pct >= 100) return 'text-green-600'
  if (pct >= 60)  return 'text-amber-600'
  return 'text-red-600'
}
function getComplianceBg(pct: number) {
  if (pct >= 100) return 'bg-green-500'
  if (pct >= 60)  return 'bg-amber-500'
  return 'bg-red-500'
}
function getComplianceLabel(pct: number) {
  if (pct >= 100) return 'Cumple'
  if (pct >= 60)  return 'En riesgo'
  return 'Déficit'
}
function getComplianceBadge(pct: number) {
  if (pct >= 100) return 'bg-green-500/10 text-green-700 border-green-500/20'
  if (pct >= 60)  return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
  return 'bg-red-500/10 text-red-700 border-red-500/20'
}

// ── Props ──────────────────────────────────────────────────────────
interface RecentHour {
  id: string
  date: string
  type: string
  hours: number
  description: string
  verified: boolean
}
interface TeamMember {
  name: string
  grade: string
  hours: number
  guardias: number
  requiredHours: number
  requiredGuardias: number
}
interface PendingVerification {
  id: string
  profileName: string
  date: string
  type: string
  hours: number
  description: string
  submittedAt: string
}
interface MyHours {
  trimestre: string
  totalHoras: number
  guardias: number
  porTipo: Record<string, number>
}
interface Requisitos {
  horasTrimestrales: number
  guardiasTrimestrales: number
  label: string
}

interface HorasClientProps {
  myHours: MyHours
  recentHours: RecentHour[]
  teamSummary: TeamMember[]
  pendingVerification: PendingVerification[]
  requisitos: Requisitos
  grade: string
  currentUserName: string
  canVerify: boolean
  canManage: boolean
  canViewAll: boolean
}

// ── Componente principal ───────────────────────────────────────────
export function HorasClient({
  myHours,
  recentHours,
  teamSummary,
  pendingVerification,
  requisitos,
  grade,
  currentUserName,
  canVerify,
  canManage,
  canViewAll,
}: HorasClientProps) {
  const [showRegister, setShowRegister] = useState(false)
  const [formDate, setFormDate]         = useState('')
  const [formType, setFormType]         = useState('')
  const [formHours, setFormHours]       = useState('')
  const [formDesc, setFormDesc]         = useState('')
  const [pendingList, setPendingList]   = useState(pendingVerification)

  const horasPct     = Math.min(100, (myHours.totalHoras / requisitos.horasTrimestrales) * 100)
  const guardiasPct  = Math.min(100, (myHours.guardias   / requisitos.guardiasTrimestrales) * 100)

  function handleSubmitHours() {
    if (!formDate || !formType || !formHours) {
      toast.error('Completá fecha, tipo y horas')
      return
    }
    const h = parseFloat(formHours)
    if (isNaN(h) || h <= 0 || h > 24) {
      toast.error('Horas inválidas (0.5 – 24)')
      return
    }
    toast.success(`${h}h registradas — pendiente de verificación`)
    setShowRegister(false)
    setFormDate(''); setFormType(''); setFormHours(''); setFormDesc('')
  }

  function handleVerify(id: string, approved: boolean) {
    setPendingList(prev => prev.filter(p => p.id !== id))
    toast.success(approved ? 'Horas verificadas correctamente' : 'Horas rechazadas')
  }

  return (
    <>
      <Tabs defaultValue="mis-horas">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="mis-horas">Mis Horas</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          {(canViewAll || canManage) && (
            <TabsTrigger value="equipo">
              Equipo
              <Badge variant="secondary" className="ml-2 text-xs">{teamSummary.length}</Badge>
            </TabsTrigger>
          )}
          {canVerify && (
            <TabsTrigger value="verificacion">
              Verificación
              {pendingList.length > 0 && (
                <Badge className="ml-2 text-xs bg-amber-500/10 text-amber-700 border-amber-500/20">
                  {pendingList.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── MIS HORAS ─────────────────────────────────────────── */}
        <TabsContent value="mis-horas" className="space-y-5">

          {/* Acción rápida */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Trimestre actual: <span className="font-medium text-foreground">{myHours.trimestre}</span>
            </p>
            <Button onClick={() => setShowRegister(true)} className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Registrar horas
            </Button>
          </div>

          {/* KPIs cumplimiento NDR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Horas totales */}
            <Card className="glass border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Horas de servicio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <p className={`text-4xl font-bold ${getComplianceColor(horasPct)}`}>
                    {myHours.totalHoras}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    de {requisitos.horasTrimestrales}h requeridas
                  </p>
                </div>
                <div className="space-y-1">
                  <Progress value={horasPct} className="h-2" indicatorClassName={getComplianceBg(horasPct)} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{horasPct.toFixed(0)}% completado</span>
                    <Badge variant="outline" className={`text-xs ${getComplianceBadge(horasPct)}`}>
                      {getComplianceLabel(horasPct)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guardias nocturnas */}
            <Card className="glass border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Guardias nocturnas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <p className={`text-4xl font-bold ${getComplianceColor(guardiasPct)}`}>
                    {myHours.guardias}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    de {requisitos.guardiasTrimestrales} requeridas
                  </p>
                </div>
                <div className="space-y-1">
                  <Progress value={guardiasPct} className="h-2" indicatorClassName={getComplianceBg(guardiasPct)} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{guardiasPct.toFixed(0)}% completado</span>
                    <Badge variant="outline" className={`text-xs ${getComplianceBadge(guardiasPct)}`}>
                      {getComplianceLabel(guardiasPct)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Requisito NDR */}
          <Card className="glass border-primary/10">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Proceso: {requisitos.label}</p>
                  <p className="text-xs text-muted-foreground">
                    NDR Ascensos CGBVP — {GRADE_LABELS[grade]} · Requisito trimestral:{' '}
                    <span className="font-medium text-foreground">{requisitos.horasTrimestrales}h</span> +{' '}
                    <span className="font-medium text-foreground">{requisitos.guardiasTrimestrales} guardias</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distribución por tipo */}
          <Card className="glass border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Distribución por tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(myHours.porTipo)
                  .filter(([, h]) => h > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, hours]) => {
                    const pct = (hours / myHours.totalHoras) * 100
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <Badge variant="outline" className={`text-xs w-40 justify-center shrink-0 ${TYPE_COLORS[type]}`}>
                          {HOUR_TYPES[type]}
                        </Badge>
                        <div className="flex-1">
                          <Progress value={pct} className="h-1.5" />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{hours}h</span>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── HISTORIAL ─────────────────────────────────────────── */}
        <TabsContent value="historial" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Mostrando {recentHours.length} registros recientes
            </p>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Descripción</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Horas</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentHours.map(h => (
                    <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(h.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-xs ${TYPE_COLORS[h.type]}`}>
                          {HOUR_TYPES[h.type]}
                        </Badge>
                      </td>
                      <td className="p-3 hidden sm:table-cell text-muted-foreground max-w-xs truncate">
                        {h.description}
                      </td>
                      <td className="p-3 text-right font-medium">{h.hours}h</td>
                      <td className="p-3 text-center">
                        {h.verified ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            <CheckCircle2 className="inline h-3 w-3 mr-1 text-green-600" />Verificado ·{' '}
            <Clock className="inline h-3 w-3 mr-1 text-amber-500" />Pendiente de verificación
          </p>
        </TabsContent>

        {/* ── EQUIPO ────────────────────────────────────────────── */}
        {(canViewAll || canManage) && (
          <TabsContent value="equipo" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Cumplimiento NDR Ascensos — trimestre actual
              </p>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar reporte
              </Button>
            </div>

            <div className="space-y-3">
              {teamSummary.map((member, i) => {
                const hPct = Math.min(100, (member.hours / member.requiredHours) * 100)
                const gPct = Math.min(100, (member.guardias / member.requiredGuardias) * 100)
                const overall = Math.min(hPct, gPct)
                return (
                  <Card key={i} className="glass border-primary/10">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        {/* Semáforo */}
                        <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                          overall >= 100 ? 'bg-green-500' :
                          overall >= 60  ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-medium text-sm">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{GRADE_LABELS[member.grade]}</p>
                            </div>
                            <Badge variant="outline" className={`text-xs ${getComplianceBadge(overall)}`}>
                              {getComplianceLabel(overall)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Horas</span>
                                <span className={getComplianceColor(hPct)}>
                                  {member.hours}/{member.requiredHours}h
                                </span>
                              </div>
                              <Progress value={hPct} className="h-1.5" indicatorClassName={getComplianceBg(hPct)} />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Guardias</span>
                                <span className={getComplianceColor(gPct)}>
                                  {member.guardias}/{member.requiredGuardias}
                                </span>
                              </div>
                              <Progress value={gPct} className="h-1.5" indicatorClassName={getComplianceBg(gPct)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        )}

        {/* ── VERIFICACIÓN ──────────────────────────────────────── */}
        {canVerify && (
          <TabsContent value="verificacion" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Horas pendientes de verificación en tu sección.
            </p>

            {pendingList.length === 0 ? (
              <Card className="glass border-primary/10">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No hay horas pendientes de verificación.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingList.map(item => (
                  <Card key={item.id} className="glass border-amber-500/10">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{item.profileName}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-xs ${TYPE_COLORS[item.type]}`}>
                              {HOUR_TYPES[item.type]}
                            </Badge>
                            <span className="text-sm font-medium">{item.hours}h</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Enviado: {new Date(item.submittedAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleVerify(item.id, true)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-600 hover:bg-red-500/10"
                            onClick={() => handleVerify(item.id, false)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* ── DIALOG: Registrar horas ──────────────────────────────── */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Registrar horas de servicio
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hora-fecha">Fecha</Label>
                <Input
                  id="hora-fecha"
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora-horas">Horas</Label>
                <Input
                  id="hora-horas"
                  type="number"
                  placeholder="Ej: 12"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={formHours}
                  onChange={e => setFormHours(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de actividad</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(HOUR_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora-desc">Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Textarea
                id="hora-desc"
                placeholder="Ej: Guardia nocturna — Cama 3, Emergencia Av. Lima..."
                rows={2}
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Las guardias nocturnas se registran automáticamente al confirmar tu turno.
                Usá este formulario para emergencias, instrucción y actividades administrativas.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRegister(false)}>Cancelar</Button>
            <Button onClick={handleSubmitHours} className="bg-primary hover:bg-primary/90 text-white">
              Enviar para verificación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
