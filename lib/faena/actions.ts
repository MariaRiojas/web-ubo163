"use server"

import { db } from '@/lib/db'
import {
  checklistDefinitions,
  checklistExecutions,
  checklistItemResults,
  machineCompartments,
  incidents,
  requests,
  sections,
  inventory,
  profiles,
} from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { and, eq, desc, gte, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Permission } from '@/lib/auth/permissions'
import { detectCurrentShift } from './get-faena-data'

// ═══════════════════════════════════════════════════════════════════
// INICIAR O CONTINUAR CHECKLIST DE UN COMPARTIMIENTO
// ═══════════════════════════════════════════════════════════════════

/**
 * Busca o crea una ejecución de checklist para el compartimiento en el
 * turno actual. Si existe una `en_curso` del mismo usuario hoy, la retorna.
 * Si existe una `completado` hoy, retorna esa (solo lectura).
 * Si no hay definición activa para el turno, retorna un error.
 */
export async function startOrContinueExecution(compartmentId: string) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('faena.create_checklist')) {
    return {
      ok: false as const,
      error: 'No tiene permisos para ejecutar checklists',
    }
  }

  const shift = detectCurrentShift()

  // Busca una definición activa para el turno
  const [definition] = await db
    .select()
    .from(checklistDefinitions)
    .where(
      and(
        eq(checklistDefinitions.compartmentId, compartmentId),
        eq(checklistDefinitions.frequency, shift.frequency),
        eq(checklistDefinitions.active, true),
      ),
    )
    .limit(1)

  if (!definition) {
    return {
      ok: false as const,
      error: `No hay checklist configurado para el turno ${shift.label} en este compartimiento`,
    }
  }

  // Busca una ejecución de hoy
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [existingToday] = await db
    .select()
    .from(checklistExecutions)
    .where(
      and(
        eq(checklistExecutions.definitionId, definition.id),
        gte(checklistExecutions.startedAt, todayStart),
      ),
    )
    .orderBy(desc(checklistExecutions.startedAt))
    .limit(1)

  if (existingToday) {
    return { ok: true as const, executionId: existingToday.id, reused: true as const }
  }

  // Crear nueva
  const [created] = await db
    .insert(checklistExecutions)
    .values({
      definitionId: definition.id,
      performedBy: session.user.profileId,
      status: 'en_curso',
    })
    .returning({ id: checklistExecutions.id })

  revalidatePath('/faena')
  return { ok: true as const, executionId: created.id, reused: false as const }
}

// ═══════════════════════════════════════════════════════════════════
// REGISTRAR RESULTADO DE UN ÍTEM
// ═══════════════════════════════════════════════════════════════════

export type ItemResultStatus = 'presente' | 'faltante' | 'danado' | 'no_aplica'

export async function setItemResult(input: {
  executionId: string
  inventoryId: string
  status: ItemResultStatus
  foundQuantity?: number | null
  notes?: string | null
  photoKey?: string | null
}) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  // Verificar que la ejecución existe y está en curso
  const [execution] = await db
    .select()
    .from(checklistExecutions)
    .where(eq(checklistExecutions.id, input.executionId))
    .limit(1)

  if (!execution) {
    return { ok: false as const, error: 'Ejecución no encontrada' }
  }
  if (execution.status === 'completado') {
    return { ok: false as const, error: 'Este checklist ya está finalizado' }
  }
  if (execution.performedBy !== session.user.profileId) {
    // Admin / jefe puede editar
    const permissions = (session.user.permissions as Permission[]) ?? []
    const isManager =
      permissions.includes('area.machines.manage') ||
      permissions.includes('system.admin')
    if (!isManager) {
      return {
        ok: false as const,
        error: 'Solo el ejecutor puede registrar resultados',
      }
    }
  }

  // Upsert del resultado
  const [existing] = await db
    .select()
    .from(checklistItemResults)
    .where(
      and(
        eq(checklistItemResults.executionId, input.executionId),
        eq(checklistItemResults.inventoryId, input.inventoryId),
      ),
    )
    .limit(1)

  if (existing) {
    await db
      .update(checklistItemResults)
      .set({
        status: input.status,
        foundQuantity: input.foundQuantity ?? null,
        notes: input.notes ?? null,
        photoKey: input.photoKey ?? null,
      })
      .where(eq(checklistItemResults.id, existing.id))
  } else {
    await db.insert(checklistItemResults).values({
      executionId: input.executionId,
      inventoryId: input.inventoryId,
      status: input.status,
      foundQuantity: input.foundQuantity ?? null,
      notes: input.notes ?? null,
      photoKey: input.photoKey ?? null,
    })
  }

  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// FINALIZAR CHECKLIST
