/**
 * Requisitos normativos del CGBVP según NDR (Normas de Disciplina y Régimen).
 *
 * Estos valores determinan si un efectivo está en situación regular
 * y son usados en los reportes de cumplimiento.
 */

import type { Grade } from "./grades"

// ── Horas de servicio mínimas por trimestre ───────────────────────

/** Horas mínimas de servicio voluntario requeridas por trimestre según grado */
export const MIN_HOURS_PER_QUARTER: Record<Grade, number> = {
  aspirante:           40,   // ESBAS en curso — requisito diferenciado
  seccionario:         120,
  subteniente:         100,
  teniente:            80,
  capitan:             60,
  teniente_brigadier:  50,
  brigadier:           40,
  brigadier_mayor:     30,
  brigadier_general:   20,
}

/** Guardias nocturnas mínimas requeridas por trimestre según grado */
export const MIN_GUARD_SHIFTS_PER_QUARTER: Record<Grade, number> = {
  aspirante:           2,
  seccionario:         6,
  subteniente:         5,
  teniente:            3,
  capitan:             2,
  teniente_brigadier:  2,
  brigadier:           1,
  brigadier_mayor:     1,
  brigadier_general:   1,
}

// ── ESBAS ─────────────────────────────────────────────────────────

/** Número total de lecciones en la malla ESBAS */
export const ESBAS_TOTAL_LESSONS = 30

/**
 * Porcentaje mínimo de la malla ESBAS completado para que un aspirante
 * pueda pasar a la categoría de Seccionario.
 */
export const ESBAS_COMPLETION_THRESHOLD = 100 // 100% = todas las lecciones

// ── NDR — Criterios de situación regular ─────────────────────────

/**
 * Porcentaje mínimo de cumplimiento de horas para considerar
 * que el efectivo está en "situación regular" según NDR.
 */
export const NDR_MIN_COMPLIANCE_PCT = 75

/**
 * Número de trimestres consecutivos con incumplimiento antes
 * de que se genere una alerta de jefatura.
 */
export const NDR_ALERT_CONSECUTIVE_FAILURES = 2

// ── Guardia Nocturna ──────────────────────────────────────────────

/** Duración estándar de una guardia nocturna en horas */
export const GUARD_SHIFT_HOURS = 12 // 20:00 - 08:00

/** Máximo de efectivos por guardia nocturna (limitado por camas) */
export const MAX_GUARDS_PER_SHIFT = 12

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Calcula si un efectivo cumple los requisitos NDR para el trimestre.
 */
export function meetsNDR(params: {
  grade: Grade
  hoursCompleted: number
  guardShiftsCompleted: number
}): { hours: boolean; guardShifts: boolean; overall: boolean } {
  const requiredHours = MIN_HOURS_PER_QUARTER[params.grade]
  const requiredShifts = MIN_GUARD_SHIFTS_PER_QUARTER[params.grade]

  const hoursPct = requiredHours > 0
    ? (params.hoursCompleted / requiredHours) * 100
    : 100

  const hours = hoursPct >= NDR_MIN_COMPLIANCE_PCT
  const guardShifts = params.guardShiftsCompleted >= requiredShifts
  const overall = hours && guardShifts

  return { hours, guardShifts, overall }
}
