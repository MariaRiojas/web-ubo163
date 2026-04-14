"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Moon, CheckCircle2, XCircle, Clock, User, Bed,
  Calendar, ChevronLeft, ChevronRight, Settings,
} from "lucide-react"
import { toast } from "sonner"

type BedStatus = 'disponible' | 'ocupada' | 'mantenimiento'

interface Bed {
  id: string
  number: number
  sector: string
  status: BedStatus
  notes: string | null
}

interface Shift {
  id: string
  bedId: string
  date: string
  profileName: string
  status: string
}

interface Props {
  beds: Bed[]
  shifts: Shift[]
  canManage: boolean
  canReserve: boolean
  currentUserName: string
}

const STATUS_STYLES: Record<BedStatus, { bg: string; border: string; badge: string; label: string }> = {
  disponible: { bg: 'bg-green-500/5', border: 'border-green-500/20 hover:border-green-500/40', badge: 'bg-green-500/10 text-green-700 border-green-500/20', label: 'Disponible' },
  ocupada:    { bg: 'bg-primary/5',   border: 'border-primary/20',                              badge: 'bg-primary/10 text-primary border-primary/20',            label: 'Ocupada' },
  mantenimiento: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', badge: 'bg-amber-500/10 text-amber-700 border-amber-500/20', label: 'Mantenimiento' },
}

function getDateRange(offset: number = 0) {
  const start = new Date()
  start.setDate(start.getDate() + offset * 7)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
  return days
}

