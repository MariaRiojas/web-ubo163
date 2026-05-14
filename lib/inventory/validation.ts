import { z } from 'zod'
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CONDITIONS,
  ALMACEN_TIPOS,
  INVENTORY_UNIT_MEASURES,
  EPP_SUBCATEGORIES,
} from '@/lib/db/schema/inventory'
import { getMachineBySlug } from '@/lib/cgbvp/machines'
import { ASSIGNED_CODIGO_REGEX } from './constants'

/**
 * Schema Zod de una fila del inventario tal como llega del Excel.
 *
 * Todas las fechas se aceptan en formato ISO 'YYYY-MM-DD' o Date.
 * Booleans se aceptan como 'Sí'/'No'/'si'/'no'/'true'/'false'/true/false.
 */

function optionalString(field = z.string()) {
  return field.optional().nullable().transform((v) => (v === '' ? null : v ?? null))
}

function optionalNumber(min?: number, max?: number) {
  let s: z.ZodTypeAny = z.coerce.number({
    invalid_type_error: 'Debe ser un número',
  })
  if (min !== undefined) s = (s as z.ZodNumber).min(min, `Mínimo ${min}`)
  if (max !== undefined) s = (s as z.ZodNumber).max(max, `Máximo ${max}`)
  return s.optional().nullable().transform((v) => (v === undefined || v === null || Number.isNaN(v) ? null : v))
}

function booleanFromText() {
  return z
    .union([z.boolean(), z.string()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v === null || v === undefined || v === '') return null
      if (typeof v === 'boolean') return v
      const s = String(v).trim().toLowerCase()
      if (['sí', 'si', 'yes', 'true', '1', 'x'].includes(s)) return true
      if (['no', 'false', '0', ''].includes(s)) return false
      return null
    })
}

function dateFromText() {
  return z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((v, ctx) => {
      if (v === null || v === undefined || v === '') return null
      if (v instanceof Date) {
        return v.toISOString().slice(0, 10)
      }
      const s = String(v).trim()
      // Acepta formato ISO AAAA-MM-DD o DD/MM/AAAA
      const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
      const pe = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
      let y: string, m: string, d: string
      if (iso) [, y, m, d] = iso
      else if (pe) [, d, m, y] = pe
      else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Fecha inválida: "${s}". Usá AAAA-MM-DD o DD/MM/AAAA`,
        })
        return z.NEVER
      }
      // Validar que sea fecha real
      const dt = new Date(`${y}-${m}-${d}T00:00:00Z`)
      if (isNaN(dt.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Fecha inválida: "${s}"`,
        })
        return z.NEVER
      }
      return `${y}-${m}-${d}`
    })
}

const currentYear = new Date().getFullYear()

/**
 * Schema de fila. Todos los campos son opcionales EXCEPTO los marcados
 * con .min(1) o similar: nombre_objeto, categoria, almacen_tipo,
 * cantidad, condicion.
 */
export const inventoryRowSchema = z.object({
  // Identificación
  nombre_objeto: z
    .string({ required_error: 'Nombre requerido' })
    .trim()
    .min(1, 'Nombre requerido')
    .max(200, 'Máximo 200 caracteres'),
  categoria: z.enum(INVENTORY_CATEGORIES, {
    errorMap: () => ({ message: `Debe ser uno de: ${INVENTORY_CATEGORIES.join(', ')}` }),
  }),
  subcategoria: optionalString(z.string().trim()),
  marca: optionalString(z.string().trim().max(100)),
  modelo: optionalString(z.string().trim().max(100)),
  año_fabricacion: optionalNumber(1950, currentYear),

  // Trazabilidad
  codigo_cbp: optionalString(z.string().trim().max(50)),
  numero_serie: optionalString(z.string().trim().max(100)),
  numero_secuencia: optionalString(z.string().trim().max(50)),
  codigo_barras_qr: optionalString(z.string().trim().max(100)),

  // Ubicación
  almacen_tipo: z.enum(ALMACEN_TIPOS, {
    errorMap: () => ({ message: `Debe ser uno de: ${ALMACEN_TIPOS.join(', ')}` }),
  }),
  almacen_referencia: optionalString(z.string().trim()),
  ubicacion_interna: optionalString(z.string().trim().max(200)),
  asignado_codigo: optionalString(
    z
      .string()
      .trim()
      .regex(ASSIGNED_CODIGO_REGEX, 'Formato esperado: A##### (bombero), R##### (piloto) o DNI de 8 dígitos')
  ),
  cantidad: z.coerce.number().int().min(0, 'Debe ser ≥ 0'),
  unidad_medida: z.enum(INVENTORY_UNIT_MEASURES).optional().nullable().default('unidad'),

  // Estado
  condicion: z.enum(INVENTORY_CONDITIONS, {
    errorMap: () => ({ message: `Debe ser uno de: ${INVENTORY_CONDITIONS.join(', ')}` }),
  }),
  requiere_mantenimiento: booleanFromText(),
  ultima_mantencion: dateFromText(),
  proxima_mantencion: dateFromText(),
  intervalo_mantenimiento_meses: optionalNumber(0, 240),

  // Vencimiento
  fecha_vencimiento: dateFromText(),
  requiere_certificacion: booleanFromText(),
  fecha_ultima_certificacion: dateFromText(),
  fecha_proxima_certificacion: dateFromText(),
  vida_util_meses: optionalNumber(0, 600),
  fecha_fin_vida_util: dateFromText(),
  lote: optionalString(z.string().trim().max(100)),

  // Administrativo
  fecha_adquisicion: dateFromText(),
  proveedor: optionalString(z.string().trim().max(200)),
  valor_referencial: optionalNumber(0),
  notas: optionalString(z.string().trim().max(2000)),
})

