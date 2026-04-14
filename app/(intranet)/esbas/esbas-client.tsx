"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  GraduationCap, Lock, CheckCircle2, Play, Star, Award,
  Clock, Target, Flame, Shield, HeartPulse, AlertTriangle, Trophy,
  ChevronRight, Users, ClipboardList, BookOpen,
} from "lucide-react"
import { toast } from "sonner"
import type { Lesson, Specialty } from "@/data/esbas-courses"
import { calculateProgress } from "@/data/esbas-courses"

// ── Helpers ────────────────────────────────────────────────────────
const DIFFICULTY_COLORS: Record<string, string> = {
  basico: 'bg-green-500/10 text-green-700 border-green-500/20',
  intermedio: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  avanzado: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
}
const DIFFICULTY_LABELS: Record<string, string> = {
  basico: 'Básico', intermedio: 'Intermedio', avanzado: 'Avanzado',
}

const SPECIALTY_ICONS: Record<string, React.ElementType> = {
  basico: Shield,
  rescate: HeartPulse,
  incendios: Flame,
  materiales_peligrosos: AlertTriangle,
  primeros_auxilios: HeartPulse,
  instructor: GraduationCap,
}

const SPECIALTY_COLORS: Record<string, string> = {
  basico: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  rescate: 'bg-green-500/10 text-green-700 border-green-500/20',
  incendios: 'bg-red-500/10 text-red-700 border-red-500/20',
  materiales_peligrosos: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  primeros_auxilios: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  instructor: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
}

// ── Props ──────────────────────────────────────────────────────────
interface Student {
  id: string
  name: string
  dni: string
  completedLessons: number[]
  inProgress: number | null
}

interface EsbasClientProps {
  lessons: Lesson[]
  specialties: Specialty[]
  completedIds: number[]
  inProgressId: number | null
  availableLessons: Lesson[]
  unlockedSpecialties: Specialty[]
  progress: { percentage: number; current: number; total: number }
  canManage: boolean
  canInstruct: boolean
  grade: string
  userName: string
  students: Student[]
}

