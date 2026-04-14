/**
 * Jerarquía de grados del CGBVP según NDR (Normas de Disciplina y Régimen)
 * y el Reglamento Interno de Funcionamiento (RIF) Arts. 113-117.
 *
 * Los grados están ordenados de menor a mayor (índice = rango numérico).
 */

export const GRADE_HIERARCHY = [
  "aspirante",
  "seccionario",
  "subteniente",
  "teniente",
  "capitan",
  "teniente_brigadier",
  "brigadier",
  "brigadier_mayor",
  "brigadier_general",
] as const

export type Grade = (typeof GRADE_HIERARCHY)[number]

/** Nombre legible de cada grado */
export const GRADE_LABEL: Record<Grade, string> = {
  aspirante:           "Aspirante",
  seccionario:         "Seccionario",
  subteniente:         "Subteniente",
  teniente:            "Teniente",
  capitan:             "Capitán",
  teniente_brigadier:  "Teniente Brigadier",
  brigadier:           "Brigadier",
  brigadier_mayor:     "Brigadier Mayor",
  brigadier_general:   "Brigadier General",
}

/** Abreviatura oficial para uso en listados */
export const GRADE_ABBR: Record<Grade, string> = {
  aspirante:           "Asp.",
  seccionario:         "Secc.",
  subteniente:         "Subten.",
  teniente:            "Ten.",
  capitan:             "Cap.",
  teniente_brigadier:  "Ten. Brig.",
  brigadier:           "Brig.",
  brigadier_mayor:     "Brig. Mayor",
  brigadier_general:   "Brig. Gral.",
}

/**
 * Grados disponibles según la categoría de antigüedad de la compañía
 * (Art. 113 RIF CGBVP).
 *
 * - centenaria  : ≥ 100 años — todos los grados
 * - mas_50      : 50–99 años — hasta Brigadier Mayor
 * - menos_50    : < 50 años  — hasta Brigadier
 */
export const GRADES_BY_AGE_CATEGORY: Record<
  "centenaria" | "mas_50" | "menos_50",
  readonly Grade[]
> = {
  centenaria: GRADE_HIERARCHY,
  mas_50: GRADE_HIERARCHY.filter((g) => g !== "brigadier_general"),
  menos_50: GRADE_HIERARCHY.filter(
    (g) => g !== "brigadier_general" && g !== "brigadier_mayor"
  ),
}

/** Devuelve el índice numérico del grado (mayor = rango más alto) */
export function gradeRank(grade: Grade): number {
  return GRADE_HIERARCHY.indexOf(grade)
}

/** Compara dos grados. Retorna true si `a` es superior a `b` */
export function isHigherGrade(a: Grade, b: Grade): boolean {
  return gradeRank(a) > gradeRank(b)
}

/** Devuelve el siguiente grado en la jerarquía, o null si es el máximo */
export function nextGrade(grade: Grade): Grade | null {
  const idx = gradeRank(grade)
  return idx < GRADE_HIERARCHY.length - 1
    ? GRADE_HIERARCHY[idx + 1]
    : null
}
