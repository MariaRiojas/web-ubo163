"use server"

import { auth } from '@/lib/auth'
import { ddb, PutCommand, UpdateCommand, TABLE, generateId, now } from '@/lib/db/dynamodb'

export type MovementType = 'INGRESO' | 'SALIDA'

export type Procedencia =
  | 'INBP'
  | 'CGBVP'
  | 'INSTITUCIÓN PÚBLICA'
  | 'INSTITUCIÓN PRIVADA'
  | 'OTRO'

interface RegisterMovementInput {
  itemId: string
  itemName: string
  type: MovementType
  procedencia: Procedencia | null
  quantity: number
  description: string
  observations: string
}

export async function registerMovement(input: RegisterMovementInput) {
  const session = await auth()
  if (!session?.user?.profileId) return { ok: false as const, error: 'No autenticado' }
  try {
    const movementId = generateId()
    const createdAt = now()

    await ddb.send(new PutCommand({
      TableName: TABLE.inventoryMovements,
      Item: {
        movementId,
        itemId: input.itemId,
        itemName: input.itemName,
        type: input.type,
        procedencia: input.procedencia,
        quantity: input.quantity,
        description: input.description,
        observations: input.observations,
        registeredBy: session.user.profileId,
        registeredByName: session.user.name ?? '',
        createdAt,
      },
    }))

    // Actualizar stock del ítem
    const delta = input.type === 'INGRESO' ? input.quantity : -input.quantity
    await ddb.send(new UpdateCommand({
      TableName: TABLE.inventory,
      Key: { itemId: input.itemId },
      UpdateExpression: 'SET quantity = quantity + :delta, updatedAt = :ts',
      ExpressionAttributeValues: { ':delta': delta, ':ts': createdAt },
    }))

    return { ok: true as const, movementId }
  } catch (err) {
    console.error('[registerMovement]', err)
    return { ok: false as const, error: 'Error al registrar el movimiento. Inténtelo de nuevo.' }
  }
}