export function GuardiaNocturnaClient({ beds, shifts, canManage, canReserve, currentUserName }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [showReserveDialog, setShowReserveDialog] = useState(false)

  const days = getDateRange(weekOffset)
  const todayStr = new Date().toISOString().split('T')[0]

  // Camas actuales (hoy)
  const todayShifts = shifts.filter(s => s.date === todayStr)
  const bedsWithStatus: Bed[] = beds.map(bed => {
    const shift = todayShifts.find(s => s.bedId === bed.id)
    return shift ? { ...bed, status: 'ocupada' as BedStatus } : bed
  })

  const available = bedsWithStatus.filter(b => b.status === 'disponible').length
  const occupied = bedsWithStatus.filter(b => b.status === 'ocupada').length
  const maintenance = bedsWithStatus.filter(b => b.status === 'mantenimiento').length

  function handleBedClick(bed: Bed, date: string) {
    if (!canReserve) return
    if (bed.status !== 'disponible') return
    setSelectedBed(bed)
    setSelectedDate(date)
    setShowReserveDialog(true)
  }

  function handleReserve() {
    // En producción: server action reserveGuardShift()
    toast.success(`Reserva enviada — Cama ${selectedBed?.number}, ${selectedDate}`, {
      description: 'Pendiente de aprobación por jefatura.',
    })
    setShowReserveDialog(false)
  }

  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  return (
    <>
      <Tabs defaultValue="estado">
        <TabsList className="mb-6">
          <TabsTrigger value="estado">Estado de Camas</TabsTrigger>
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
          <TabsTrigger value="historial">Mi Historial</TabsTrigger>
          {canManage && <TabsTrigger value="admin">Administración</TabsTrigger>}
        </TabsList>

        {/* ESTADO DE CAMAS (hoy) */}
        <TabsContent value="estado" className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="glass border-green-500/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Bed className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{available}</p>
                  <p className="text-xs text-muted-foreground">Disponibles</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-primary/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Moon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{occupied}</p>
                  <p className="text-xs text-muted-foreground">Ocupadas</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-amber-500/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Settings className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{maintenance}</p>
                  <p className="text-xs text-muted-foreground">Mantenimiento</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grid de camas por sector */}
          {['Sector A', 'Sector B', 'Sector C'].map(sector => {
            const sectorBeds = bedsWithStatus.filter(b => b.sector === sector)
            return (
              <div key={sector}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{sector}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {sectorBeds.map(bed => {
                    const styles = STATUS_STYLES[bed.status]
                    const shift = todayShifts.find(s => s.bedId === bed.id)
                    const isClickable = bed.status === 'disponible' && canReserve

                    return (
                      <button
                        key={bed.id}
                        disabled={!isClickable}
                        onClick={() => handleBedClick(bed, todayStr)}
                        className={`p-4 rounded-xl border ${styles.bg} ${styles.border} transition-all text-left ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-bold">#{bed.number}</span>
                          <Badge variant="outline" className={`text-xs ${styles.badge}`}>
                            {styles.label}
                          </Badge>
                        </div>
                        {shift ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate">{shift.profileName.split(' ').slice(-2).join(' ')}</span>
                          </div>
                        ) : bed.status === 'mantenimiento' ? (
                          <p className="text-xs text-amber-600 truncate">{bed.notes}</p>
                        ) : (
                          <p className="text-xs text-green-600">
                            {canReserve ? 'Clic para reservar' : 'Libre'}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </TabsContent>

        {/* CALENDARIO SEMANAL */}
        <TabsContent value="calendario" className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium text-sm">
              {days[0].getDate()} {MONTH_NAMES[days[0].getMonth()]} — {days[6].getDate()} {MONTH_NAMES[days[6].getMonth()]} {days[6].getFullYear()}
            </span>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left text-muted-foreground font-medium w-16">Cama</th>
                  {days.map(d => {
                    const isToday = d.toISOString().split('T')[0] === todayStr
                    return (
                      <th key={d.toISOString()} className={`p-3 text-center font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div>{DAY_NAMES[d.getDay()]}</div>
                        <div className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>{d.getDate()}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {beds.filter(b => b.status !== 'mantenimiento').map(bed => (
                  <tr key={bed.id} className="hover:bg-muted/20">
                    <td className="p-3 font-medium text-center">#{bed.number}</td>
                    {days.map(d => {
                      const dateStr = d.toISOString().split('T')[0]
                      const shift = shifts.find(s => s.bedId === bed.id && s.date === dateStr)
                      const isPast = d < new Date(todayStr)
                      return (
                        <td key={dateStr} className="p-2 text-center">
                          {shift ? (
                            <div className={`text-xs px-2 py-1 rounded-lg ${
                              shift.status === 'confirmada'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-amber-500/10 text-amber-700'
                            }`}>
                              <p className="font-medium truncate max-w-[80px] mx-auto">
                                {shift.profileName.split(' ').pop()}
                              </p>
                              <p className="text-[10px] opacity-70">{shift.status}</p>
                            </div>
                          ) : !isPast && canReserve ? (
                            <button
                              onClick={() => handleBedClick(bed, dateStr)}
                              className="w-full h-8 rounded-lg border border-dashed border-green-500/30 text-green-600 text-xs hover:bg-green-500/5 transition-colors"
                            >
                              +
                            </button>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* HISTORIAL PERSONAL */}
        <TabsContent value="historial">
          <Card className="glass border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-primary" />
                Mis guardias — {currentUserName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shifts.filter(s => s.profileName === currentUserName).length > 0 ? (
                <div className="space-y-2">
                  {shifts.filter(s => s.profileName === currentUserName).map(shift => {
                    const bed = beds.find(b => b.id === shift.bedId)
                    return (
                      <div key={shift.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <Bed className="h-4 w-4 text-primary" />
                        <span className="font-medium">Cama #{bed?.number}</span>
                        <span className="text-muted-foreground text-sm">{shift.date}</span>
                        <Badge variant="outline" className={
                          shift.status === 'confirmada' ? 'text-green-700 border-green-500/30' :
                          shift.status === 'completada' ? 'text-muted-foreground' :
                          'text-amber-700 border-amber-500/30'
                        }>
                          {shift.status}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No tienes guardias registradas.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADMIN */}
        {canManage && (
          <TabsContent value="admin" className="space-y-4">
            <Card className="glass border-primary/10">
              <CardHeader>
                <CardTitle className="text-base">Reservas pendientes de aprobación</CardTitle>
              </CardHeader>
              <CardContent>
                {shifts.filter(s => s.status === 'reservada').length > 0 ? (
                  <div className="space-y-3">
                    {shifts.filter(s => s.status === 'reservada').map(shift => {
                      const bed = beds.find(b => b.id === shift.bedId)
                      return (
                        <div key={shift.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{shift.profileName}</p>
                            <p className="text-xs text-muted-foreground">
                              Cama #{bed?.number} · {bed?.sector} · {shift.date}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" className="text-green-700 border-green-500/30 hover:bg-green-500/10"
                            onClick={() => toast.success('Reserva aprobada')}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Aprobar
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => toast.error('Reserva rechazada')}>
                            <XCircle className="h-4 w-4 mr-1" /> Rechazar
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No hay reservas pendientes.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog de reserva */}
      <Dialog open={showReserveDialog} onOpenChange={setShowReserveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar reserva de guardia</DialogTitle>
            <DialogDescription>
              Estás reservando la cama #{selectedBed?.number} ({selectedBed?.sector}) para el {selectedDate}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Moon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Guardia nocturna</p>
                <p className="text-xs text-muted-foreground">20:00h – 08:00h del día siguiente</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">12 horas de servicio</p>
                <p className="text-xs text-muted-foreground">Se acreditarán automáticamente al completar</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              La reserva quedará pendiente de aprobación por jefatura.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReserveDialog(false)}>Cancelar</Button>
            <Button onClick={handleReserve} className="bg-primary hover:bg-primary/90 text-white">
              Confirmar reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
