/**
 * ESBAS (legacy) — ahora modelado dentro de training-progress.
 * Este archivo mantiene los tipos para compatibilidad con código existente.
 *
 * En DynamoDB, el progreso ESBAS se almacena en:
 *   {PREFIX}-training-progress  PK: profileId, SK: "esbas"
 */

export const ESBAS_MODULES = ['induccion', 'teorico_practico', 'amp'] as const
export const ESBAS_DIFFICULTIES = ['basico', 'intermedio', 'avanzado'] as const
export const ESBAS_PROGRESS_STATUSES = [
  'pendiente', 'en_curso', 'completada', 'reprobada',
] as const
export type EsbasProgressStatus = (typeof ESBAS_PROGRESS_STATUSES)[number]

export interface EsbasLesson {
  lessonId: string
  module: string
  lessonNumber: number
  title: string
  description?: string
  durationMinutes?: number
  difficulty?: string
  hasFieldPractice?: boolean
  specialtyUnlocked?: string
  requiredLessonId?: string
  contentTheory?: string[]
  contentPractice?: string[]
  contentEvaluation?: string[]
  displayOrder?: number
}

export interface EsbasProgress {
  profileId: string        // PK
  lessonId: string         // SK (en training-progress como "esbas#{lessonId}")
  status: EsbasProgressStatus
  theoryCompleted?: boolean
  practiceCompleted?: boolean
  evaluationScore?: string // decimal
  completedAt?: string
  instructorId?: string
  notes?: string
}

export type NewEsbasLesson = EsbasLesson
export type NewEsbasProgress = EsbasProgress
