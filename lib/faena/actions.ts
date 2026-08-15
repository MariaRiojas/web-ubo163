"use server"

import { ddb, TABLE, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand, generateId, now } from '@/lib/db/dynamodb'
import type { ChecklistExecution, ChecklistItemResult } from '@/lib/db/schema/machines'
import type { InventoryItem } from '@/lib/db/schema/inventory'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Permission } from '@/lib/auth/permissions'
import { detectCurrentShift } from './get-faena-data'

// ═══════════════════════════════════════════════════════════════════
// INICIAR O CONTINUAR CHECKLIST
// ═══════════════════════════════════════════════════════════════════

export async function startOrContinueExecution(compartmentId: string, machineId: string) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('faena.create_checklist')) {
    return { ok: false as const, error: 'No tiene permisos para ejecutar checklists' }
  }

  const shift = detectCurrentShift()
  const todayIso = new Date().toISOString().slice(0, 10)

  // Look for an existing execution today for this compartment (definitionId = compartmentId)
  const { Items } = await ddb.send(new QueryCommand({
    TableName: TABLE.machineChecklists,
    KeyConditionExpression: 'machineId = :mid',
    FilterExpression: '#d = :today AND definitionId = :cid',
    ExpressionAttributeNames: { '#d': 'date' },
    ExpressionAttributeValues: { ':mid': machineId, ':today': todayIso, ':cid': compartmentId },
  }))

  if (Items && Items.length > 0) {
    const existing = Items[0] as ChecklistExecution
    return { ok: true as const, machineId, checklistId: existing.checklistId, reused: true as const }
  }

  const checklistId = generateId()
  const ts = now()
  const newExecution: ChecklistExecution = {
    machineId,
    checklistId,
    definitionId: compartmentId,
    profileId: session.user.profileId,
    date: todayIso,
    status: 'en_curso',
    startedAt: ts,
    results: [],
    createdAt: ts,
  }

  await ddb.send(new PutCommand({ TableName: TABLE.machineChecklists, Item: newExecution }))

  revalidatePath('/faena')
  return { ok: true as const, machineId, checklistId, reused: false as const }
}

// ═══════════════════════════════════════════════════════════════════
// REGISTRAR RESULTADO DE UN ÍTEM
// ═══════════════════════════════════════════════════════════════════

export type ItemResultStatus = 'presente' | 'faltante' | 'danado' | 'no_aplica'

export async function setItemResult(input: {
  machineId: string
  checklistId: string
  inventoryId: string
  status: ItemResultStatus
  foundQuantity?: number | null
  notes?: string | null
  photoKey?: string | null
}) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.machineChecklists,
    Key: { machineId: input.machineId, checklistId: input.checklistId },
  }))
  if (!Item) return { ok: false as const, error: 'Ejecución no encontrada' }

  const execution = Item as ChecklistExecution
  if (execution.status === 'completado') return { ok: false as const, error: 'Este checklist ya está finalizado' }

  if (execution.profileId !== session.user.profileId) {
    const permissions = (session.user.permissions as Permission[]) ?? []
    const isManager = permissions.includes('area.machines.manage') || permissions.includes('system.admin')
    if (!isManager) return { ok: false as const, error: 'Solo el ejecutor puede registrar resultados' }
  }

  // Update the results array: replace existing entry or append
  const results = [...(execution.results ?? [])]
  const idx = results.findIndex(r => r.inventoryId === input.inventoryId)
  const newResult: ChecklistItemResult = {
    inventoryId: input.inventoryId,
    status: input.status,
    ...(input.foundQuantity != null ? { foundQuantity: input.foundQuantity } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.photoKey ? { photoKey: input.photoKey } : {}),
  }

  if (idx >= 0) {
    results[idx] = newResult
  } else {
    results.push(newResult)
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE.machineChecklists,
    Key: { machineId: input.machineId, checklistId: input.checklistId },
    UpdateExpression: 'SET results = :r',
    ExpressionAttributeValues: { ':r': results },
  }))

  return { ok: true as const }
}

