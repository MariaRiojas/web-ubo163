"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { companyConfig } from "@/company.config"
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Users,
  GraduationCap,
  Shield,
  Flame,
  Bell,
  Wrench,
  Heart,
} from "lucide-react"

// ── Tipos ────────────────────────────────────────────────────────

type EventType =
  | "operativo"
  | "instruccion"
  | "institucional"
  | "comunitario"
  | "mantenimiento"
  | "salud"

interface ScheduleEvent {
  id: string
  date: string           // ISO yyyy-mm-dd
  time?: string          // "HH:MM"
  endTime?: string
  title: string
  description: string
  type: EventType
  location?: string
  organizer?: string
  audience?: "todos" | "efectivos" | "jefatura" | "publico"
  recurrent?: boolean
}

// ── Datos mock (en producción: fetch desde DB) ───────────────────

const EVENTS: ScheduleEvent[] = [
  // Abril 2026
  {
    id: "e1",
    date: "2026-04-15",
    time: "20:00",
    endTime: "08:00",
    title: "Guardia Nocturna",
    description: "Guardia mensual de efectivos. Personal asignado según rol de guardia.",
    type: "operativo",
    location: "Cuartel 163",
    organizer: "Jefatura",
    audience: "efectivos",
    recurrent: true,
  },
  {
    id: "e2",
    date: "2026-04-16",
    time: "09:00",
    endTime: "13:00",
    title: "Simulacro de Evacuación",
    description: "Simulacro de evacuación en el centro comercial principal de Ancón. Se invita a la comunidad a participar.",
    type: "comunitario",
    location: "C.C. Ancón Plaza",
    organizer: "Sección Operaciones",
    audience: "publico",
  },
  {
    id: "e3",
    date: "2026-04-19",
    time: "09:00",
    endTime: "17:00",
    title: "Taller ESBAS — Rescate Vertical",
    description: "Taller práctico de rescate vertical y descuelgue. Obligatorio para aspirantes y seccionarios.",
    type: "instruccion",
    location: "Patio de instrucción — Cuartel 163",
    organizer: "Sección Instrucción",
    audience: "efectivos",
  },
  {
    id: "e4",
    date: "2026-04-22",
    time: "20:00",
    title: "Reunión Mensual de Compañía",
    description: "Reunión mensual obligatoria de todos los efectivos. Informe de gestión, comunicados y temas institucionales.",
    type: "institucional",
    location: "Sala de reuniones — Cuartel 163",
    organizer: "Primer Jefe",
    audience: "efectivos",
    recurrent: true,
  },
  {
    id: "e5",
    date: "2026-04-26",
    time: "08:00",
    endTime: "12:00",
    title: "Mantenimiento de Unidades",
    description: "Mantenimiento preventivo mensual de autobombas y unidades de rescate.",
    type: "mantenimiento",
    location: "Taller — Cuartel 163",
    organizer: "Sección Máquinas",
    audience: "efectivos",
    recurrent: true,
  },
  // Mayo 2026
  {
    id: "e6",
    date: "2026-05-04",
    time: "09:00",
    endTime: "13:00",
    title: "Campaña de Primeros Auxilios",
    description: "Capacitación en primeros auxilios y RCP básico para la comunidad. Inscripción gratuita.",
    type: "comunitario",
    location: "Parque Municipal de Ancón",
    organizer: "Sección Prehospitalaria",
    audience: "publico",
  },
  {
    id: "e7",
    date: "2026-05-07",
    time: "20:00",
    endTime: "08:00",
    title: "Guardia Nocturna",
    description: "Guardia mensual de efectivos.",
    type: "operativo",
    location: "Cuartel 163",
    organizer: "Jefatura",
    audience: "efectivos",
    recurrent: true,
  },
  {
    id: "e8",
    date: "2026-05-10",
    time: "09:00",
    endTime: "17:00",
    title: "Examen ESBAS — Módulo 1",
    description: "Evaluación teórica y práctica del módulo 1: Fundamentos de la organización bomberil.",
    type: "instruccion",
    location: "Aula — Cuartel 163",
    organizer: "Sección Instrucción",
    audience: "efectivos",
  },
  {
    id: "e9",
    date: "2026-05-15",
    time: "18:00",
    title: "Aniversario de la Compañía",
    description: `Celebración del ${new Date().getFullYear() - companyConfig.foundedYear}° aniversario de la Compañía de Bomberos Voluntarios Ancón. Ceremonia oficial con presencia de autoridades.`,
    type: "institucional",
    location: "Cuartel 163 y Plaza de Armas de Ancón",
    organizer: "Jefatura",
    audience: "publico",
  },
  {
    id: "e10",
    date: "2026-05-20",
    time: "20:00",
    title: "Reunión Mensual de Compañía",
    description: "Reunión mensual obligatoria de todos los efectivos.",
    type: "institucional",
    location: "Sala de reuniones — Cuartel 163",
    organizer: "Primer Jefe",
    audience: "efectivos",
    recurrent: true,
  },
  {
    id: "e11",
    date: "2026-05-24",
    time: "08:00",
    endTime: "12:00",
    title: "Mantenimiento de Unidades",
    description: "Mantenimiento preventivo mensual de autobombas y unidades de rescate.",
    type: "mantenimiento",
    location: "Taller — Cuartel 163",
    organizer: "Sección Máquinas",
    audience: "efectivos",
    recurrent: true,
  },
  {
    id: "e12",
    date: "2026-05-28",
    time: "09:00",
    endTime: "17:00",
    title: "Taller de Manejo Defensivo",
    description: "Capacitación en manejo defensivo y conducción de vehículos de emergencia.",
    type: "instruccion",
    location: "Pista de entrenamiento — Ancón",
    organizer: "Sección Máquinas",
    audience: "efectivos",
  },
  // Junio 2026
  {
    id: "e13",
    date: "2026-06-06",
    time: "08:00",
    endTime: "12:00",
    title: "Día de la Salud del Bombero",
    description: "Jornada médica interna: chequeo médico anual, examen visual y odontológico para todos los efectivos.",
    type: "salud",
    location: "Centro de salud — Ancón",
    organizer: "Sección Prehospitalaria",
    audience: "efectivos",
  },
  {
    id: "e14",
    date: "2026-06-10",
    time: "20:00",
    endTime: "08:00",
    title: "Guardia Nocturna",
    description: "Guardia mensual de efectivos.",
    type: "operativo",
    location: "Cuartel 163",
    organizer: "Jefatura",
    audience: "efectivos",
    recurrent: true,
  },
  {
    id: "e15",
    date: "2026-06-14",
    time: "09:00",
    endTime: "17:00",
    title: "Simulacro Intercompañías",
    description: "Simulacro de incendio estructural en conjunto con las compañías vecinas. Evaluado por la Comandancia Departamental.",
    type: "operativo",
    location: "Zona industrial — Ancón",
    organizer: "Comandancia Departamental Lima Norte",
    audience: "efectivos",
  },
  {
    id: "e16",
    date: "2026-06-17",
    time: "20:00",
    title: "Reunión Mensual de Compañía",
    description: "Reunión mensual obligatoria de todos los efectivos.",
    type: "institucional",
    location: "Sala de reuniones — Cuartel 163",
    organizer: "Primer Jefe",
    audience: "efectivos",
    recurrent: true,
  },
  {
    id: "e17",
    date: "2026-06-20",
    time: "09:00",
    endTime: "13:00",
    title: "Feria de Prevención de Incendios",
    description: "Campaña comunitaria de prevención de incendios en hogares. Inspecciones gratuitas y charlas informativas.",
    type: "comunitario",
    location: "Plaza de Armas de Ancón",
    organizer: "Sección Imagen",
    audience: "publico",
  },
  {
    id: "e18",
    date: "2026-06-28",
    time: "08:00",
    endTime: "12:00",
    title: "Mantenimiento de Unidades",
    description: "Mantenimiento preventivo mensual de autobombas y unidades de rescate.",
    type: "mantenimiento",
    location: "Taller — Cuartel 163",
    organizer: "Sección Máquinas",
    audience: "efectivos",
    recurrent: true,
  },
]