// ═══════════════════════════════════════════════════════════════════

/**
 * Cierra la ejecución (`status = completado`). Si hay ítems faltantes,
 * crea automáticamente una solicitud de reposición al área correspondiente.
 * Si hay ítems dañados, crea una incidencia al área de Máquinas (para EPP
 * u otros podría decidirse por inventory.sectionId; hoy simplificamos).
 */
export async function finishExecution(executionId: string) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  // Verificar ejecución
  const execRows = await db
    .select({
      execution: checklistExecutions,
      definition: checklistDefinitions,
      compartment: machineCompartments,
    })
    .from(checklistExecutions)
    .innerJoin(
      checklistDefinitions,
      eq(checklistExecutions.definitionId, checklistDefinitions.id),
    )
    .innerJoin(
      machineCompartments,
      eq(checklistDefinitions.compartmentId, machineCompartments.id),
    )
    .where(eq(checklistExecutions.id, executionId))
    .limit(1)

  const row = execRows[0]
  if (!row) return { ok: false as const, error: 'Ejecución no encontrada' }
  if (row.execution.status === 'completado') {
    return { ok: false as const, error: 'Ya estaba finalizado' }
  }
  if (row.execution.performedBy !== session.user.profileId) {
    return { ok: false as const, error: 'Solo el ejecutor puede finalizar' }
  }

  // Ítems verificados
  const results = await db
    .select({ result: checklistItemResults, inventoryItem: inventory })
    .from(checklistItemResults)
    .innerJoin(inventory, eq(checklistItemResults.inventoryId, inventory.id))
    .where(eq(checklistItemResults.executionId, executionId))

  // Ítems totales del compartimiento
  const itemsTotal = await db
    .select({ id: inventory.id })
    .from(inventory)
    .where(eq(inventory.compartmentId, row.compartment.id))

  if (results.length < itemsTotal.length) {
    return {
      ok: false as const,
      error: `Faltan ${itemsTotal.length - results.length} ítems por verificar`,
    }
  }

  const faltantes = results.filter((r) => r.result.status === 'faltante')
  const danados = results.filter((r) => r.result.status === 'danado')

  // Marcar completado
  await db
    .update(checklistExecutions)
    .set({
      status: 'completado',
      completedAt: new Date(),
    })
    .where(eq(checklistExecutions.id, executionId))

  // Auto-generar solicitud de reposición para faltantes (si la hay)
  if (faltantes.length > 0) {
    // Target: primera sección asociada al inventario (sanidad, servicios, etc.)
    // Si ningún ítem tiene sectionId, usamos servicios_generales por default
    const sectionIds = faltantes
      .map((f) => f.inventoryItem.sectionId)
      .filter((s): s is string => !!s)

    const [targetSection] = sectionIds.length > 0
      ? await db
          .select({ id: sections.id })
          .from(sections)
          .where(eq(sections.id, sectionIds[0]))
          .limit(1)
      : await db
          .select({ id: sections.id })
          .from(sections)
          .where(eq(sections.key, 'servicios_generales'))
          .limit(1)

    if (targetSection) {
      const itemNames = faltantes
        .map((f) => `• ${f.inventoryItem.name} (esperados: ${f.inventoryItem.quantity ?? 1})`)
        .join('\n')

      const code = `SOL-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
      await db.insert(requests).values({
        code,
        title: `Reposición tras inspección · ${row.compartment.name}`,
        description:
          `Ítems detectados como faltantes durante el checklist del turno ` +
          `en ${row.compartment.name}:\n\n${itemNames}\n\n` +
          `Generada automáticamente por el sistema de inspecciones.`,
        category: 'reposicion_insumo',
        priority: 'media',
        status: 'pendiente',
        createdBy: session.user.profileId,
        targetSectionId: targetSection.id,
      })
    }
  }

  // Auto-generar incidencia para ítems dañados
  if (danados.length > 0) {
    const [maquinasSection] = await db
      .select({ id: sections.id })
      .from(sections)
      .where(eq(sections.key, 'maquinas'))
      .limit(1)

    const itemNames = danados
      .map((d) => `• ${d.inventoryItem.name}`)
      .join('\n')

    const code = `INC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
    await db.insert(incidents).values({
      code,
      title: `Equipos dañados detectados en ${row.compartment.name}`,
      description:
        `Durante el checklist del turno se detectaron los siguientes equipos dañados:\n\n` +
        `${itemNames}\n\n` +
        `Generada automáticamente por el sistema de inspecciones.`,
      category: 'equipamiento',
      priority: 'alta',
      status: 'pendiente',
      sectionId: maquinasSection?.id,
      reportedBy: session.user.profileId,
    })
  }

  revalidatePath('/faena')
  return {
    ok: true as const,
    summary: {
      total: results.length,
      presentes: results.filter((r) => r.result.status === 'presente').length,
      faltantes: faltantes.length,
      danados: danados.length,
      autoSolicitud: faltantes.length > 0,
      autoIncidencia: danados.length > 0,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════
// CREAR INCIDENCIA MANUAL
// ═══════════════════════════════════════════════════════════════════

export async function createIncident(input: {
  title: string
  description: string
  category: string
  priority: 'baja' | 'media' | 'alta' | 'urgente'
  sectionId: string
}) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('faena.create_incident')) {
    return { ok: false as const, error: 'No tiene permisos' }
  }

  if (!input.title.trim() || !input.description.trim()) {
    return { ok: false as const, error: 'Título y descripción son obligatorios' }
  }

  const code = `INC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`
  const [created] = await db
    .insert(incidents)
    .values({
      code,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      priority: input.priority,
      status: 'pendiente',
      sectionId: input.sectionId,
      reportedBy: session.user.profileId,
    })
    .returning({ id: incidents.id, code: incidents.code })

  revalidatePath('/faena')
  return { ok: true as const, id: created.id, code: created.code }
}

// ═══════════════════════════════════════════════════════════════════
// CREAR SOLICITUD MANUAL
// ═══════════════════════════════════════════════════════════════════

export async function createRequest(input: {
  title: string
  description: string
  category:
    | 'repuesto'
    | 'reparacion'
    | 'reposicion_insumo'
    | 'mantenimiento'
    | 'capacitacion'
    | 'permiso'
    | 'otro'
  priority: 'baja' | 'media' | 'alta' | 'urgente'
  targetSectionId: string
}) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('faena.create_request')) {
    return { ok: false as const, error: 'No tiene permisos' }
  }

  if (!input.title.trim() || !input.description.trim()) {
    return { ok: false as const, error: 'Título y descripción son obligatorios' }
  }

  const code = `SOL-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`
  const [created] = await db
    .insert(requests)
    .values({
      code,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      priority: input.priority,
      status: 'pendiente',
      createdBy: session.user.profileId,
      targetSectionId: input.targetSectionId,
    })
    .returning({ id: requests.id, code: requests.code })

  revalidatePath('/faena')
  return { ok: true as const, id: created.id, code: created.code }
}

// ═══════════════════════════════════════════════════════════════════
// CANCELAR/ARCHIVAR
// ═══════════════════════════════════════════════════════════════════

export async function cancelMyRequest(requestId: string) {
  const session = await auth()
  if (!session?.user?.profileId) {
    return { ok: false as const, error: 'No autenticado' }
  }

  const [req] = await db
    .select()
    .from(requests)
    .where(eq(requests.id, requestId))
    .limit(1)
  if (!req) return { ok: false as const, error: 'No encontrada' }
  if (req.createdBy !== session.user.profileId) {
    return { ok: false as const, error: 'No es suya' }
  }
  if (!['pendiente', 'aprobada'].includes(req.status)) {
    return { ok: false as const, error: 'No se puede cancelar en este estado' }
  }

  await db
    .update(requests)
    .set({ status: 'cancelada', updatedAt: new Date() })
    .where(eq(requests.id, requestId))

  revalidatePath('/faena')
  return { ok: true as const }
}
