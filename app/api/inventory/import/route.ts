import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { ddb, TABLE, ScanCommand, QueryCommand, PutCommand, UpdateCommand, generateId, now } from '@/lib/db/dynamodb'
import type { InventoryItem } from '@/lib/db/schema/inventory'
import { parseImport } from '@/lib/inventory/excel'
import {
  validateRow,
  type ValidationContext,
  type NormalizedRow,
  type ValidationIssue,
} from '@/lib/inventory/validation'

/**
 * POST /api/inventory/import
 *
 * Dos modos de operación, vía query param `?mode=validate|commit`:
 *
 * ─ mode=validate (default) ─
 *   Acepta:
 *     - multipart/form-data con campo "file" (el xlsx subido por el usuario)
 *     - application/json con { rows: Array<{ rowIndex, data }> } (edición del preview)
 *   Valida cada fila y devuelve rows con issues.
 *   NO escribe nada en BD.
 *
 * ─ mode=commit ─
 *   Acepta solo JSON con { rows: [...] } ya editadas.
 *   Revalida (no confía en el cliente), hace upsert por codigoCbp.
 *   Devuelve { imported, ids, errors, summary }.
 *
 * Requiere inventory.manage.
 */

interface RowInput {
  rowIndex: number
  data: Record<string, unknown>
}

interface RowResult {
  rowIndex: number
  data: Record<string, unknown>
  valid: boolean
  issues: ValidationIssue[]
  normalized: NormalizedRow | null
}

export async function POST(req: NextRequest) {
  // Auth
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!hasPermission(permissions, 'inventory.manage')) {
    return NextResponse.json(
      { error: 'Sin permiso para importar inventario' },
      { status: 403 }
    )
  }

  const mode = new URL(req.url).searchParams.get('mode') ?? 'validate'
  if (mode !== 'validate' && mode !== 'commit') {
    return NextResponse.json(
      { error: 'Parámetro mode inválido. Usar validate | commit' },
      { status: 400 }
    )
  }

  // ─── Obtener filas desde el body ──────────────────────────────
  let rows: RowInput[]
  try {
    rows = await readRowsFromRequest(req)
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'No se pudo leer el body' },
      { status: 400 }
    )
  }

  if (rows.length === 0) {
    return NextResponse.json({
      rows: [],
      summary: { total: 0, valid: 0, invalid: 0, warnings: 0 },
    })
  }

  if (rows.length > 500) {
    return NextResponse.json(
      { error: `Máximo 500 filas por import (recibidas: ${rows.length})` },
      { status: 413 }
    )
  }

  // ─── Construir contexto de validación ─────────────────────────
  const ctx = await buildValidationContext()

  // ─── Validar todas las filas ──────────────────────────────────
  const results: RowResult[] = rows.map((r) => {
    const v = validateRow(r.data, ctx)
    return {
      rowIndex: r.rowIndex,
      data: r.data,
      valid: v.valid,
      issues: v.issues,
      normalized: v.normalized,
    }
  })

  const summary = buildSummary(results)

  if (mode === 'validate') {
    return NextResponse.json({
      rows: results.map(({ normalized, ...rest }) => rest),
      summary,
    })
  }

  // ─── Modo commit ──────────────────────────────────────────────
  if (summary.invalid > 0) {
    return NextResponse.json(
      {
        error: `Hay ${summary.invalid} filas inválidas. No se importó nada.`,
        rows: results.map(({ normalized, ...rest }) => rest),
        summary,
      },
      { status: 422 }
    )
  }

  const toInsert = results.filter((r) => r.normalized !== null)
  const insertedIds: string[] = []
  const errors: Array<{ rowIndex: number; message: string }> = []

  const profileId = (session.user as any).profileId as string | undefined

  // Construir mapa codigoCbp → itemId para upserts eficientes
  const codigoCbpMap = await buildCodigoCbpMap()

  for (const r of toInsert) {
    const n = r.normalized!

    // Resolver assignedProfileId desde el código (hiredDrivers no migrado a DynamoDB)
    let assignedProfileId: string | undefined
    if (n.assignedCodigo) {
      const code = n.assignedCodigo
      // Solo resolvemos perfiles (A##### o DNI)
      if (!/^R\d{5}$/.test(code)) {
        const { Items: pItems } = await ddb.send(new QueryCommand({
          TableName: TABLE.profiles,
          IndexName: 'codigoCgbvp-index',
          KeyConditionExpression: 'codigoCgbvp = :c',
          ExpressionAttributeValues: { ':c': code },
          Limit: 1,
        }))
        if (pItems && pItems.length > 0) {
          assignedProfileId = (pItems[0] as any).profileId as string
        }
      }
    }

    try {
      const existingItemId = n.codigoCbp ? codigoCbpMap.get(n.codigoCbp) : undefined

      if (existingItemId) {
        // Update existing
        await ddb.send(new UpdateCommand({
          TableName: TABLE.inventory,
          Key: { itemId: existingItemId },
          UpdateExpression: 'SET #n = :n, category = :cat, subcategory = :sub, brand = :br, model = :mo, condition = :cond, almacenTipo = :at, almacenReferencia = :ar, ubicacionInterna = :ui, quantity = :q, updatedAt = :t',
          ExpressionAttributeNames: { '#n': 'name' },
          ExpressionAttributeValues: {
            ':n': n.name,
            ':cat': n.category,
            ':sub': n.subcategory ?? null,
            ':br': n.brand ?? null,
            ':mo': n.model ?? null,
            ':cond': n.condition,
            ':at': n.almacenTipo,
            ':ar': n.almacenReferencia ?? null,
            ':ui': n.ubicacionInterna ?? null,
            ':q': n.quantity,
            ':t': now(),
          },
        }))
        insertedIds.push(existingItemId)
      } else {
        // Insert new
        const itemId = generateId()
        const ts = now()
        const item: InventoryItem = {
          itemId,
          name: n.name,
          category: n.category,
          subcategory: n.subcategory,
          brand: n.brand,
          model: n.model,
          manufactureYear: n.manufactureYear,
          codigoCbp: n.codigoCbp,
          numeroSerie: n.numeroSerie,
          numeroSecuencia: n.numeroSecuencia,
          codigoBarrasQr: n.codigoBarrasQr,
          almacenTipo: n.almacenTipo,
          almacenReferencia: n.almacenReferencia,
          ubicacionInterna: n.ubicacionInterna,
          assignedCodigo: n.assignedCodigo,
          assignedProfileId,
          quantity: n.quantity,
          unitMeasure: n.unitMeasure,
          condition: n.condition,
          requiresMaintenance: n.requiresMaintenance ?? false,
          lastMaintenanceDate: n.lastMaintenanceDate,
          nextMaintenanceDate: n.nextMaintenanceDate,
          maintenanceIntervalMonths: n.maintenanceIntervalMonths,
          expirationDate: n.expirationDate,
          requiresCertification: n.requiresCertification ?? false,
          lastCertificationDate: n.lastCertificationDate,
          nextCertificationDate: n.nextCertificationDate,
          usefulLifeMonths: n.usefulLifeMonths,
          endOfLifeDate: n.endOfLifeDate,
          lote: n.lote,
          purchaseDate: n.purchaseDate,
          supplier: n.supplier,
          referenceValue: n.referenceValue ? String(n.referenceValue) : undefined,
          notes: n.notes,
          createdBy: profileId,
          createdAt: ts,
          updatedAt: ts,
        }

        await ddb.send(new PutCommand({
          TableName: TABLE.inventory,
          Item: item,
        }))
        insertedIds.push(itemId)
        if (n.codigoCbp) codigoCbpMap.set(n.codigoCbp, itemId)
      }
    } catch (err: any) {
      errors.push({
        rowIndex: r.rowIndex,
        message: err?.message ?? 'Error al insertar',
      })
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: `${errors.length} filas fallaron`,
        imported: insertedIds.length,
        ids: insertedIds,
        errors,
      },
      { status: 207 }
    )
  }

  return NextResponse.json({
    imported: insertedIds.length,
    ids: insertedIds,
    errors,
    summary,
  })
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

