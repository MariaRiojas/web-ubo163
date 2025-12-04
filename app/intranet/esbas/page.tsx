"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { IntranetNav } from "@/components/intranet-nav"
import { ProtectRoute } from "@/components/protect-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  GraduationCap,
  Lock,
  CheckCircle2,
  Play,
  Star,
  Award,
  Clock,
  Target,
  Flame,
  HeartPulse,
  Shield,
  AlertTriangle,
  Trophy,
} from "lucide-react"
import { User } from "@/lib/auth"
import {
  LESSONS,
  SPECIALTIES,
  getAvailableLessons,
  getUnlockedSpecialties,
  calculateProgress,
  Lesson,
  Specialty,
} from "@/data/esbas-courses"
import Link from "next/link"

export default function EsbasPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [completedLessons, setCompletedLessons] = useState<number[]>([])
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const currentUser = localStorage.getItem("currentUser")
    if (!currentUser) {
      router.push("/intranet")
      return
    }
    const userData = JSON.parse(currentUser)
    setUser(userData)

    // Cargar progreso del usuario desde localStorage
    const savedProgress = localStorage.getItem(`esbas_progress_${userData.username}`)
    if (savedProgress) {
      setCompletedLessons(JSON.parse(savedProgress))
    }
  }, [router])

  if (!isClient || !user) return null

  const availableLessons = getAvailableLessons(completedLessons)
  const unlockedSpecialties = getUnlockedSpecialties(completedLessons)
  const progress = calculateProgress(completedLessons)

  const filteredLessons = selectedDifficulty
    ? availableLessons.filter(lesson => lesson.difficulty === selectedDifficulty)
    : availableLessons

  const getSpecialtyIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      Shield,
      HeartPulse,
      Flame,
      AlertTriangle,
      GraduationCap,
    }
    return icons[iconName] || Shield
  }

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

  const isLessonCompleted = (lessonId: number) => completedLessons.includes(lessonId)
  const isLessonAvailable = (lesson: Lesson) =>
    lesson.requiredLesson === null || completedLessons.includes(lesson.requiredLesson)

  const nextLesson = availableLessons.find(
    (lesson) => !isLessonCompleted(lesson.id) && isLessonAvailable(lesson)
  )

  return (
    <ProtectRoute requiredModule="esbas">
      <div className="flex min-h-screen bg-gradient-to-b from-background to-muted/20">
        <IntranetNav />

        <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <GraduationCap className="h-8 w-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-bold">ESBAS</h1>
              </div>
              <p className="text-muted-foreground">
                Escuela Superior de Bomberos - Sistema de Capacitación
              </p>
            </div>

            {/* Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="glass border-primary/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{progress.current}/{progress.total}</p>
                      <p className="text-xs text-muted-foreground">Lecciones</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-primary/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{progress.percentage}%</p>
                      <p className="text-xs text-muted-foreground">Completado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-primary/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                      <Award className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{unlockedSpecialties.length}</p>
                      <p className="text-xs text-muted-foreground">Especialidades</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-primary/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <Star className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {LESSONS.reduce((acc, lesson) => acc + lesson.duration, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Min totales</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overall Progress Bar */}
            <Card className="glass border-primary/10 mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progreso General</span>
                  <span className="text-sm font-bold">{progress.percentage}%</span>
                </div>
                <Progress value={progress.percentage} className="h-3" />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lessons List */}
              <div className="lg:col-span-2 space-y-4">
                {/* Next Lesson Card */}
                {nextLesson && (
                  <Card className="glass border-primary/10 bg-gradient-to-br from-primary/5 to-red-800/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5 text-primary" />
                        Continuar Aprendiendo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <Badge className={getDifficultyColor(nextLesson.difficulty)}>
                            {nextLesson.difficulty}
                          </Badge>
                          <h3 className="font-bold text-lg mt-2">
                            Lección {nextLesson.id}: {nextLesson.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {nextLesson.description}
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {nextLesson.duration} min
                            </span>
                            {nextLesson.specialtyUnlocked && (
                              <Badge variant="outline" className="text-xs">
                                <Award className="h-3 w-3 mr-1" />
                                Desbloquea: {nextLesson.specialtyUnlocked}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Link href={`/intranet/esbas/${nextLesson.id}`}>
                          <Button className="bg-gradient-to-r from-primary to-red-800">
                            <Play className="h-4 w-4 mr-2" />
                            Comenzar
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Difficulty Filter */}
                <div className="flex gap-2">
                  <Button
                    variant={selectedDifficulty === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDifficulty(null)}
                  >
                    Todas
                  </Button>
                  <Button
                    variant={selectedDifficulty === "basico" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDifficulty("basico")}
                  >
                    Básico
                  </Button>
                  <Button
                    variant={selectedDifficulty === "intermedio" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDifficulty("intermedio")}
                  >
                    Intermedio
                  </Button>
                  <Button
                    variant={selectedDifficulty === "avanzado" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDifficulty("avanzado")}
                  >
                    Avanzado
                  </Button>
                </div>

                {/* All Lessons */}
                <div className="space-y-3">
                  {filteredLessons.map((lesson) => {
                    const completed = isLessonCompleted(lesson.id)
                    const available = isLessonAvailable(lesson)

                    return (
                      <Card
                        key={lesson.id}
                        className={`glass border-primary/10 transition-all hover:border-primary/30 ${
                          !available && "opacity-50"
                        }`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                              <div
                                className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  completed
                                    ? "bg-green-500/20"
                                    : available
                                    ? "bg-primary/20"
                                    : "bg-muted"
                                }`}
                              >
                                {completed ? (
                                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                                ) : available ? (
                                  <span className="font-bold text-primary">{lesson.id}</span>
                                ) : (
                                  <Lock className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={getDifficultyColor(lesson.difficulty)}>
                                    {lesson.difficulty}
                                  </Badge>
                                  {completed && (
                                    <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                                      Completada
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="font-bold">
                                  Lección {lesson.id}: {lesson.title}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {lesson.description}
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {lesson.duration} min
                                  </span>
                                  {lesson.specialtyUnlocked && (
                                    <Badge variant="outline" className="text-xs">
                                      <Award className="h-3 w-3 mr-1" />
                                      {lesson.specialtyUnlocked}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {available && !completed && (
                              <Link href={`/intranet/esbas/${lesson.id}`}>
                                <Button size="sm" variant="outline">
                                  <Play className="h-4 w-4 mr-2" />
                                  Iniciar
                                </Button>
                              </Link>
                            )}
                            {completed && (
                              <Link href={`/intranet/esbas/${lesson.id}`}>
                                <Button size="sm" variant="ghost">
                                  Revisar
                                </Button>
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Specialties Sidebar */}
              <div className="space-y-6">
                <Card className="glass border-primary/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      Especialidades
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {SPECIALTIES.map((specialty) => {
                      const unlocked = unlockedSpecialties.some((s) => s.id === specialty.id)
                      const SpecialtyIcon = getSpecialtyIcon(specialty.icon)

                      return (
                        <div
                          key={specialty.id}
                          className={`p-3 rounded-lg border ${
                            unlocked
                              ? "bg-primary/5 border-primary/20"
                              : "bg-muted/50 border-muted"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                unlocked ? "bg-primary/20" : "bg-muted"
                              }`}
                            >
                              {unlocked ? (
                                <SpecialtyIcon className="h-5 w-5 text-primary" />
                              ) : (
                                <Lock className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{specialty.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {unlocked
                                  ? specialty.description
                                  : `Completa la lección ${specialty.unlockedAt}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                <Card className="glass border-primary/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      Tu Ranking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-2">
                      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-red-800 rounded-full flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">
                          {Math.floor(progress.percentage / 10)}
                        </span>
                      </div>
                      <p className="font-bold">Nivel {Math.floor(progress.percentage / 10)}</p>
                      <p className="text-xs text-muted-foreground">
                        {progress.current} de {progress.total} lecciones completadas
                      </p>
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
