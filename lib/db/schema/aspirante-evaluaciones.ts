/**
 * Evaluaciones de aspirantes y postulantes en formación (Registro de notas).
 *
 * Tabla `{PREFIX}-aspirante-evaluaciones`
 *   PK: evalId
 *   GSI aspiranteId-createdAt-index: aspiranteId + createdAt → notas de un efectivo
 *
 * Categorías: Académica, Físico (métricas), Actitud Bomberil (iniciativas, apoyo,
 * disciplina) y Asistencia. La nota General es el promedio simple de las 4 categorías.
 *
 * Académica: jerarquía interna del curso de Escuela Básica (ESBAS):
 *   Módulo I/II/III → lecciones → cada lección con su propia nota.
 *   Nota del módulo = promedio de sus lecciones. Académica = promedio de los módulos.
 *   Se ingresan a mano (jefe/adjuntos de Instrucción) hasta que el LMS esté validado;
 *   entonces se podrán derivar automáticamente de las evaluaciones del LMS.
 *
 * Sirve para generar el informe de ascenso a aspirante o de envío a Escuela Básica.
 */

export const EVAL_CATEGORIAS = ['academica', 'fisico', 'actitud', 'asistencia'] as const
export type EvalCategoria = (typeof EVAL_CATEGORIAS)[number]

export const EVAL_CATEGORIA_LABELS: Record<EvalCategoria, string> = {
  academica: 'Académica',
  fisico:    'Físico',
  actitud:   'Actitud Bomberil',
  asistencia:'Asistencia',
}

export const MODULOS = ['I', 'II', 'III'] as const
export type Modulo = (typeof MODULOS)[number]

/** Métricas físicas estándar (repeticiones o tiempo). Se pueden agregar más (circuitos BREC, etc.). */
export const METRICAS_FISICAS = ['planchas', 'abdominales', 'burpies', 'resistencia', 'dominadas'] as const

export interface AspiranteEvaluacion {
  evalId: string           // PK
  aspiranteId: string      // GSI HASH — profileId del aspirante/postulante
  cohortId?: string        // promoción a la que pertenece
  createdAt: string        // GSI RANGE
  updatedAt: string

  categoria: EvalCategoria
  modulo?: Modulo          // solo para categoría 'academica' — módulo I/II/III de ESBAS
  leccion?: string         // solo para categoría 'academica' — nombre de la lección dentro del módulo
  nota: number             // 0-20 (para académica: nota de esa lección)

  // Detalle por categoría
  metricas?: Record<string, number>  // físico: planchas, abdominales, burpies, resistencia, dominadas, + custom (tiempos)
  comentario?: string      // actitud: comentarios sobre iniciativa, apoyo y disciplina; o nota general
  fecha?: string           // fecha de la evaluación

  evaluadoPor?: string     // profileId del instructor/monitor
  evaluadoPorNombre?: string
}

/** Resumen de notas de un aspirante para la vista General. */
export interface AspiranteResumen {
  aspiranteId: string
  fullName: string
  grade: string
  gradeLabel: string
  promocion: string | null   // nombre de la cohorte
  fechaIngreso: string | null
  academica: number | null   // promedio de módulos
  fisico: number | null
  actitud: number | null
  asistencia: number | null
  general: number | null     // promedio simple de las 4 (las que existan)
}
