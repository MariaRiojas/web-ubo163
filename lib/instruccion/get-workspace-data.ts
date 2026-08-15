import 'server-only'
import { edadDe } from '@/lib/utils/edad'
import { ddb, TABLE, ScanCommand, QueryCommand } from '@/lib/db/dynamodb'
import { GRADE_LABEL, type Grade } from '@/lib/cgbvp/grades'
import { FORMACION_SITUACIONES, type FormacionSituacion } from '@/lib/db/schema/profiles'
import type { AdmissionApplication, AdmissionEtapa } from '@/lib/db/schema/admission'
import type { AspiranteTramite } from '@/lib/db/schema/aspirante-tramites'
import type { AspiranteEvaluacion } from '@/lib/db/schema/aspirante-evaluaciones'
import {
  computeAcademica, computeCategoryAverages, type ModuloAcademico,
} from '@/lib/registro/get-registro-data'
import { getAsistenciaResumenMap, type AsistenciaResumen } from '@/lib/instruccion/get-asistencia-data'

/**
 * Capa de datos del workspace unificado de Instrucción (Aspirantes y Postulantes).
 *
 * Une DOS fuentes en un solo roster distribuido por SITUACIÓN:
 *   - `admisión`  → postulaciones en pipeline (tabla admission-applications)
 *   - resto       → perfiles en formación (formacion/escuela/licencia/baja/graduado)
 * La ficha se adapta según `kind`: pipeline (application) o notas+trayectoria (profile).
 */

export type WorkspaceSituacion = 'admision' | FormacionSituacion

export interface WorkspacePerson {
  id: string
  kind: 'application' | 'profile'
  situacion: WorkspaceSituacion
  fullName: string
  grade: string
  gradeLabel: string
  // datos personales
  dni?: string
  birthDate?: string
  edad: number | null
  profession?: string
  distrito?: string
  residencia?: string
  celular?: string
  correo?: string
  certijovenKey?: string
  // convocatoria / antigüedad
  convocatoriaLabel: string | null
  ordenLlegada?: number
  ordenAntiguedad?: number
  fechaIngreso: string | null
  // admisión
  etapa?: AdmissionEtapa
  application?: AdmissionApplication
  // formación
  notas?: {
    academica: number | null; fisico: number | null; actitud: number | null
    asistencia: number | null; general: number | null; academicaModulos: ModuloAcademico[]
    /** Evaluaciones crudas (todas las categorías) — para editar/eliminar desde la ficha. */
    evaluaciones: AspiranteEvaluacion[]
    /** Asistencia a instrucción (auto): alimenta la nota de Asistencia. */
    asistenciaAuto?: {
      pct: number | null; obligatoriosAsistidos: number; tardanzas: number
      apoyos: number; sesionesRealizadas: number
    }
  }
  tramites: AspiranteTramite[]
}

export interface WorkspaceClosedCohort {
  cohortId: string
  name: string
  status: string
  endDate: string | null
}

/** Convocatoria de ingreso (ancla histórica) con cuántas personas ingresaron por ella. */
export interface WorkspaceConvocatoriaIngreso {
  label: string
  count: number
}

export interface WorkspaceData {
  people: WorkspacePerson[]
  counts: Record<WorkspaceSituacion, number>
  convocatoriaActiva: { cohortId: string; name: string; endDate: string | null } | null
  closedCohorts: WorkspaceClosedCohort[]
  /** Convocatorias de ingreso pasadas (excluye la activa) para el histórico del rail. */
  convocatoriasIngreso: WorkspaceConvocatoriaIngreso[]
  /** Postulaciones ocultadas por corresponder a alguien ya en formación (mismo DNI). */
  duplicatesSuppressed: number
}

const PIPELINE_ETAPAS = new Set<AdmissionEtapa>(['inscrito', 'contactado', 'entrevista', 'psicologica', 'fisica'])

export { edadDe } from '@/lib/utils/edad'

function inFormacion(p: any): boolean {
  if (p.situacion && (FORMACION_SITUACIONES as readonly string[]).includes(p.situacion)) return true
  if ((p.grade === 'postulante' || p.grade === 'aspirante') && p.status !== 'retirado') return true
  return false
}

