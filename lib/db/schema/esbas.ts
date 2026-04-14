import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  decimal,
  timestamp,
  serial,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'

export const ESBAS_MODULES = ['induccion', 'teorico_practico', 'amp'] as const
export const ESBAS_DIFFICULTIES = ['basico', 'intermedio', 'avanzado'] as const
export const ESBAS_PROGRESS_STATUSES = [
  'pendiente',
  'en_curso',
  'completada',
  'reprobada',
] as const

export const esbasLessons = pgTable('esbas_lessons', {
  id: serial('id').primaryKey(),
  module: text('module').notNull(),
  lessonNumber: integer('lesson_number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').default(180),
  difficulty: text('difficulty').default('basico'),
  hasFieldPractice: boolean('has_field_practice').default(false),
  /** Especialidad CGBVP que se desbloquea al completar esta lección */
  specialtyUnlocked: text('specialty_unlocked'),
  /** Lección prerequisito */
  requiredLessonId: integer('required_lesson_id').references(
    (): any => esbasLessons.id
  ),
  contentTheory: text('content_theory').array(),
  contentPractice: text('content_practice').array(),
  contentEvaluation: text('content_evaluation').array(),
  displayOrder: integer('display_order'),
})

export const esbasProgress = pgTable(
  'esbas_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    lessonId: integer('lesson_id')
      .notNull()
      .references(() => esbasLessons.id),
    status: text('status').default('pendiente'),
    theoryCompleted: boolean('theory_completed').default(false),
    practiceCompleted: boolean('practice_completed').default(false),
    evaluationScore: decimal('evaluation_score', { precision: 4, scale: 2 }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    instructorId: uuid('instructor_id').references(() => profiles.id),
    notes: text('notes'),
  },
  (table) => ({
    uniqueProfileLesson: unique().on(table.profileId, table.lessonId),
  })
)

export const esbasLessonsRelations = relations(esbasLessons, ({ many, one }) => ({
  progress: many(esbasProgress),
  requiredLesson: one(esbasLessons, {
    fields: [esbasLessons.requiredLessonId],
    references: [esbasLessons.id],
    relationName: 'prerequisite',
  }),
}))

export const esbasProgressRelations = relations(esbasProgress, ({ one }) => ({
  profile: one(profiles, {
    fields: [esbasProgress.profileId],
    references: [profiles.id],
  }),
  lesson: one(esbasLessons, {
    fields: [esbasProgress.lessonId],
    references: [esbasLessons.id],
  }),
  instructor: one(profiles, {
    fields: [esbasProgress.instructorId],
    references: [profiles.id],
  }),
}))

export type EsbasLesson = typeof esbasLessons.$inferSelect
export type NewEsbasLesson = typeof esbasLessons.$inferInsert
export type EsbasProgress = typeof esbasProgress.$inferSelect
export type NewEsbasProgress = typeof esbasProgress.$inferInsert
