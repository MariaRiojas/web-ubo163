import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@/lib/db/dynamodb'
import { now } from '@/lib/db/dynamodb'
import { writeAuditLog, auditActor } from '@/lib/audit/write-audit'

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { itemId, ...fields } = body

    if (!itemId) return NextResponse.json({ error: 'itemId requerido' }, { status: 400 })

    // Estado previo para la bitácora (detecta cambios de cantidad y reasignaciones)
    const { Item: prev } = await ddb.send(new GetCommand({ TableName: TABLE.inventory, Key: { itemId } }))

    const allowed = ['name','category','subcategory','brand','model','numeroSerie','codigoCbp','quantity','unitMeasure','condition','almacenTipo','ubicacionInterna','referenceValue','notes','assignedCodigo','assignedProfileId']
    const updates: string[] = []
    const names: Record<string, string> = {}
    const values: Record<string, any> = { ':ts': now() }

    for (const key of allowed) {
      if (key in fields) {
        const attr = `#${key}`
        names[attr] = key
        values[`:${key}`] = fields[key] || undefined
        updates.push(`${attr} = :${key}`)
      }
    }
    updates.push('updatedAt = :ts')

    await ddb.send(new UpdateCommand({
      TableName: TABLE.inventory,
      Key: { itemId },
      UpdateExpression: 'SET ' + updates.join(', '),
      ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
      ExpressionAttributeValues: values,
    }))

    // ── Auditoría ──
    const prevItem = (prev ?? {}) as Record<string, any>
    const label = prevItem.name ?? fields.name ?? itemId
    const qtyChanged = 'quantity' in fields && prevItem.quantity !== fields.quantity
    const reassigned = 'assignedProfileId' in fields && prevItem.assignedProfileId !== fields.assignedProfileId
    let summary = `Modificó el ítem «${label}»`
    let action: 'update' | 'quantity_change' | 'reassign' = 'update'
    if (qtyChanged) {
      action = 'quantity_change'
      summary = `Cambió la cantidad de «${label}» de ${prevItem.quantity ?? '?'} a ${fields.quantity}`
    } else if (reassigned) {
      action = 'reassign'
      summary = `Reasignó el ítem «${label}»`
    }
    await writeAuditLog({
      entityType: 'inventory',
      entityId: itemId,
      entityLabel: label,
      action,
      ...auditActor(session),
      summary,
      before: prevItem.quantity !== undefined || prevItem.assignedProfileId !== undefined
        ? { quantity: prevItem.quantity, assignedProfileId: prevItem.assignedProfileId, condition: prevItem.condition }
        : undefined,
      after: { ...('quantity' in fields ? { quantity: fields.quantity } : {}), ...('assignedProfileId' in fields ? { assignedProfileId: fields.assignedProfileId } : {}), ...('condition' in fields ? { condition: fields.condition } : {}) },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('PUT /api/inventory/items error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { itemId, itemIds } = body

    // Single delete
    if (itemId && !itemIds) {
      const { Item: prev } = await ddb.send(new GetCommand({ TableName: TABLE.inventory, Key: { itemId } }))
      await ddb.send(new DeleteCommand({
        TableName: TABLE.inventory,
        Key: { itemId },
      }))
      const p = (prev ?? {}) as Record<string, any>
      await writeAuditLog({
        entityType: 'inventory',
        entityId: itemId,
        entityLabel: p.name ?? itemId,
        action: 'delete',
        ...auditActor(session),
        summary: `Eliminó el ítem «${p.name ?? itemId}»${p.quantity != null ? ` (cantidad ${p.quantity})` : ''} del inventario`,
        before: prev ? { name: p.name, category: p.category, quantity: p.quantity, sectionId: p.sectionId, assignedProfileId: p.assignedProfileId } : undefined,
      })
      return NextResponse.json({ success: true, count: 1 })
    }

    // Bulk delete
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      const chunks = []
      for (let i = 0; i < itemIds.length; i += 25) {
        chunks.push(itemIds.slice(i, i + 25))
      }
      for (const chunk of chunks) {
        await ddb.send(new BatchWriteCommand({
          RequestItems: {
            [TABLE.inventory]: chunk.map((id: string) => ({
              DeleteRequest: { Key: { itemId: id } },
            })),
          },
        }))
      }
      await writeAuditLog({
        entityType: 'inventory',
        entityId: 'bulk',
        action: 'delete',
        ...auditActor(session),
        summary: `Eliminó ${itemIds.length} ítems del inventario en lote`,
        metadata: { itemIds },
      })
      return NextResponse.json({ success: true, count: itemIds.length })
    }

    return NextResponse.json({ error: 'itemId o itemIds requerido' }, { status: 400 })
  } catch (error: any) {
    console.error('DELETE /api/inventory/items error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