export type InventoryRow = z.infer<typeof inventoryRowSchema>

// ─────────────────────────────────────────────────────────────────────
// Validación contextual (requiere acceso a BD para resolver códigos)
// ─────────────────────────────────────────────────────────────────────

export interface ValidationIssue {
  field: string
  message: string
  level: 'error' | 'warning'
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
  /** Fila normalizada lista para insert — solo si valid=true */
  normalized: NormalizedRow | null
}

export interface NormalizedRow {
  name: string
  category: string
  subcategory: string | null
  brand: string | null
  model: string | null
  manufactureYear: number | null
  codigoCbp: string | null
  numeroSerie: string | null
  numeroSecuencia: string | null
  codigoBarrasQr: string | null
  almacenTipo: string
  almacenReferencia: string | null
  ubicacionInterna: string | null
  assignedCodigo: string | null
  quantity: number
  unitMeasure: string
  condition: string
  requiresMaintenance: boolean | null
  lastMaintenanceDate: string | null
  nextMaintenanceDate: string | null
  maintenanceIntervalMonths: number | null
  expirationDate: string | null
  requiresCertification: boolean | null
  lastCertificationDate: string | null
  nextCertificationDate: string | null
  usefulLifeMonths: number | null
  endOfLifeDate: string | null
  lote: string | null
  purchaseDate: string | null
  supplier: string | null
  referenceValue: number | null
  notes: string | null
}

export interface ValidationContext {
  /** Códigos CGBVP de profiles activos (set para O(1) lookup) */
  validProfileCodes: Set<string>
  /** DNIs de profiles (fallback) */
  validProfileDnis: Set<string>
  /** Códigos CGBVP de pilotos rentados activos */
  validHiredDriverCodes: Set<string>
  /** Códigos CBP ya existentes en inventario (para detectar upsert vs duplicado) */
  existingCodigosCbp: Set<string>
}

/**
 * Valida una fila del Excel y devuelve el resultado estructurado.
 *
 * Los errores bloquean el import; las advertencias no.
 * Si valid=true, `normalized` contiene los datos listos para insertar en BD.
 */