export async function getWorkspaceData(): Promise<WorkspaceData> {
  const [profilesRes, tramitesRes, evalsRes, cohortsRes, enrollRes, appsRes, asistenciaMap] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: TABLE.profiles })),
    ddb.send(new ScanCommand({ TableName: TABLE.aspiranteTramites })),
    ddb.send(new ScanCommand({ TableName: TABLE.aspiranteEvaluaciones })),
    ddb.send(new ScanCommand({ TableName: TABLE.trainingCohorts })),
    ddb.send(new ScanCommand({ TableName: TABLE.trainingEnrollments })),
    ddb.send(new ScanCommand({ TableName: TABLE.admissionApplications })),
    getAsistenciaResumenMap(),
  ])

  const cohortMap: Record<string, any> = Object.fromEntries(
    (cohortsRes.Items ?? []).map((c: any) => [c.cohortId, c]),
  )
  const convocatoriaActivaRaw = (cohortsRes.Items ?? []).find((c: any) => c.status === 'activa')
  const convocatoriaActiva = convocatoriaActivaRaw
    ? { cohortId: convocatoriaActivaRaw.cohortId, name: convocatoriaActivaRaw.name ?? 'Convocatoria', endDate: convocatoriaActivaRaw.endDate ?? null }
    : null
  const closedCohorts: WorkspaceClosedCohort[] = (cohortsRes.Items ?? [])
    .filter((c: any) => c.status === 'cerrada' || c.status === 'graduada')
    .map((c: any) => ({ cohortId: c.cohortId, name: c.name ?? 'Convocatoria', status: c.status, endDate: c.endDate ?? null }))
    .sort((a: WorkspaceClosedCohort, b: WorkspaceClosedCohort) => String(b.endDate ?? '').localeCompare(String(a.endDate ?? '')))

  // tramites por perfil
  const tramitesByProfile: Record<string, AspiranteTramite[]> = {}
  for (const t of (tramitesRes.Items ?? []) as AspiranteTramite[]) {
    ;(tramitesByProfile[t.profileId] ??= []).push(t)
  }
  for (const list of Object.values(tramitesByProfile)) {
    list.sort((a, b) => (a.fecha || a.createdAt || '').localeCompare(b.fecha || b.createdAt || ''))
  }

  // evaluaciones por perfil
  const evalsByProfile: Record<string, AspiranteEvaluacion[]> = {}
  for (const ev of (evalsRes.Items ?? []) as AspiranteEvaluacion[]) {
    ;(evalsByProfile[ev.aspiranteId] ??= []).push(ev)
  }

  // inscripción activa más reciente por perfil (fallback de convocatoria + fecha ingreso)
  const enrollByProfile: Record<string, any> = {}
  for (const e of enrollRes.Items ?? []) {
    if (e.status === 'retirado') continue
    const ex = enrollByProfile[e.profileId]
    if (!ex || (e.enrolledAt || '') > (ex.enrolledAt || '')) enrollByProfile[e.profileId] = e
  }

  const people: WorkspacePerson[] = []

  // DNIs de quienes ya están en formación: sirve para deduplicar postulaciones
  // de gente que se equivocó y volvió a llenar el formulario público abierto.
  const formacionDnis = new Set<string>()
  for (const p of (profilesRes.Items ?? []) as any[]) {
    if (inFormacion(p) && p.dni) formacionDnis.add(String(p.dni).trim())
  }
  let duplicatesSuppressed = 0

  // 1) Postulaciones en pipeline → situación 'admisión'
  for (const app of (appsRes.Items ?? []) as AdmissionApplication[]) {
    const etapa = app.etapa ?? 'inscrito'
    if (!PIPELINE_ETAPAS.has(etapa)) continue // aprobados (ya son perfiles) y descartados no van al roster activo
    if (app.dni && formacionDnis.has(String(app.dni).trim())) { duplicatesSuppressed++; continue } // ya está en formación
    people.push({
      id: app.applicationId,
      kind: 'application',
      situacion: 'admision',
      fullName: app.fullName,
      grade: 'postulante',
      gradeLabel: 'Postulante',
      dni: app.dni,
      birthDate: app.birthDate,
      edad: edadDe(app.birthDate) ?? (typeof app.age === 'number' ? app.age : null),
      profession: app.profession,
      distrito: app.distrito,
      residencia: app.residencia,
      celular: app.celular,
      correo: app.correo,
      certijovenKey: app.certijovenKey,
      convocatoriaLabel: app.cohortName ?? cohortMap[app.cohortId]?.name ?? null,
      ordenLlegada: app.ordenLlegada,
      fechaIngreso: app.createdAt ?? null,
      etapa,
      application: app,
      tramites: [],
    })
  }

  // 2) Perfiles en formación → situación real del perfil
  for (const p of (profilesRes.Items ?? []) as any[]) {
    if (!inFormacion(p)) continue
    const situacion: FormacionSituacion = (p.situacion as FormacionSituacion) ?? 'formacion'
    const evals = evalsByProfile[p.profileId] ?? []
    const avgs = computeCategoryAverages(evals)
    const aca = computeAcademica(evals)
    // La asistencia a instrucción (auto) reemplaza la nota manual de Asistencia.
    const asis: AsistenciaResumen | undefined = asistenciaMap[p.profileId]
    const asistenciaNota = asis?.nota ?? avgs.asistencia
    const presentes = [avgs.academica, avgs.fisico, avgs.actitud, asistenciaNota].filter((v): v is number => v !== null)
    const generalConAsistencia = presentes.length > 0
      ? Math.round((presentes.reduce((a, b) => a + b, 0) / presentes.length) * 100) / 100
      : null
    const enr = enrollByProfile[p.profileId]
    const convLabel = p.convocatoriaIngresoLabel
      ?? cohortMap[p.convocatoriaIngreso]?.name
      ?? (enr ? cohortMap[enr.cohortId]?.name : null)
      ?? null
    people.push({
      id: p.profileId,
      kind: 'profile',
      situacion,
      fullName: p.fullName,
      grade: p.grade,
      gradeLabel: GRADE_LABEL[p.grade as Grade] ?? p.grade,
      dni: p.dni,
      birthDate: p.birthDate,
      edad: edadDe(p.birthDate),
      profession: p.profession,
      distrito: p.distrito,
      residencia: p.residencia,
      celular: p.phone,
      correo: p.email,
      convocatoriaLabel: convLabel,
      ordenAntiguedad: p.ordenAntiguedad,
      fechaIngreso: (p.joinDate as string) || (enr?.enrolledAt as string) || null,
      notas: {
        academica: avgs.academica, fisico: avgs.fisico, actitud: avgs.actitud,
        asistencia: asistenciaNota, general: generalConAsistencia, academicaModulos: aca.modulos,
        evaluaciones: [...evals].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')),
        ...(asis ? { asistenciaAuto: { pct: asis.pct, obligatoriosAsistidos: asis.obligatoriosAsistidos, tardanzas: asis.tardanzas, apoyos: asis.apoyos, sesionesRealizadas: asis.sesionesRealizadas } } : {}),
      },
      tramites: tramitesByProfile[p.profileId] ?? [],
    })
  }

  // Orden por antigüedad: ordenAntiguedad → fecha de ingreso → nombre
  people.sort((a, b) => {
    const oa = a.ordenAntiguedad ?? a.ordenLlegada ?? Number.MAX_SAFE_INTEGER
    const ob = b.ordenAntiguedad ?? b.ordenLlegada ?? Number.MAX_SAFE_INTEGER
    if (oa !== ob) return oa - ob
    const fa = a.fechaIngreso || '9999', fb = b.fechaIngreso || '9999'
    if (fa !== fb) return fa.localeCompare(fb)
    return (a.fullName || '').localeCompare(b.fullName || '')
  })

  const counts: Record<WorkspaceSituacion, number> = {
    admision: 0, formacion: 0, escuela: 0, licencia: 0, baja: 0, graduado: 0,
  }
  for (const p of people) counts[p.situacion]++

  // Convocatorias de ingreso (histórico): agrupadas por etiqueta, excluyendo la activa.
  const activeLabel = convocatoriaActiva?.name ?? null
  const convMap = new Map<string, number>()
  for (const p of people) {
    if (!p.convocatoriaLabel || p.convocatoriaLabel === activeLabel) continue
    convMap.set(p.convocatoriaLabel, (convMap.get(p.convocatoriaLabel) ?? 0) + 1)
  }
  const convocatoriasIngreso: WorkspaceConvocatoriaIngreso[] = [...convMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.label.localeCompare(a.label))

  return { people, counts, convocatoriaActiva, closedCohorts, convocatoriasIngreso, duplicatesSuppressed }
}
