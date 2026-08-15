'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import {
  ddb,
  TABLE,
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
  generateId,
  now,
} from '@/lib/db/dynamodb'
import { writeAuditLog, auditActor } from '@/lib/audit/write-audit'
import {
  EVAL_CATEGORIAS,
  EVAL_CATEGORIA_LABELS,
  MODULOS,
  type AspiranteEvaluacion,
  type EvalCategoria,
  type Modulo,
} from '@/lib/db/schema/aspirante-evaluaciones'
import type { Permission } from '@/lib/auth/permissions'

function canManage(session: any): boolean {
  const perms = (session?.user?.permissions ?? []) as Permission[]
  return perms.includes('area.instruction.manage')
}

export interface UpsertEvaluacionInput {
  evalId?: string
  aspiranteId: string
  categoria: EvalCategoria
  modulo?: Modulo
  leccion?: string
  nota: number
  metricas?: Record<string, number>
  comentario?: string
  fecha?: string
}

type ActionResult = { ok: true; evalId: string } | { ok: false; error: string }

/** Crea o actualiza una evaluación de un aspirante + audita el cambio. */
export async function upsertEvaluacion(
  input: UpsertEvaluacionInput,
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'No autenticado' }
  if (!canManage(session)) return { ok: false, error: 'Sin permiso' }

  if (!input.aspiranteId) return { ok: false, error: 'Falta el aspirante' }
  if (!EVAL_CATEGORIAS.includes(input.categoria))
    return { ok: false, error: 'Categoría inválida' }
  if (input.categoria === 'academica') {
    if (!input.modulo || !MODULOS.includes(input.modulo))
      return { ok: false, error: 'Módulo requerido para la categoría Académica' }
    if (!input.leccion || !input.leccion.trim())
      return { ok: false, error: 'Nombre de la lección requerido para la categoría Académica' }
  }

  const nota = Number(input.nota)
  if (Number.isNaN(nota) || nota < 0 || nota > 20)
    return { ok: false, error: 'La nota debe estar entre 0 y 20' }

  // Verificar que el aspirante exista.
  const { Item: profile } = await ddb.send(
    new GetCommand({
      TableName: TABLE.profiles,
      Key: { profileId: input.aspiranteId },
    }),
  )
  if (!profile) return { ok: false, error: 'Aspirante no encontrado' }

  // Promoción activa (para etiquetar la evaluación).
  let cohortId: string | undefined
  try {
    const enrollRes = await ddb.send(new ScanCommand({ TableName: TABLE.trainingEnrollments }))
    let enr: any
    for (const e of enrollRes.Items ?? []) {
      if (e.profileId !== input.aspiranteId || e.status === 'retirado') continue
      if (!enr || (e.enrolledAt || '') > (enr.enrolledAt || '')) enr = e
    }
    cohortId = enr?.cohortId
  } catch {
    /* la promoción es opcional */
  }

  const ts = now()
  const actor = auditActor(session)

  let before: AspiranteEvaluacion | undefined
  let evalId = input.evalId
  let createdAt = ts

  if (evalId) {
    const { Item } = await ddb.send(
      new GetCommand({ TableName: TABLE.aspiranteEvaluaciones, Key: { evalId } }),
    )
    if (Item) {
      before = Item as AspiranteEvaluacion
      createdAt = before.createdAt || ts
    }
  } else {
    evalId = generateId()
  }

  const item: AspiranteEvaluacion = {
    evalId: evalId!,
    aspiranteId: input.aspiranteId,
    ...(cohortId ? { cohortId } : {}),
    createdAt,
    updatedAt: ts,
    categoria: input.categoria,
    ...(input.categoria === 'academica' && input.modulo ? { modulo: input.modulo } : {}),
    ...(input.categoria === 'academica' && input.leccion ? { leccion: input.leccion.trim() } : {}),
    nota,
    ...(input.metricas && Object.keys(input.metricas).length > 0 ? { metricas: input.metricas } : {}),
    ...(input.comentario ? { comentario: input.comentario } : {}),
    ...(input.fecha ? { fecha: input.fecha } : {}),
    evaluadoPor: actor.actorId,
    evaluadoPorNombre: actor.actorName,
  }

  await ddb.send(new PutCommand({ TableName: TABLE.aspiranteEvaluaciones, Item: item }))

  const catLabel = EVAL_CATEGORIA_LABELS[input.categoria]
  const moduloTxt = input.modulo
    ? ` Módulo ${input.modulo}${input.leccion ? ` · ${input.leccion.trim()}` : ''}`
    : ''
  await writeAuditLog({
    entityType: 'training',
    entityId: item.evalId,
    entityLabel: (profile as any).fullName,
    action: before ? 'update' : 'create',
    ...actor,
    summary: `${before ? 'Actualizó' : 'Registró'} nota ${catLabel}${moduloTxt} = ${nota} de ${(profile as any).fullName}`,
    ...(before ? { before: { nota: before.nota, comentario: before.comentario, metricas: before.metricas } } : {}),
    after: { nota, comentario: item.comentario, metricas: item.metricas },
  })

  revalidatePath('/areas/instruccion/registro')
  return { ok: true, evalId: item.evalId }
}

/** Elimina una evaluación + audita. */
export async function deleteEvaluacion(evalId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'No autenticado' }
  if (!canManage(session)) return { ok: false, error: 'Sin permiso' }
  if (!evalId) return { ok: false, error: 'Falta el identificador' }

  const { Item } = await ddb.send(
    new GetCommand({ TableName: TABLE.aspiranteEvaluaciones, Key: { evalId } }),
  )
  if (!Item) return { ok: false, error: 'Evaluación no encontrada' }
  const ev = Item as AspiranteEvaluacion

  await ddb.send(
    new DeleteCommand({ TableName: TABLE.aspiranteEvaluaciones, Key: { evalId } }),
  )

  await writeAuditLog({
    entityType: 'training',
    entityId: evalId,
    action: 'delete',
    ...auditActor(session),
    summary: `Eliminó nota ${EVAL_CATEGORIA_LABELS[ev.categoria]}${ev.modulo ? ` Módulo ${ev.modulo}` : ''} = ${ev.nota} de un aspirante`,
    before: { nota: ev.nota, categoria: ev.categoria, modulo: ev.modulo },
  })

  revalidatePath('/areas/instruccion/registro')
  return { ok: true, evalId }
}