// ── Config de tipos ───────────────────────────────────────────────

const TYPE_CONFIG: Record<EventType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  operativo:      { label: "Operativo",     color: "text-red-600",    bg: "bg-red-100 dark:bg-red-900/30",    icon: Flame },
  instruccion:    { label: "Instrucción",   color: "text-blue-600",   bg: "bg-blue-100 dark:bg-blue-900/30",  icon: GraduationCap },
  institucional:  { label: "Institucional", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", icon: Shield },
  comunitario:    { label: "Comunitario",   color: "text-green-600",  bg: "bg-green-100 dark:bg-green-900/30", icon: Users },
  mantenimiento:  { label: "Mantenimiento", color: "text-amber-600",  bg: "bg-amber-100 dark:bg-amber-900/30", icon: Wrench },
  salud:          { label: "Salud",         color: "text-pink-600",   bg: "bg-pink-100 dark:bg-pink-900/30",  icon: Heart },
}

const AUDIENCE_LABEL: Record<string, string> = {
  todos: "Todos",
  efectivos: "Solo efectivos",
  jefatura: "Jefatura",
  publico: "Público general",
}

// ── Helpers ───────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

function getEventsForDate(date: string): ScheduleEvent[] {
  return EVENTS.filter((e) => e.date === date)
}