export function validateRow(
  raw: Record<string, unknown>,
  ctx: ValidationContext
): ValidationResult {
  const issues: ValidationIssue[] = []

  // 1. Validación Zod (tipos, enums, formatos)
  const parsed = inventoryRowSchema.safeParse(raw)
  if (!parsed.success) {
    for (const err of parsed.error.errors) {
      issues.push({
        field: String(err.path[0] ?? ''),
        message: err.message,
        level: 'error',
      })
    }
    return { valid: false, issues, normalized: null }
  }

  const r = parsed.data

  // 2. Validaciones semánticas (reglas de negocio)

  // 2.1 Si almacen_tipo=maquina, debe haber referencia válida
  if (r.almacen_tipo === 'maquina') {
    if (!r.almacen_referencia) {
      issues.push({
        field: 'almacen_referencia',
        message: 'Obligatorio cuando el tipo de almacén es "maquina"',
        level: 'error',
      })
    } else {
      // Aceptar slug o label de máquina
      const { getMachineByLabel } = require('@/lib/cgbvp/machines') as typeof import('@/lib/cgbvp/machines')
      const bySlug = getMachineBySlug(r.almacen_referencia)
      const byLabel = getMachineByLabel(r.almacen_referencia)
      if (!bySlug && !byLabel) {
        issues.push({
          field: 'almacen_referencia',
          message: `Máquina "${r.almacen_referencia}" no reconocida`,
          level: 'error',
        })
      }
    }
  }

  // 2.2 Si asignado_codigo presente, debe existir en profiles o hired_drivers
  if (r.asignado_codigo) {
    const code = r.asignado_codigo
    const exists =
      ctx.validProfileCodes.has(code) ||
      ctx.validProfileDnis.has(code) ||
      ctx.validHiredDriverCodes.has(code)
    if (!exists) {
      issues.push({
        field: 'asignado_codigo',
        message: `Código "${code}" no corresponde a ningún efectivo o piloto activo`,
        level: 'error',
      })
    }
  }

  // 2.3 Coherencia de fechas
  if (
    r.fecha_ultima_certificacion &&
    r.fecha_proxima_certificacion &&
    r.fecha_ultima_certificacion > r.fecha_proxima_certificacion
  ) {
    issues.push({
      field: 'fecha_proxima_certificacion',
      message: 'Debe ser posterior a la última certificación',
      level: 'error',
    })
  }
  if (
    r.ultima_mantencion &&
    r.proxima_mantencion &&
    r.ultima_mantencion > r.proxima_mantencion
  ) {
    issues.push({
      field: 'proxima_mantencion',
      message: 'Debe ser posterior a la última mantención',
      level: 'error',
    })
  }

  // 3. Advertencias (no bloquean)
  const today = new Date().toISOString().slice(0, 10)
  const in90Days = addDays(today, 90)

  if (r.fecha_vencimiento && r.fecha_vencimiento < today) {
    issues.push({
      field: 'fecha_vencimiento',
      message: 'Fecha de vencimiento pasada',
      level: 'warning',
    })
  } else if (r.fecha_vencimiento && r.fecha_vencimiento <= in90Days) {
    issues.push({
      field: 'fecha_vencimiento',
      message: 'Vence en menos de 90 días',
      level: 'warning',
    })
  }

  if (r.fecha_proxima_certificacion && r.fecha_proxima_certificacion < today) {
    issues.push({
      field: 'fecha_proxima_certificacion',
      message: 'Certificación vencida',
      level: 'warning',
    })
  }

  if (r.fecha_fin_vida_util && r.fecha_fin_vida_util < today) {
    issues.push({
      field: 'fecha_fin_vida_util',
      message: 'Vida útil excedida',
      level: 'warning',
    })
  }

  if (r.cantidad === 0) {
    issues.push({ field: 'cantidad', message: 'Sin stock', level: 'warning' })
  }

  if (
    r.categoria === 'medicamento' &&
    !r.lote &&
    !r.fecha_vencimiento
  ) {
    issues.push({
      field: 'lote',
      message: 'Medicamento sin lote ni fecha de vencimiento',
      level: 'warning',
    })
  }

  if (r.categoria === 'epp' && !r.subcategoria) {
    issues.push({
      field: 'subcategoria',
      message: 'Recomendado: especificar tipo de EPP (capote, casco, botas, etc.)',
      level: 'warning',
    })
  }

  // Si no hay errores, construir row normalizado
  const hasErrors = issues.some((i) => i.level === 'error')
  if (hasErrors) {
    return { valid: false, issues, normalized: null }
  }

  // Normalizar almacen_referencia a slug si vino como label
  let refSlug: string | null = r.almacen_referencia
  if (r.almacen_tipo === 'maquina' && r.almacen_referencia) {
    const bySlug = getMachineBySlug(r.almacen_referencia)
    if (bySlug) {
      refSlug = bySlug.slug
    } else {
      const { getMachineByLabel } = require('@/lib/cgbvp/machines') as typeof import('@/lib/cgbvp/machines')
      const byLabel = getMachineByLabel(r.almacen_referencia)
      if (byLabel) refSlug = byLabel.slug
    }
  }

  const normalized: NormalizedRow = {
    name: r.nombre_objeto,
    category: r.categoria,
    subcategory: r.subcategoria,
    brand: r.marca,
    model: r.modelo,
    manufactureYear: r.año_fabricacion,
    codigoCbp: r.codigo_cbp,
    numeroSerie: r.numero_serie,
    numeroSecuencia: r.numero_secuencia,
    codigoBarrasQr: r.codigo_barras_qr,
    almacenTipo: r.almacen_tipo,
    almacenReferencia: r.almacen_tipo === 'maquina' ? refSlug : null,
    ubicacionInterna: r.ubicacion_interna,
    assignedCodigo: r.asignado_codigo,
    quantity: r.cantidad,
    unitMeasure: r.unidad_medida ?? 'unidad',
    condition: r.condicion,
    requiresMaintenance: r.requiere_mantenimiento,
    lastMaintenanceDate: r.ultima_mantencion,
    nextMaintenanceDate: r.proxima_mantencion,
    maintenanceIntervalMonths: r.intervalo_mantenimiento_meses,
    expirationDate: r.fecha_vencimiento,
    requiresCertification: r.requiere_certificacion,
    lastCertificationDate: r.fecha_ultima_certificacion,
    nextCertificationDate: r.fecha_proxima_certificacion,
    usefulLifeMonths: r.vida_util_meses,
    endOfLifeDate: r.fecha_fin_vida_util,
    lote: r.lote,
    purchaseDate: r.fecha_adquisicion,
    supplier: r.proveedor,
    referenceValue: r.valor_referencial,
    notes: r.notas,
  }

  return { valid: true, issues, normalized }
}

function addDays(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T00:00:00Z`)
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}
