import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  GraduationCap,
  BookOpen,
  Dumbbell,
  ClipboardCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
  Star,
} from "lucide-react"
import Link from "next/link"
import { LESSONS, SPECIALTIES } from "@/data/esbas-courses"

// Mock completadas — en producción: await db.query.esbasProgress.findMany(...)
const MOCK_COMPLETED = [1, 2, 3, 4, 5]

const DIFFICULTY_LABEL: Record<string, { label: string; color: string }> = {
  basico:     { label: "Básico",     color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  intermedio: { label: "Intermedio", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  avanzado:   { label: "Avanzado",   color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

export default async function EsbasLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const lessonId = parseInt(id, 10)
  if (isNaN(lessonId)) notFound()

  const lesson = LESSONS.find((l) => l.id === lessonId)
  if (!lesson) notFound()

  const completed = MOCK_COMPLETED
  const isCompleted = completed.includes(lessonId)
  const isUnlocked = lesson.requiredLesson === null || completed.includes(lesson.requiredLesson)

  if (!isUnlocked) {
    const requiredLesson = LESSONS.find((l) => l.id === lesson.requiredLesson)
    return (
      <div>
        <PageHeader icon={GraduationCap} title={`Lección ${lessonId}`} description="ESBAS — Malla Curricular" />
        <Card className="glass border-primary/10">
          <CardContent className="py-16 text-center space-y-4">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <p className="font-semibold text-lg">Lección bloqueada</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Debes completar <strong>{requiredLesson?.title ?? `la lección #${lesson.requiredLesson}`}</strong> antes de acceder.
            </p>
            <Button asChild variant="outline">
              <Link href="/esbas">← Volver a la malla</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const prevLesson = LESSONS.find((l) => l.id === lessonId - 1)
  const nextLesson = LESSONS.find((l) => l.id === lessonId + 1)
  const nextUnlocked = nextLesson
    ? nextLesson.requiredLesson === null || completed.includes(nextLesson.requiredLesson)
    : false

  const unlockedSpecialty = lesson.specialtyUnlocked
    ? SPECIALTIES.find((s) => s.id === lesson.specialtyUnlocked)
    : null

  const diff = DIFFICULTY_LABEL[lesson.difficulty]

  return (
    <div className="space-y-6">
      <PageHeader
        icon={GraduationCap}
        title={lesson.title}
        description={`Lección ${lessonId} de ${LESSONS.length} — ESBAS`}
      />

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge className={diff.color}>{diff.label}</Badge>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {lesson.duration} min
        </div>
        {isCompleted && (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completada
          </Badge>
        )}
        {unlockedSpecialty && (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1.5">
            <Star className="h-3.5 w-3.5" />
            Desbloquea: {unlockedSpecialty.name}
          </Badge>
        )}
      </div>

      {/* Progreso general */}
      <Card className="glass border-primary/10">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progreso en la malla</span>
            <span className="font-medium">{completed.length}/{LESSONS.length} lecciones</span>
          </div>
          <Progress value={(completed.length / LESSONS.length) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Descripción */}
      <Card className="glass border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Descripción
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{lesson.description}</p>
        </CardContent>
      </Card>

      {/* Contenido */}
      <Tabs defaultValue="teoria">
        <TabsList>
          <TabsTrigger value="teoria" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Teoría
          </TabsTrigger>
          <TabsTrigger value="practica" className="gap-2">
            <Dumbbell className="h-4 w-4" />
            Práctica
          </TabsTrigger>
          <TabsTrigger value="evaluacion" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Evaluación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teoria" className="mt-4">
          <Card className="glass border-primary/10">
            <CardHeader>
              <CardTitle className="text-base">Contenido Teórico</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {lesson.content.theory.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="practica" className="mt-4">
          <Card className="glass border-primary/10">
            <CardHeader>
              <CardTitle className="text-base">Actividades Prácticas</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {lesson.content.practice.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluacion" className="mt-4">
          <Card className="glass border-primary/10">
            <CardHeader>
              <CardTitle className="text-base">Criterios de Evaluación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-3">
                {lesson.content.evaluation.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ol>
              <div className="pt-4 border-t border-border">
                {isCompleted ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Lección completada y validada</span>
                  </div>
                ) : (
                  <>
                    <Button className="w-full bg-primary text-white">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Marcar como completada
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Requiere validación del instructor
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navegación */}
      <div className="flex items-center justify-between pt-2">
        {prevLesson ? (
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/esbas/${prevLesson.id}`}>
              <ChevronLeft className="h-4 w-4" />
              Lección {prevLesson.id}
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/esbas">← Malla curricular</Link>
          </Button>
        )}

        {nextLesson ? (
          nextUnlocked ? (
            <Button asChild className="bg-primary text-white gap-2">
              <Link href={`/esbas/${nextLesson.id}`}>
                Lección {nextLesson.id}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled className="gap-2 opacity-50">
              <Lock className="h-4 w-4" />
              Lección {nextLesson.id}
            </Button>
          )
        ) : (
          <Button asChild variant="outline">
            <Link href="/esbas">Malla curricular →</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
