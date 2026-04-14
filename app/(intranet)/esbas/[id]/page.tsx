"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { IntranetNav } from "@/components/intranet-nav"
import { ProtectRoute } from "@/components/protect-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
  Target,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Trophy,
} from "lucide-react"
import { User } from "@/lib/auth"
import { LESSONS, Lesson } from "@/data/esbas-courses"
import Link from "next/link"

export default function LessonPage() {
  const router = useRouter()
  const params = useParams()
  const lessonId = parseInt(params.id as string)
  const [user, setUser] = useState<User | null>(null)
  const [completedLessons, setCompletedLessons] = useState<number[]>([])
  const [currentSection, setCurrentSection] = useState<"theory" | "practice" | "evaluation">(
    "theory"
  )
  const [lessonCompleted, setLessonCompleted] = useState(false)

  const lesson = LESSONS.find((l) => l.id === lessonId)

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser")
    if (!currentUser) {
      router.push("/intranet")
      return
    }
    const userData = JSON.parse(currentUser)
    setUser(userData)

    const savedProgress = localStorage.getItem(`esbas_progress_${userData.username}`)
    if (savedProgress) {
      const progress = JSON.parse(savedProgress)
      setCompletedLessons(progress)
      setLessonCompleted(progress.includes(lessonId))
    }
  }, [router, lessonId])

  if (!user || !lesson) return null

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "basico":
        return "bg-green-500/20 text-green-700 border-green-500/30"
      case "intermedio":
        return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30"
      case "avanzado":
        return "bg-red-500/20 text-red-700 border-red-500/30"
      default:
        return "bg-primary/20 text-primary border-primary/30"
    }
  }

  const handleCompleteLesson = () => {
    if (!lessonCompleted) {
      const newProgress = [...completedLessons, lessonId]
      setCompletedLessons(newProgress)
      setLessonCompleted(true)
      localStorage.setItem(`esbas_progress_${user.username}`, JSON.stringify(newProgress))

      // Mostrar mensaje de felicitación
      alert(
        `¡Felicitaciones! Has completado la lección: ${lesson.title}${
          lesson.specialtyUnlocked
            ? `\n\n🏆 ¡Has desbloqueado la especialidad: ${lesson.specialtyUnlocked}!`
            : ""
        }`
      )
    }
  }

  const sectionProgress = () => {
    const sections = ["theory", "practice", "evaluation"]
    const currentIndex = sections.indexOf(currentSection)
    return ((currentIndex + 1) / sections.length) * 100
  }

  const nextLesson = LESSONS.find((l) => l.id === lessonId + 1)
  const prevLesson = LESSONS.find((l) => l.id === lessonId - 1)

  return (
    <ProtectRoute allowedRoles={["efectivo"]}>
      <div className="flex min-h-screen bg-gradient-to-b from-background to-muted/20">
        <IntranetNav />

        <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-6">
              <Link href="/intranet/esbas">
                <Button variant="ghost" size="sm" className="mb-4">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Volver a ESBAS
                </Button>
              </Link>

              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getDifficultyColor(lesson.difficulty)}>
                      {lesson.difficulty}
                    </Badge>
                    {lessonCompleted && (
                      <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completada
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold">
                    Lección {lesson.id}: {lesson.title}
                  </h1>
                  <p className="text-muted-foreground mt-2">{lesson.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {lesson.duration} minutos
                    </span>
                    {lesson.specialtyUnlocked && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        Desbloquea: {lesson.specialtyUnlocked}
                      </Badge>
                    )}
                  </div>
                </div>

                {!lessonCompleted && (
                  <Button
                    onClick={handleCompleteLesson}
                    className="bg-gradient-to-r from-green-600 to-green-800"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Marcar como Completada
                  </Button>
                )}
              </div>

              {/* Progress Bar */}
              <Card className="glass border-primary/10">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progreso de la Lección</span>
                    <span className="text-sm font-bold">{Math.round(sectionProgress())}%</span>
                  </div>
                  <Progress value={sectionProgress()} className="h-2" />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-3 space-y-6">
                {/* Section Navigation */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={currentSection === "theory" ? "default" : "outline"}
                    onClick={() => setCurrentSection("theory")}
                    className="flex-1"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Teoría
                  </Button>
                  <Button
                    variant={currentSection === "practice" ? "default" : "outline"}
                    onClick={() => setCurrentSection("practice")}
                    className="flex-1"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Práctica
                  </Button>
                  <Button
                    variant={currentSection === "evaluation" ? "default" : "outline"}
                    onClick={() => setCurrentSection("evaluation")}
                    className="flex-1"
                  >
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Evaluación
                  </Button>
                </div>

                {/* Content Card */}
                <Card className="glass border-primary/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {currentSection === "theory" && (
                        <>
                          <BookOpen className="h-5 w-5 text-primary" />
                          Contenido Teórico
                        </>
                      )}
                      {currentSection === "practice" && (
                        <>
                          <Target className="h-5 w-5 text-primary" />
                          Ejercicios Prácticos
                        </>
                      )}
                      {currentSection === "evaluation" && (
                        <>
                          <ClipboardCheck className="h-5 w-5 text-primary" />
                          Evaluación
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentSection === "theory" && (
                      <div className="space-y-4">
                        {lesson.content.theory.map((item, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                              <span className="text-sm font-bold text-primary">
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold mb-2">{item}</h3>
                              <p className="text-sm text-muted-foreground">
                                Contenido detallado sobre {item.toLowerCase()}. Incluye conceptos
                                fundamentales, principios básicos y aplicaciones prácticas en el
                                servicio de bomberos.
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentSection === "practice" && (
                      <div className="space-y-4">
                        {lesson.content.practice.map((item, index) => (
                          <Card key={index} className="bg-primary/5 border-primary/10">
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Target className="h-4 w-4 text-green-600" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold mb-2">{item}</h3>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    Ejercicio práctico para dominar {item.toLowerCase()}. Incluye
                                    instrucciones paso a paso y medidas de seguridad.
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    Ejercicio {index + 1}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {currentSection === "evaluation" && (
                      <div className="space-y-4">
                        {lesson.content.evaluation.map((item, index) => (
                          <Card key={index} className="bg-amber-500/5 border-amber-500/10">
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <ClipboardCheck className="h-4 w-4 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold mb-2">{item}</h3>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    Evaluación práctica sobre {item.toLowerCase()}. Demuestra tu
                                    comprensión de los conceptos aprendidos.
                                  </p>
                                  <div className="flex gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      Evaluación {index + 1}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-green-500/10 text-green-700 border-green-500/30"
                                    >
                                      Obligatorio
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        <div className="pt-4">
                          <Button
                            onClick={handleCompleteLesson}
                            disabled={lessonCompleted}
                            className="w-full bg-gradient-to-r from-green-600 to-green-800"
                          >
                            {lessonCompleted ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Lección Completada
                              </>
                            ) : (
                              <>
                                <Trophy className="h-4 w-4 mr-2" />
                                Completar Lección
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between gap-4">
                  {prevLesson ? (
                    <Link href={`/intranet/esbas/${prevLesson.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Lección Anterior
                      </Button>
                    </Link>
                  ) : (
                    <div className="flex-1" />
                  )}

                  {nextLesson ? (
                    <Link href={`/intranet/esbas/${nextLesson.id}`} className="flex-1">
                      <Button className="w-full bg-gradient-to-r from-primary to-red-800">
                        Siguiente Lección
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/intranet/esbas" className="flex-1">
                      <Button className="w-full bg-gradient-to-r from-green-600 to-green-800">
                        <Trophy className="h-4 w-4 mr-2" />
                        ¡Curso Completado!
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card className="glass border-primary/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Información
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Duración estimada</p>
                      <p className="font-semibold">{lesson.duration} minutos</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Nivel de dificultad</p>
                      <Badge className={getDifficultyColor(lesson.difficulty)}>
                        {lesson.difficulty}
                      </Badge>
                    </div>
                    {lesson.requiredLesson && (
                      <div>
                        <p className="text-muted-foreground mb-1">Lección requerida</p>
                        <p className="font-semibold">Lección {lesson.requiredLesson}</p>
                      </div>
                    )}
                    {lesson.specialtyUnlocked && (
                      <div className="pt-3 border-t border-primary/10">
                        <p className="text-muted-foreground mb-2">
                          Al completar desbloquearás:
                        </p>
                        <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                          <Award className="h-3 w-3 mr-1" />
                          {lesson.specialtyUnlocked}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="glass border-primary/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Contenido
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Teoría</span>
                      <span className="font-semibold">
                        {lesson.content.theory.length} temas
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Práctica</span>
                      <span className="font-semibold">
                        {lesson.content.practice.length} ejercicios
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Evaluación</span>
                      <span className="font-semibold">
                        {lesson.content.evaluation.length} pruebas
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectRoute>
  )
}
