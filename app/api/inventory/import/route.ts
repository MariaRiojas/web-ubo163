import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { profiles, hiredDrivers, inventory } from '@/lib/db/schema'
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
 *   Valida cada fila y devuelve:
 *     {
 *       rows: [{ rowIndex, data, valid, issues: [{field, message, level}] }],
 *       summary: { total, valid, invalid, warnings }
 *     }
 *   NO escribe nada en BD.
 *
 * ─ mode=commit ─
 *   Acepta solo JSON con { rows: [...] } ya editadas.
 *   Revalida (no confía en el cliente), hace bulk insert en transacción.
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

  // ─── Construir contexto de validación (una sola vez, batch) ───
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
    // Modo validación: devolvemos todo tal cual (sin escribir)
    return NextResponse.json({
      rows: results.map(({ normalized, ...rest }) => rest), // omitimos normalized (pesado)
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

  // Batch insert en transacción
  const toInsert = results.filter((r) => r.normalized !== null)
  const insertedIds: string[] = []
  const errors: Array<{ rowIndex: number; message: string }> = []

  try {
    const profileId = (session.user as any).profileId as string | undefined

    await db.transaction(async (tx) => {
      for (const r of toInsert) {
        const n = r.normalized!

        // Resolver assignedProfileId / assignedHiredDriverId desde el código
        let assignedProfileId: string | null = null
        let assignedHiredDriverId: number | null = null

        if (n.assignedCodigo) {
          const code = n.assignedCodigo
          if (/^R\d{5}$/.test(code)) {
            const hd = await tx.query.hiredDrivers.findFirst({
              where: eq(hiredDrivers.codigoCgbvp, code),
              columns: { id: true },
            })
            if (hd) assignedHiredDriverId = hd.id
          } else {
            // A##### o DNI de 8 dígitos → profiles
            const p = await tx.query.profiles.findFirst({
              where: (pp, { or, eq }) =>
                or(eq(pp.codigoCgbvp, code), eq(pp.dni, code)),
              columns: { id: true },
            })
            if (p) assignedProfileId = p.id
          }
        }

        try {
          const [inserted] = await tx
            .insert(inventory)
            .values({
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
              assignedHiredDriverId,
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
              referenceValue: n.referenceValue ? String(n.referenceValue) : null,
              notes: n.notes,
              createdBy: profileId ?? null,
            })
            .onConflictDoUpdate({
              target: inventory.codigoCbp,
              set: {
                name: n.name,
                category: n.category,
                subcategory: n.subcategory,
                brand: n.brand,
                model: n.model,
                condition: n.condition,
                almacenTipo: n.almacenTipo,
                almacenReferencia: n.almacenReferencia,
                ubicacionInterna: n.ubicacionInterna,
                quantity: n.quantity,
                updatedAt: new Date(),
              },
            })
            .returning({ id: inventory.id })
          if (inserted) insertedIds.push(inserted.id)
        } catch (err: any) {
          errors.push({
            rowIndex: r.rowIndex,
            message: err?.message ?? 'Error al insertar',
          })
          throw err // rollback total
        }
      }
    })
  } catch (err: any) {
    // Si cae la transacción, devolvemos los errores acumulados
    if (errors.length === 0) {
      errors.push({ rowIndex: 0, message: err?.message ?? 'Transacción falló' })
    }
    return NextResponse.json(
      {
        error: 'No se pudo completar el import',
        imported: 0,
        ids: [],
        errors,
      },
      { status: 500 }
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

    // Validar tipo/tamaño
    if (file.size === 0) throw new Error('Archivo vacío')
    if (file.size > 10 * 1024 * 1024) throw new Error('Archivo mayor a 10 MB')

    const arrayBuffer = await file.arrayBuffer()
    const rows = await parseImport(Buffer.from(arrayBuffer))
    return rows
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
  // Traer en batch (una sola query por tabla)
  const [allProfiles, allDrivers, existing] = await Promise.all([
    db.query.profiles.findMany({
      columns: { codigoCgbvp: true, dni: true },
    }),
    db.query.hiredDrivers.findMany({
      columns: { codigoCgbvp: true },
    }),
    db.query.inventory.findMany({
      columns: { codigoCbp: true },
    }),
  ])

  return {
    validProfileCodes: new Set(
      allProfiles.map((p) => p.codigoCgbvp).filter((c): c is string => !!c)
    ),
    validProfileDnis: new Set(
      allProfiles.map((p) => p.dni).filter((d): d is string => !!d)
    ),
    validHiredDriverCodes: new Set(
      allDrivers.map((d) => d.codigoCgbvp).filter((c): c is string => !!c)
    ),
    existingCodigosCbp: new Set(
      existing.map((i) => i.codigoCbp).filter((c): c is string => !!c)
    ),
  }
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