// ═══════════════════════════════════════════════════════════════════
// FINALIZAR CHECKLIST
// ═══════════════════════════════════════════════════════════════════

export async function finishExecution(machineId: string, checklistId: string) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.machineChecklists,
    Key: { machineId, checklistId },
  }))
  if (!Item) return { ok: false as const, error: 'Ejecución no encontrada' }
  const execution = Item as ChecklistExecution

  if (execution.status === 'completado') return { ok: false as const, error: 'Ya estaba finalizado' }
  if (execution.profileId !== session.user.profileId) {
    return { ok: false as const, error: 'Solo el ejecutor puede finalizar' }
  }

  const compartmentId = execution.definitionId

  // Get all inventory items in this compartment
  const { Items: invItems } = await ddb.send(new ScanCommand({
    TableName: TABLE.inventory,
    FilterExpression: 'compartmentId = :cid',
    ExpressionAttributeValues: { ':cid': compartmentId },
  }))
  const inventoryItems = (invItems ?? []) as InventoryItem[]
  const results = execution.results ?? []

  if (results.length < inventoryItems.length) {
    return {
      ok: false as const,
      error: `Faltan ${inventoryItems.length - results.length} ítems por verificar`,
    }
  }

  const faltantes = results.filter(r => r.status === 'faltante')
  const danados = results.filter(r => r.status === 'danado')

  const ts = now()
  await ddb.send(new UpdateCommand({
    TableName: TABLE.machineChecklists,
    Key: { machineId, checklistId },
    UpdateExpression: 'SET #st = :s, completedAt = :ca',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':s': 'completado', ':ca': ts },
  }))

  // Auto-generate request for missing items
  if (faltantes.length > 0) {
    const faltanteInvIds = new Set(faltantes.map(f => f.inventoryId))
    const faltanteItems = inventoryItems.filter(i => faltanteInvIds.has(i.itemId))

    const sectionIds = faltanteItems.map(i => i.sectionId).filter(Boolean) as string[]
    let targetSectionId: string | null = null

    if (sectionIds.length > 0) {
      const { Item: sectionItem } = await ddb.send(new GetCommand({
        TableName: TABLE.sections,
        Key: { sectionId: sectionIds[0] },
      }))
      targetSectionId = sectionItem ? (sectionItem as any).sectionId : null
    }
    if (!targetSectionId) {
      const { Items: sgItems } = await ddb.send(new ScanCommand({
        TableName: TABLE.sections,
        FilterExpression: '#k = :sg',
        ExpressionAttributeNames: { '#k': 'key' },
        ExpressionAttributeValues: { ':sg': 'servicios_generales' },
        Limit: 1,
      }))
      targetSectionId = (sgItems?.[0] as any)?.sectionId ?? null
    }

    if (targetSectionId) {
      const itemNames = faltanteItems
        .map(i => `• ${i.name} (esperados: ${i.quantity ?? 1})`)
        .join('\n')
      const code = `SOL-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
      const reqTs = now()
      await ddb.send(new PutCommand({
        TableName: TABLE.requests,
        Item: {
          requestId: generateId(),
          code,
          title: `Reposición tras inspección · ${compartmentId}`,
          description: `Ítems detectados como faltantes durante el checklist:\n\n${itemNames}\n\nGenerada automáticamente por el sistema de inspecciones.`,
          category: 'reposicion_insumo',
          priority: 'media',
          status: 'pendiente',
          createdBy: session.user.profileId,
          sectionId: targetSectionId,
          createdAt: reqTs,
          updatedAt: reqTs,
        },
      }))
    }
  }

  // Auto-generate incident for damaged items
  if (danados.length > 0) {
    const { Items: maqItems } = await ddb.send(new ScanCommand({
      TableName: TABLE.sections,
      FilterExpression: '#k = :mq',
      ExpressionAttributeNames: { '#k': 'key' },
      ExpressionAttributeValues: { ':mq': 'maquinas' },
      Limit: 1,
    }))
    const maquinasSectionId = (maqItems?.[0] as any)?.sectionId ?? null

    const danadoInvIds = new Set(danados.map(d => d.inventoryId))
    const danadoItems = inventoryItems.filter(i => danadoInvIds.has(i.itemId))
    const itemNames = danadoItems.map(i => `• ${i.name}`).join('\n')
    const code = `INC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
    const incTs = now()
    await ddb.send(new PutCommand({
      TableName: TABLE.incidents,
      Item: {
        incidentId: generateId(),
        code,
        title: `Equipos dañados detectados en compartimiento`,
        description: `Durante el checklist se detectaron los siguientes equipos dañados:\n\n${itemNames}\n\nGenerada automáticamente por el sistema de inspecciones.`,
        category: 'equipamiento',
        priority: 'alta',
        status: 'pendiente',
        sectionId: maquinasSectionId,
        reportedBy: session.user.profileId,
        createdAt: incTs,
        updatedAt: incTs,
      },
    }))
  }

  revalidatePath('/faena')
  return {
    ok: true as const,
    summary: {
      total: results.length,
      presentes: results.filter(r => r.status === 'presente').length,
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
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('faena.create_incident')) {
    return { ok: false as const, error: 'No tiene permisos' }
  }
  if (!input.title.trim() || !input.description.trim()) {
    return { ok: false as const, error: 'Título y descripción son obligatorios' }
  }

  const code = `INC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`
  const incidentId = generateId()
  const ts = now()

  await ddb.send(new PutCommand({
    TableName: TABLE.incidents,
    Item: {
      incidentId,
      code,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      priority: input.priority,
      status: 'pendiente',
      sectionId: input.sectionId,
      reportedBy: session.user.profileId,
      createdAt: ts,
      updatedAt: ts,
    },
  }))

  revalidatePath('/faena')
  return { ok: true as const, id: incidentId, code }
}

// ═══════════════════════════════════════════════════════════════════
// CREAR SOLICITUD MANUAL
// ═══════════════════════════════════════════════════════════════════

export async function createRequest(input: {
  title: string
  description: string
  category: 'repuesto' | 'reparacion' | 'reposicion_insumo' | 'mantenimiento' | 'capacitacion' | 'permiso' | 'otro'
  priority: 'baja' | 'media' | 'alta' | 'urgente'
  targetSectionId: string
}) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const permissions = (session.user.permissions as Permission[]) ?? []
  if (!permissions.includes('faena.create_request')) {
    return { ok: false as const, error: 'No tiene permisos' }
  }
  if (!input.title.trim() || !input.description.trim()) {
    return { ok: false as const, error: 'Título y descripción son obligatorios' }
  }

  const code = `SOL-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`
  const requestId = generateId()
  const ts = now()

  await ddb.send(new PutCommand({
    TableName: TABLE.requests,
    Item: {
      requestId,
      code,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      priority: input.priority,
      status: 'pendiente',
      createdBy: session.user.profileId,
      sectionId: input.targetSectionId,
      createdAt: ts,
      updatedAt: ts,
    },
  }))

  revalidatePath('/faena')
  return { ok: true as const, id: requestId, code }
}

// ═══════════════════════════════════════════════════════════════════
// CANCELAR SOLICITUD
// ═══════════════════════════════════════════════════════════════════

export async function cancelMyRequest(requestId: string) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }

  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.requests,
    Key: { requestId },
  }))
  const req = (Item ?? null) as any
  if (!req) return { ok: false as const, error: 'No encontrada' }
  if (req.createdBy !== session.user.profileId) return { ok: false as const, error: 'No es suya' }
  if (!['pendiente', 'aprobada'].includes(req.status)) {
    return { ok: false as const, error: 'No se puede cancelar en este estado' }
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE.requests,
    Key: { requestId },
    UpdateExpression: 'SET #st = :s, updatedAt = :ua',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':s': 'cancelada', ':ua': now() },
  }))

  revalidatePath('/faena')
  return { ok: true as const }
}
