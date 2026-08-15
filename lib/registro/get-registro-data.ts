import 'server-only'
import { ddb, TABLE, ScanCommand, QueryCommand } from '@/lib/db/dynamodb'
import { GRADE_LABEL, type Grade } from '@/lib/cgbvp/grades'
import {
  MODULOS,
  type Modulo,
  type AspiranteEvaluacion,
  type AspiranteResumen,
  type EvalCategoria,
} from '@/lib/db/schema/aspirante-evaluaciones'

/**
 * Capa de datos del módulo Registro (evaluación de aspirantes y postulantes).
 *
 * TODAS las notas se ingresan a mano (jefe/adjuntos de Instrucción) mientras el LMS
 * no esté terminado y validado. Cuando lo esté, la Académica podrá derivarse de las
 * evaluaciones del LMS.
 *
 * Académica: jerarquía interna de ESBAS → Módulo I/II/III → lecciones (cada una con su
 * nota). Nota del módulo = promedio de sus lecciones; Académica = promedio de los módulos.
 * Físico / Actitud / Asistencia: una nota por evaluación. General = promedio simple de
 * las 4 categorías con datos.
 */

const FORMACION_GRADES = new Set(['postulante', 'aspirante'])
const FORMACION_STATUS = new Set(['postulante', 'aspirante_en_curso'])

/** Una lección académica calificada (dentro de un módulo). */
export interface LeccionNota {
  evalId: string
  titulo: string
  nota: number | null
  fecha: string | null
}
/** Desglose de un módulo académico con sus lecciones. */
export interface ModuloAcademico {
  modulo: Modulo
  promedio: number | null
  lecciones: LeccionNota[]
}

/** Una licencia registrada (para el informe). */
export interface LicenciaInforme {
  tramiteId: string
  desde: string
  hasta: string | null
  motivo: string | null
  estado: string | null
  tieneDocumento: boolean
}

/** Aspirante con su resumen de notas + las evaluaciones crudas para el desglose. */
export interface AspiranteRegistro extends AspiranteResumen {
  cohortId: string | null
  evaluaciones: AspiranteEvaluacion[]  // todas las evaluaciones (todas las categorías)
  academicaModulos: ModuloAcademico[]  // desglose académico por módulo → lecciones
  licencias: LicenciaInforme[]         // licencias registradas (aparecen en el informe)
}

export interface RegistroData {
  aspirantes: AspiranteRegistro[]
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
}

/** Desglose académico (módulos → lecciones) + promedio general académico. */
export function computeAcademica(evals: AspiranteEvaluacion[]): {
  promedio: number | null
  modulos: ModuloAcademico[]
} {
  const academicas = evals.filter((e) => e.categoria === 'academica')
  const modulos: ModuloAcademico[] = MODULOS.map((m) => {
    const lecc = academicas
      .filter((e) => e.modulo === m)
      .map<LeccionNota>((e) => ({
        evalId: e.evalId,
        titulo: e.leccion || 'Lección',
        nota: typeof e.nota === 'number' ? e.nota : null,
        fecha: e.fecha || e.createdAt || null,
      }))
    const notas = lecc.map((l) => l.nota).filter((n): n is number => n != null)
    return { modulo: m, promedio: avg(notas), lecciones: lecc }
  })
  const promModulos = modulos.map((m) => m.promedio).filter((n): n is number => n != null)
  return { promedio: avg(promModulos), modulos }
}

/** Promedios por categoría (académica derivada de módulos → lecciones). */
export function computeCategoryAverages(evals: AspiranteEvaluacion[]): {
  academica: number | null
  fisico: number | null
  actitud: number | null
  asistencia: number | null
  general: number | null
} {
  const byCat = (cat: EvalCategoria) =>
    evals.filter((e) => e.categoria === cat).map((e) => e.nota).filter((n) => typeof n === 'number')

  const academica = computeAcademica(evals).promedio
  const fisico = avg(byCat('fisico'))
  const actitud = avg(byCat('actitud'))
  const asistencia = avg(byCat('asistencia'))

  const present = [academica, fisico, actitud, asistencia].filter((v): v is number => v !== null)
  const general = present.length > 0
    ? Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 100) / 100
    : null

  return { academica, fisico, actitud, asistencia, general }
}

