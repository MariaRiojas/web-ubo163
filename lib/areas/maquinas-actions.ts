'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { ddb, TABLE, PutCommand, UpdateCommand, QueryCommand, GetCommand, generateId, now } from '@/lib/db/dynamodb'
import type { Permission } from '@/lib/auth/permissions'
import type { Machine, MachineCompartment, MachineKind, CompartmentType } from '@/lib/db/schema/machines'

type Result = { ok: true } | { ok: false; error: string }

const WS = '/areas/maquinas/vehiculos'

function canManage(session: any): boolean {
  return ((session?.user?.permissions ?? []) as Permission[]).includes('area.machines.manage')
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const genQr = () => ('G-' + generateId().replace(/-/g, '').slice(0, 7)).toUpperCase()

/** Registra una máquina (unidad). */
export async function crearMaquina(input: {
  label: string; kind: MachineKind; plate?: string; brand?: string; model?: string; year?: string; codigoCgbvp?: string
}): Promise<Result> {
  const session = await auth()
  if (!session?.user || !canManage(session)) return { ok: false, error: 'Sin permiso' }
  if (!input.label?.trim()) return { ok: false, error: 'Indica el nombre de la máquina' }

  const ts = now()
  const machineId = generateId()
  const item: Machine = {
    machineId,
    slug: `${slugify(input.label)}-${machineId.slice(0, 4)}`,
    label: input.label.trim(),
    kind: input.kind,
    status: 'operativa',
    ...(input.plate?.trim() ? { plate: input.plate.trim() } : {}),
    ...(input.brand?.trim() ? { brand: input.brand.trim() } : {}),
    ...(input.model?.trim() ? { model: input.model.trim() } : {}),
    ...(input.year && /^\d{4}$/.test(input.year) ? { year: Number(input.year) } : {}),
    ...(input.codigoCgbvp?.trim() ? { codigoCgbvp: input.codigoCgbvp.trim() } : {}),
    createdAt: ts,
    updatedAt: ts,
  }
  await ddb.send(new PutCommand({ TableName: TABLE.machines, Item: item }))
  revalidatePath(WS)
  return { ok: true }
}

/** Cambia el estado operativo de una máquina. */
export async function actualizarEstadoMaquina(machineId: string, status: Machine['status']): Promise<Result> {
  const session = await auth()
  if (!session?.user || !canManage(session)) return { ok: false, error: 'Sin permiso' }
  await ddb.send(new UpdateCommand({
    TableName: TABLE.machines, Key: { machineId },
    UpdateExpression: 'SET #st = :s, updatedAt = :u',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':s': status, ':u': now() },
  }))
  revalidatePath(WS)
  return { ok: true }
}

/** Crea un gabinete (compartimiento) en una máquina, con QR autogenerado. */
export async function crearGabinete(input: { machineId: string; name: string; type: CompartmentType }): Promise<Result> {
  const session = await auth()
  if (!session?.user || !canManage(session)) return { ok: false, error: 'Sin permiso' }
  if (!input.name?.trim()) return { ok: false, error: 'Indica el nombre del gabinete' }

  const { Item: machine } = await ddb.send(new GetCommand({ TableName: TABLE.machines, Key: { machineId: input.machineId } }))
  if (!machine) return { ok: false, error: 'Máquina no encontrada' }

  const { Items } = await ddb.send(new QueryCommand({
    TableName: TABLE.machineCompartments,
    KeyConditionExpression: 'machineId = :mid',
    ExpressionAttributeValues: { ':mid': input.machineId },
  }))
  const displayOrder = (Items ?? []).length
  const ts = now()
  const item: MachineCompartment = {
    machineId: input.machineId,
    compartmentId: generateId(),
    name: input.name.trim(),
    type: input.type,
    qrCode: genQr(),
    displayOrder,
    active: true,
    createdAt: ts,
    updatedAt: ts,
  }
  await ddb.send(new PutCommand({ TableName: TABLE.machineCompartments, Item: item }))
  revalidatePath(WS)
  return { ok: true }
}

/** Renombra un gabinete. */
export async function renombrarGabinete(machineId: string, compartmentId: string, name: string): Promise<Result> {
  const session = await auth()
  if (!session?.user || !canManage(session)) return { ok: false, error: 'Sin permiso' }
  if (!name?.trim()) return { ok: false, error: 'Nombre requerido' }
  await ddb.send(new UpdateCommand({
    TableName: TABLE.machineCompartments, Key: { machineId, compartmentId },
    UpdateExpression: 'SET #n = :n, updatedAt = :u',
    ExpressionAttributeNames: { '#n': 'name' },
    ExpressionAttributeValues: { ':n': name.trim(), ':u': now() },
  }))
  revalidatePath(WS)
  return { ok: true }
}

/** Desactiva un gabinete (soft delete). */
export async function eliminarGabinete(machineId: string, compartmentId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user || !canManage(session)) return { ok: false, error: 'Sin permiso' }
  await ddb.send(new UpdateCommand({
    TableName: TABLE.machineCompartments, Key: { machineId, compartmentId },
    UpdateExpression: 'SET active = :f, updatedAt = :u',
    ExpressionAttributeValues: { ':f': false, ':u': now() },
  }))
  revalidatePath(WS)
  return { ok: true }
}

/** Asigna ítems de inventario a un gabinete (setea compartmentId). */
export async function asignarItemsAGabinete(input: { compartmentId: string; itemIds: string[] }): Promise<Result> {
  const session = await auth()
  if (!session?.user || !canManage(session)) return { ok: false, error: 'Sin permiso' }
  if (!input.itemIds?.length) return { ok: false, error: 'Selecciona al menos un ítem' }
  const ts = now()
  for (const itemId of input.itemIds) {
    await ddb.send(new UpdateCommand({
      TableName: TABLE.inventory, Key: { itemId },
      UpdateExpression: 'SET compartmentId = :c, updatedAt = :u',
      ExpressionAttributeValues: { ':c': input.compartmentId, ':u': ts },
    }))
  }
  revalidatePath(WS)
  return { ok: true }
}

/** Quita un ítem de su gabinete (limpia compartmentId). */
export async function quitarItemDeGabinete(itemId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user || !canManage(session)) return { ok: false, error: 'Sin permiso' }
  await ddb.send(new UpdateCommand({
    TableName: TABLE.inventory, Key: { itemId },
    UpdateExpression: 'REMOVE compartmentId SET updatedAt = :u',
    ExpressionAttributeValues: { ':u': now() },
  }))
  revalidatePath(WS)
  return { ok: true }
}