async function readRowsFromRequest(req: NextRequest): Promise<RowInput[]> {
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) throw new Error('Falta el campo "file" en el formulario')
    if (file.size === 0) throw new Error('Archivo vacío')
    if (file.size > 10 * 1024 * 1024) throw new Error('Archivo mayor a 10 MB')
    const arrayBuffer = await file.arrayBuffer()
    return parseImport(Buffer.from(arrayBuffer))
  }

  if (contentType.includes('application/json')) {
    const body = (await req.json()) as { rows?: RowInput[] }
    if (!Array.isArray(body.rows)) {
      throw new Error('JSON debe contener { rows: [...] }')
    }
    return body.rows.map((r, i) => ({
      rowIndex: r.rowIndex ?? i + 2,
      data: r.data ?? {},
    }))
  }

  throw new Error('Content-Type no soportado — use multipart/form-data o application/json')
}

async function buildValidationContext(): Promise<ValidationContext> {
  // Scan profiles y inventory (hiredDrivers no existe en DynamoDB, se retorna vacío)
  const [profilesResult, inventoryResult] = await Promise.all([
    ddb.send(new ScanCommand({
      TableName: TABLE.profiles,
      ProjectionExpression: 'codigoCgbvp, dni',
    })),
    ddb.send(new ScanCommand({
      TableName: TABLE.inventory,
      ProjectionExpression: 'codigoCbp',
    })),
  ])

  const allProfiles = profilesResult.Items ?? []
  const existing = inventoryResult.Items ?? []

  return {
    validProfileCodes: new Set(
      allProfiles.map((p) => p.codigoCgbvp as string | undefined).filter((c): c is string => !!c)
    ),
    validProfileDnis: new Set(
      allProfiles.map((p) => p.dni as string | undefined).filter((d): d is string => !!d)
    ),
    validHiredDriverCodes: new Set<string>(), // hiredDrivers no migrado a DynamoDB
    existingCodigosCbp: new Set(
      existing.map((i) => i.codigoCbp as string | undefined).filter((c): c is string => !!c)
    ),
  }
}

/** Construye mapa codigoCbp → itemId para detectar items existentes en commit */
async function buildCodigoCbpMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  let lastKey: Record<string, unknown> | undefined

  do {
    const res = await ddb.send(new ScanCommand({
      TableName: TABLE.inventory,
      ProjectionExpression: 'itemId, codigoCbp',
      ExclusiveStartKey: lastKey,
    }))
    for (const item of res.Items ?? []) {
      if (item.codigoCbp) map.set(item.codigoCbp as string, item.itemId as string)
    }
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  return map
}

function buildSummary(results: RowResult[]) {
  let valid = 0
  let invalid = 0
  let warnings = 0
  for (const r of results) {
    if (r.valid) valid++
    else invalid++
    if (r.issues.some((i) => i.level === 'warning')) warnings++
  }
  return { total: results.length, valid, invalid, warnings }
}
