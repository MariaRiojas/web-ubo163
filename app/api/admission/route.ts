import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ddb, TABLE, PutCommand, UpdateCommand, generateId, now } from '@/lib/db/dynamodb'
import { getActiveCohort, existsApplicationForDni, countApplicationsForCohort } from '@/lib/admission/get-admission'
import type { AdmissionApplication } from '@/lib/db/schema/admission'
import { edadDe } from '@/lib/utils/edad'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admission  — PÚBLICO
 * Estado de la convocatoria: { open, cohortId?, cohortName? }.
 */
export async function GET() {
  const cohort = await getActiveCohort()
  if (!cohort) return NextResponse.json({ open: false })
  return NextResponse.json({ open: true, cohortId: cohort.cohortId, cohortName: cohort.name })
}

const submitSchema = z.object({
  fullName: z.string().min(3).max(120),
  profession: z.string().min(2).max(120),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de nacimiento inválida'),
  dni: z.string().regex(/^\d{8}$/, 'DNI debe tener 8 dígitos'),
  distrito: z.string().min(2).max(80),
  residencia: z.string().min(2).max(160).optional(),
  celular: z.string().regex(/^\d{6,15}$/, 'Celular inválido'),
  correo: z.string().email('Correo inválido').max(120).optional().or(z.literal('')),
})

/**
 * POST /api/admission  — PÚBLICO
 * Crea una postulación (sin login). Devuelve applicationId para luego subir el CERTIJOVEN.
 * Dedupe: un DNI por convocatoria.
 */
export async function POST(req: NextRequest) {
  const cohort = await getActiveCohort()
  if (!cohort) {
    return NextResponse.json({ error: 'No hay convocatoria abierta en este momento.' }, { status: 409 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }, { status: 422 })
  }

  const edad = edadDe(parsed.data.birthDate)
  if (edad === null || edad < 16 || edad > 70) {
    return NextResponse.json({ error: 'La edad (según la fecha de nacimiento) debe estar entre 16 y 70 años.' }, { status: 422 })
  }

  if (await existsApplicationForDni(cohort.cohortId, parsed.data.dni)) {
    return NextResponse.json({ error: 'Ya existe una postulación con este DNI en la convocatoria vigente.' }, { status: 409 })
  }

  const ts = now()
  const applicationId = generateId()
  // N.° por orden de llegada (antigüedad inicial) = cantidad actual + 1.
  const ordenLlegada = (await countApplicationsForCohort(cohort.cohortId)) + 1
  const correo = parsed.data.correo?.trim() || undefined
  const residencia = parsed.data.residencia?.trim() || undefined
  const item: AdmissionApplication = {
    applicationId,
    cohortId: cohort.cohortId,
    cohortName: cohort.name,
    createdAt: ts,
    updatedAt: ts,
    fullName: parsed.data.fullName.trim(),
    profession: parsed.data.profession.trim(),
    birthDate: parsed.data.birthDate,
    age: edad,
    dni: parsed.data.dni,
    distrito: parsed.data.distrito.trim(),
    residencia,
    celular: parsed.data.celular,
    correo,
    status: 'pendiente_revision',
    etapa: 'inscrito',
    ordenLlegada,
  }

  await ddb.send(new PutCommand({ TableName: TABLE.admissionApplications, Item: item }))

  return NextResponse.json({ ok: true, applicationId, cohortId: cohort.cohortId }, { status: 201 })
}

const patchSchema = z.object({
  applicationId: z.string().min(1),
  cohortId: z.string().min(1),
  certijovenKey: z.string().min(1).max(500),
})

/**
 * PATCH /api/admission  — PÚBLICO (solo adjunta la key del CERTIJOVEN recién subido)
 * Se llama tras subir el PDF a S3. Solo permite setear certijovenKey.
 */
export async function PATCH(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

  // La key debe pertenecer al prefijo de esta postulación (evita setear keys arbitrarias)
  const expectedPrefix = `admission/${parsed.data.cohortId}/${parsed.data.applicationId}/`
  if (!parsed.data.certijovenKey.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: 'Key inválida' }, { status: 400 })
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE.admissionApplications,
    Key: { applicationId: parsed.data.applicationId },
    UpdateExpression: 'SET certijovenKey = :k, updatedAt = :ts',
    ConditionExpression: 'attribute_exists(applicationId)',
    ExpressionAttributeValues: { ':k': parsed.data.certijovenKey, ':ts': now() },
  }))

  return NextResponse.json({ ok: true })
}