export async function getRegistroData(): Promise<RegistroData> {
  const [profilesRes, evalsRes, enrollRes, cohortsRes] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: TABLE.profiles })),
    ddb.send(new ScanCommand({ TableName: TABLE.aspiranteEvaluaciones })),
    ddb.send(new ScanCommand({ TableName: TABLE.trainingEnrollments })),
    ddb.send(new ScanCommand({ TableName: TABLE.trainingCohorts })),
  ])

  const profiles = (profilesRes.Items ?? []).filter(
    (p: any) => p.status !== 'retirado' && (FORMACION_GRADES.has(p.grade) || FORMACION_STATUS.has(p.status)),
  )
  const cohortMap = Object.fromEntries((cohortsRes.Items ?? []).map((c: any) => [c.cohortId, c]))

  const enrollmentByProfile: Record<string, any> = {}
  for (const e of enrollRes.Items ?? []) {
    if (e.status === 'retirado') continue
    const ex = enrollmentByProfile[e.profileId]
    if (!ex || (e.enrolledAt || '') > (ex.enrolledAt || '')) enrollmentByProfile[e.profileId] = e
  }

  const evalsByAspirante: Record<string, AspiranteEvaluacion[]> = {}
  for (const ev of (evalsRes.Items ?? []) as AspiranteEvaluacion[]) {
    ;(evalsByAspirante[ev.aspiranteId] ??= []).push(ev)
  }

  const aspirantes: AspiranteRegistro[] = profiles.map((p: any) => {
    const evals = (evalsByAspirante[p.profileId] ?? []).sort((a, b) =>
      (a.createdAt || '').localeCompare(b.createdAt || ''),
    )
    const enr = enrollmentByProfile[p.profileId]
    const cohort = enr ? cohortMap[enr.cohortId] : undefined
    const avgs = computeCategoryAverages(evals)
    const aca = computeAcademica(evals)

    return {
      aspiranteId: p.profileId,
      fullName: p.fullName,
      grade: p.grade,
      gradeLabel: GRADE_LABEL[p.grade as Grade] ?? p.grade,
      promocion: cohort?.name ?? null,
      cohortId: cohort?.cohortId ?? null,
      fechaIngreso: (enr?.enrolledAt as string) || p.joinDate || null,
      academica: avgs.academica,
      fisico: avgs.fisico,
      actitud: avgs.actitud,
      asistencia: avgs.asistencia,
      general: avgs.general,
      evaluaciones: evals,
      academicaModulos: aca.modulos,
      licencias: [],
    }
  })

  aspirantes.sort((a, b) => {
    const fa = a.fechaIngreso || '9999', fb = b.fechaIngreso || '9999'
    if (fa !== fb) return fa.localeCompare(fb)
    return (a.fullName || '').localeCompare(b.fullName || '')
  })

  return { aspirantes }
}

/** Todas las evaluaciones + resumen de un aspirante (informe / desglose). */
export async function getAspiranteRegistro(aspiranteId: string): Promise<AspiranteRegistro | null> {
  const [profileRes, evalsRes, enrollRes, cohortsRes, tramitesRes] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: TABLE.profiles, FilterExpression: 'profileId = :pid', ExpressionAttributeValues: { ':pid': aspiranteId } })),
    ddb.send(new QueryCommand({ TableName: TABLE.aspiranteEvaluaciones, IndexName: 'aspiranteId-createdAt-index', KeyConditionExpression: 'aspiranteId = :aid', ExpressionAttributeValues: { ':aid': aspiranteId } })),
    ddb.send(new ScanCommand({ TableName: TABLE.trainingEnrollments })),
    ddb.send(new ScanCommand({ TableName: TABLE.trainingCohorts })),
    ddb.send(new QueryCommand({ TableName: TABLE.aspiranteTramites, IndexName: 'profileId-createdAt-index', KeyConditionExpression: 'profileId = :pid', ExpressionAttributeValues: { ':pid': aspiranteId } })).catch(() => ({ Items: [] as any[] })),
  ])

  const p = (profileRes.Items ?? [])[0] as any
  if (!p) return null

  const evals = ((evalsRes.Items ?? []) as AspiranteEvaluacion[]).sort((a, b) =>
    (a.createdAt || '').localeCompare(b.createdAt || ''),
  )
  const cohortMap = Object.fromEntries((cohortsRes.Items ?? []).map((c: any) => [c.cohortId, c]))
  let enr: any
  for (const e of enrollRes.Items ?? []) {
    if (e.profileId !== aspiranteId || e.status === 'retirado') continue
    if (!enr || (e.enrolledAt || '') > (enr.enrolledAt || '')) enr = e
  }
  const cohort = enr ? cohortMap[enr.cohortId] : undefined
  const avgs = computeCategoryAverages(evals)
  const aca = computeAcademica(evals)

  const licencias: LicenciaInforme[] = ((tramitesRes.Items ?? []) as any[])
    .filter(t => t.tipo === 'licencia')
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
    .map(t => ({
      tramiteId: t.tramiteId,
      desde: t.fecha,
      hasta: t.hasta ?? null,
      motivo: t.detalle ?? null,
      estado: t.licenciaEstado ?? null,
      tieneDocumento: !!t.resolucionKey,
    }))

  return {
    aspiranteId: p.profileId,
    fullName: p.fullName,
    grade: p.grade,
    gradeLabel: GRADE_LABEL[p.grade as Grade] ?? p.grade,
    promocion: cohort?.name ?? null,
    cohortId: cohort?.cohortId ?? null,
    fechaIngreso: (enr?.enrolledAt as string) || p.joinDate || null,
    academica: avgs.academica,
    fisico: avgs.fisico,
    actitud: avgs.actitud,
    asistencia: avgs.asistencia,
    general: avgs.general,
    evaluaciones: evals,
    academicaModulos: aca.modulos,
    licencias,
  }
}