// ── Componente principal ───────────────────────────────────────────
export function EsbasClient({
  lessons,
  specialties,
  completedIds,
  inProgressId,
  availableLessons,
  unlockedSpecialties,
  progress,
  canManage,
  canInstruct,
  grade,
  userName,
  students,
}: EsbasClientProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [activeTab, setActiveTab] = useState<'teoria' | 'practica' | 'evaluacion'>('teoria')

  function getLessonStatus(lesson: Lesson) {
    if (completedIds.includes(lesson.id)) return 'completada'
    if (lesson.id === inProgressId) return 'en_curso'
    if (availableLessons.some(l => l.id === lesson.id)) return 'disponible'
    return 'bloqueada'
  }

  function handleStartLesson(lesson: Lesson) {
    const status = getLessonStatus(lesson)
    if (status === 'bloqueada') { toast.error('Completá la lección prerrequisito primero'); return }
    setSelectedLesson(lesson)
    setActiveTab('teoria')
  }

  function handleMarkComplete(lessonId: number) {
    toast.success(`Lección ${lessonId} marcada como completada — pendiente de confirmación en DB`)
    setSelectedLesson(null)
  }

  // Agrupar lecciones en niveles
  const LEVEL_GROUPS = [
    { label: 'Nivel Básico', range: [1, 10], color: 'text-green-600' },
    { label: 'Nivel Intermedio', range: [11, 20], color: 'text-blue-600' },
    { label: 'Nivel Avanzado', range: [21, 30], color: 'text-purple-600' },
  ]

  return (
    <>
      <Tabs defaultValue="progreso">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="progreso">Mi Progreso</TabsTrigger>
          <TabsTrigger value="lecciones">Malla Curricular</TabsTrigger>
          {(canManage || canInstruct) && (
            <TabsTrigger value="instruccion">
              Instrucción
              <Badge variant="secondary" className="ml-2 text-xs">{students.length}</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── MI PROGRESO ───────────────────────────────────────── */}
        <TabsContent value="progreso" className="space-y-5">

          {/* Progress card */}
          <Card className="glass border-primary/10">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-sm font-medium">Progreso total ESBAS</p>
                  <p className="text-xs text-muted-foreground">
                    {progress.current} de {progress.total} lecciones completadas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{progress.percentage}%</p>
                  {inProgressId && (
                    <p className="text-xs text-muted-foreground">
                      Lección {inProgressId} en curso
                    </p>
                  )}
                </div>
              </div>
              <Progress value={progress.percentage} className="h-3" />
              <div className="grid grid-cols-3 gap-3 pt-1">
                {LEVEL_GROUPS.map(group => {
                  const groupLessons = lessons.filter(l => l.id >= group.range[0] && l.id <= group.range[1])
                  const groupCompleted = groupLessons.filter(l => completedIds.includes(l.id)).length
                  const pct = Math.round(groupCompleted / groupLessons.length * 100)
                  return (
                    <div key={group.label} className="rounded-lg bg-muted/30 p-3 text-center">
                      <p className={`text-lg font-bold ${group.color}`}>{pct}%</p>
                      <p className="text-xs text-muted-foreground">{group.label}</p>
                      <p className="text-xs text-muted-foreground">{groupCompleted}/{groupLessons.length}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Especialidades */}
          <div>
            <h3 className="text-sm font-medium mb-3">Especialidades</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {specialties.map(spec => {
                const isUnlocked = unlockedSpecialties.some(s => s.id === spec.id)
                const Icon = SPECIALTY_ICONS[spec.id] ?? Award
                return (
                  <Card
                    key={spec.id}
                    className={`glass border transition-colors ${
                      isUnlocked ? 'border-primary/20' : 'border-border opacity-50'
                    }`}
                  >
                    <CardContent className="pt-4 flex flex-col items-center text-center gap-2">
                      <div className={`rounded-full p-3 ${isUnlocked ? SPECIALTY_COLORS[spec.id] ?? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {isUnlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-xs font-medium leading-tight">{spec.name}</p>
                        <p className="text-xs text-muted-foreground">Lección {spec.unlockedAt}</p>
                      </div>
                      {isUnlocked && (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Desbloqueada
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Próxima lección disponible */}
          {availableLessons.length > 0 && (
            <Card className="glass border-primary/20 bg-primary/5">
              <CardContent className="pt-4 flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <Play className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Próxima lección disponible</p>
                  <p className="font-medium text-sm">
                    {availableLessons.find(l => !completedIds.includes(l.id))?.title ?? 'Todas completadas'}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white shrink-0"
                  onClick={() => {
                    const next = availableLessons.find(l => !completedIds.includes(l.id))
                    if (next) handleStartLesson(next)
                  }}
                >
                  Continuar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── MALLA CURRICULAR ──────────────────────────────────── */}
        <TabsContent value="lecciones" className="space-y-6">
          {LEVEL_GROUPS.map(group => (
            <div key={group.label}>
              <h3 className={`text-sm font-semibold mb-3 ${group.color}`}>{group.label}</h3>
              <div className="space-y-2">
                {lessons
                  .filter(l => l.id >= group.range[0] && l.id <= group.range[1])
                  .map(lesson => {
                    const status = getLessonStatus(lesson)
                    return (
                      <Card
                        key={lesson.id}
                        className={`glass border transition-colors ${
                          status === 'bloqueada' ? 'opacity-50 border-border' :
                          status === 'completada' ? 'border-green-500/20' :
                          status === 'en_curso' ? 'border-primary/30' : 'border-primary/10 cursor-pointer hover:border-primary/30'
                        }`}
                        onClick={() => status !== 'bloqueada' && handleStartLesson(lesson)}
                      >
                        <CardContent className="py-3 flex items-center gap-3">
                          {/* Status icon */}
                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            status === 'completada' ? 'bg-green-500/10 text-green-700' :
                            status === 'en_curso' ? 'bg-primary/10 text-primary' :
                            status === 'disponible' ? 'bg-muted text-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {status === 'completada' ? <CheckCircle2 className="h-4 w-4" /> :
                             status === 'en_curso' ? <Play className="h-4 w-4" /> :
                             status === 'bloqueada' ? <Lock className="h-4 w-4" /> :
                             lesson.id}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{lesson.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className={`text-xs ${DIFFICULTY_COLORS[lesson.difficulty]}`}>
                                {DIFFICULTY_LABELS[lesson.difficulty]}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />{lesson.duration}min
                              </span>
                              {lesson.specialtyUnlocked && (
                                <span className="text-xs text-amber-600 flex items-center gap-1">
                                  <Star className="h-3 w-3" />Especialidad
                                </span>
                              )}
                            </div>
                          </div>
                          {status !== 'bloqueada' && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── INSTRUCCIÓN (jefes de sección instruccion) ───────── */}
        {(canManage || canInstruct) && (
          <TabsContent value="instruccion" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-muted-foreground">
                Seguimiento de aspirantes — ESBAS 2026-I
              </p>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                <BookOpen className="h-3 w-3 mr-1" />
                Promoción activa
              </Badge>
            </div>

            <div className="space-y-3">
              {students.map(student => {
                const prog = calculateProgress(student.completedLessons)
                return (
                  <Card key={student.id} className="glass border-primary/10">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {student.name.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <p className="text-sm font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">DNI {student.dni}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-primary">{prog.percentage}%</span>
                              <span className="text-xs text-muted-foreground">
                                {prog.current}/{prog.total} lecciones
                              </span>
                            </div>
                          </div>
                          <Progress value={prog.percentage} className="h-1.5" />
                          {student.inProgress !== null && (
                            <p className="text-xs text-muted-foreground">
                              En curso: Lección {student.inProgress} —{' '}
                              {lessons.find(l => l.id === student.inProgress)?.title ?? ''}
                            </p>
                          )}
                        </div>
                      </div>
                      {canInstruct && (
                        <div className="mt-3 flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => toast.info(`Registrar calificación para ${student.name} — disponible pronto`)}
                          >
                            <ClipboardList className="h-3.5 w-3.5 mr-1" />
                            Calificar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {canManage && (
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() => toast.info('Gestión de cursos — disponible en Fase 4')}
              >
                <Users className="h-4 w-4 mr-2" />
                Gestionar promoción ESBAS 2026-I
              </Button>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* ── DIALOG: Detalle de lección ───────────────────────────── */}
      <Dialog open={!!selectedLesson} onOpenChange={() => setSelectedLesson(null)}>
        {selectedLesson && (
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <span className="text-primary font-bold">#{selectedLesson.id}</span>
                {selectedLesson.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${DIFFICULTY_COLORS[selectedLesson.difficulty]}`}>
                  {DIFFICULTY_LABELS[selectedLesson.difficulty]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />{selectedLesson.duration}min
                </Badge>
                {selectedLesson.specialtyUnlocked && (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/20">
                    <Trophy className="h-3 w-3 mr-1" />
                    Desbloquea: {selectedLesson.specialtyUnlocked}
                  </Badge>
                )}
              </div>

              {selectedLesson.description && (
                <p className="text-sm text-muted-foreground">{selectedLesson.description}</p>
              )}

              {/* Contenido por tabs */}
              <div className="border rounded-lg overflow-hidden">
                <div className="flex border-b">
                  {(['teoria', 'practica', 'evaluacion'] as const).map(tab => (
                    <button
                      key={tab}
                      className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                        activeTab === tab
                          ? 'bg-primary/10 text-primary border-b-2 border-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === 'teoria' ? 'Teoría' : tab === 'practica' ? 'Práctica' : 'Evaluación'}
                    </button>
                  ))}
                </div>
                <div className="p-3">
                  {activeTab === 'teoria' && (
                    <ul className="space-y-1.5">
                      {selectedLesson.content.theory.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <BookOpen className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {activeTab === 'practica' && (
                    <ul className="space-y-1.5">
                      {selectedLesson.content.practice.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Target className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {activeTab === 'evaluacion' && (
                    <ul className="space-y-1.5">
                      {selectedLesson.content.evaluation.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <ClipboardList className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedLesson(null)}>Cerrar</Button>
              {!completedIds.includes(selectedLesson.id) && (
                <Button
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={() => handleMarkComplete(selectedLesson.id)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar completada
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