function getEventsForMonth(year: number, month: number): ScheduleEvent[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
  return EVENTS.filter((e) => e.date.startsWith(prefix))
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return `${d} de ${MONTH_NAMES[m - 1]} ${y}`
}

// ── Componente principal ──────────────────────────────────────────

export default function CronogramaPage() {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<EventType | "todos">("todos")

  const monthEvents = getEventsForMonth(currentYear, currentMonth)
  const filteredEvents = filterType === "todos"
    ? monthEvents
    : monthEvents.filter((e) => e.type === filterType)

  const selectedEvents = selectedDate
    ? getEventsForDate(selectedDate).filter((e) => filterType === "todos" || e.type === filterType)
    : []

  // Construir la grilla del mes
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11) }
    else setCurrentMonth(m => m - 1)
    setSelectedDate(null)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0) }
    else setCurrentMonth(m => m + 1)
    setSelectedDate(null)
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  return (
    <>
      {/* Hero */}
      <section className="relative py-20 md:py-28 bg-gradient-to-r from-primary to-red-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <Badge className="mb-6 bg-white/20 backdrop-blur-sm border-white/30 text-white text-sm">
            Agenda Institucional
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Cronograma de Actividades
          </h1>
          <p className="text-lg text-red-100 max-w-2xl">
            Calendario institucional de {companyConfig.shortName}. Conoce nuestras actividades operativas,
            de instrucción, comunitarias y eventos públicos.
          </p>
        </div>
      </section>

      <main className="flex-1 py-12 md:py-16">
        <div className="container mx-auto px-4">

          {/* Filtros por tipo */}
          <div className="flex flex-wrap gap-2 mb-8">
            <Button
              size="sm"
              variant={filterType === "todos" ? "default" : "outline"}
              onClick={() => setFilterType("todos")}
              className={filterType === "todos" ? "bg-primary text-white" : ""}
            >
              Todos
            </Button>
            {(Object.keys(TYPE_CONFIG) as EventType[]).map((type) => {
              const cfg = TYPE_CONFIG[type]
              return (
                <Button
                  key={type}
                  size="sm"
                  variant={filterType === type ? "default" : "outline"}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "gap-1.5",
                    filterType === type ? "bg-primary text-white" : ""
                  )}
                >
                  <cfg.icon className="h-3.5 w-3.5" />
                  {cfg.label}
                </Button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendario */}
            <div className="lg:col-span-2">
              <Card className="glass border-primary/10">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">
                      {MONTH_NAMES[currentMonth]} {currentYear}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Cabecera días */}
                  <div className="grid grid-cols-7 mb-2">
                    {DAY_NAMES.map((d) => (
                      <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Grilla */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Celdas vacías al inicio */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}

                    {/* Días del mes */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1
                      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                      const dayEvents = getEventsForDate(dateStr).filter(
                        (e) => filterType === "todos" || e.type === filterType
                      )
                      const isToday = dateStr === todayStr
                      const isSelected = dateStr === selectedDate
                      const hasEvents = dayEvents.length > 0

                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                          className={cn(
                            "relative aspect-square rounded-lg text-sm font-medium transition-all flex flex-col items-center justify-start pt-1.5 gap-0.5",
                            isSelected && "ring-2 ring-primary bg-primary/10",
                            isToday && !isSelected && "bg-primary text-white font-bold",
                            !isToday && !isSelected && "hover:bg-muted",
                            !hasEvents && "text-muted-foreground"
                          )}
                        >
                          <span>{day}</span>
                          {hasEvents && (
                            <div className="flex gap-0.5 flex-wrap justify-center">
                              {dayEvents.slice(0, 3).map((ev) => (
                                <span
                                  key={ev.id}
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    TYPE_CONFIG[ev.type].color.replace("text-", "bg-")
                                  )}
                                />
                              ))}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Leyenda */}
                  <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-3">
                    {(Object.entries(TYPE_CONFIG) as [EventType, typeof TYPE_CONFIG[EventType]][]).map(([type, cfg]) => (
                      <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("w-2 h-2 rounded-full", cfg.color.replace("text-", "bg-"))} />
                        {cfg.label}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Panel lateral */}
            <div className="space-y-4">
              {/* Detalle del día seleccionado */}
              {selectedDate && (
                <Card className="glass border-primary/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      {formatDate(selectedDate)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin actividades para este filtro.</p>
                    ) : (
                      selectedEvents.map((ev) => {
                        const cfg = TYPE_CONFIG[ev.type]
                        return (
                          <div key={ev.id} className={cn("rounded-lg p-3 space-y-2", cfg.bg)}>
                            <div className="flex items-start gap-2">
                              <cfg.icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color)} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold leading-tight">{ev.title}</p>
                                {ev.time && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Clock className="h-3 w-3" />
                                    {ev.time}{ev.endTime ? ` — ${ev.endTime}` : ""}
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{ev.description}</p>
                            {ev.location && (
                              <p className="text-xs flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {ev.location}
                              </p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={cn("text-xs", cfg.color)}>
                                {cfg.label}
                              </Badge>
                              {ev.audience && (
                                <Badge variant="secondary" className="text-xs">
                                  {AUDIENCE_LABEL[ev.audience]}
                                </Badge>
                              )}
                              {ev.recurrent && (
                                <Badge variant="secondary" className="text-xs">
                                  Recurrente
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Próximas actividades */}
              <Card className="glass border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Próximas Actividades
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filteredEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin actividades este mes.</p>
                  ) : (
                    filteredEvents
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .slice(0, 6)
                      .map((ev) => {
                        const cfg = TYPE_CONFIG[ev.type]
                        const [, , d] = ev.date.split("-")
                        return (
                          <button
                            key={ev.id}
                            className="w-full text-left flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                            onClick={() => setSelectedDate(ev.date)}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                              cfg.bg, cfg.color
                            )}>
                              {d}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{ev.title}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <cfg.icon className="h-3 w-3" />
                                {cfg.label}
                                {ev.time && <span>· {ev.time}</span>}
                              </p>
                            </div>
                          </button>
                        )
                      })
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Resumen del mes */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(Object.entries(TYPE_CONFIG) as [EventType, typeof TYPE_CONFIG[EventType]][]).map(([type, cfg]) => {
              const count = monthEvents.filter((e) => e.type === type).length
              return (
                <Card key={type} className={cn("glass border-primary/10 text-center", count === 0 && "opacity-50")}>
                  <CardContent className="pt-4 pb-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2", cfg.bg)}>
                      <cfg.icon className={cn("h-5 w-5", cfg.color)} />
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs text-muted-foreground">{cfg.label}</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>

    </>
  )
}
