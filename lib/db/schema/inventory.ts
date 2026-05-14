import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  boolean,
  decimal,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'
import { sections } from './sections'

// ================================================================
// CATEGORÍAS Y ENUMS
// ================================================================

/**
 * Categorías de ítems de inventario.
 *
 * Importante:
 *   - `medico` = equipos médicos (desfibrilador, monitor, botiquín avanzado)
 *   - `medicamento` = fármacos con lote y fecha de vencimiento
 *   - `insumo_medico` = gasas, sueros, vendas (insumos sanitarios consumibles)
 *   - `insumo` = consumibles generales (espuma, combustible)
 */
export const INVENTORY_CATEGORIES = [
  'herramienta',
  'equipo',
  'accesorio',
  'epp',
  'vehiculo',
  'comunicacion',
  'medico',
  'medicamento',
  'insumo_medico',
  'rescate',
  'hazmat',
  'insumo',
  'mobiliario',
] as const
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number]

export const INVENTORY_CONDITIONS = [
  'operativo',
  'mantenimiento',
  'baja',
  'pendiente_revision',
] as const
export type InventoryCondition = (typeof INVENTORY_CONDITIONS)[number]

/**
 * Tipos de almacén.
 *
 * - `servicios`       → Almacén de Servicios Generales
 * - `sanidad`         → Almacén de Prehospitalaria (Sanidad)
 * - `instruccion`     → Almacén de Instrucción
 * - `imagen`          → Almacén de Imagen Institucional
 * - `administracion`  → Almacén de Administración
 * - `maquina`         → Inventario interno de una máquina específica.
 *                       Requiere `almacen_referencia` con el slug de la máquina
 *                       (p.ej. maquina_163_1, ambulancia_163, rescate_163, auxiliar_163).
 */
export const ALMACEN_TIPOS = [
  'servicios',
  'sanidad',
  'instruccion',
  'imagen',
  'administracion',
  'maquina',
] as const
export type AlmacenTipo = (typeof ALMACEN_TIPOS)[number]

/**
 * Unidades de medida aceptadas.
 * Si el usuario no especifica, se asume 'unidad'.
 */
export const INVENTORY_UNIT_MEASURES = [
  'unidad',
  'par',
  'kit',
  'metro',
  'litro',
  'kilo',
  'caja',
  'ampolla',
  'frasco',
  'tableta',
  'galon',
  'balon',
] as const
export type InventoryUnitMeasure = (typeof INVENTORY_UNIT_MEASURES)[number]

/**
 * Subcategorías estandarizadas para EPP (cuando categoria = 'epp').
 * Son opcionales pero ayudan a reporteria ("cuántos cascos tengo", etc.).
 */
export const EPP_SUBCATEGORIES = [
  // Estructural (sobre el cuerpo)
  'capote',
  'pantalon',
  'casco',
  'botas',
  'guantes',
  'capucha_nomex',
  'scba',
  'cinturon',
  // Técnico / equipo individual asignable
  'radio',
  'linterna',
  'lampara_casco',
  'mascara_proteccion',
  'gafas',
  'arnes',
  'cuerda_personal',
  // Espacio/infraestructura asignada
  'casillero',
  'jaula',
  'gaveta',
  // Fallback
  'otros',
] as const
export type EppSubcategory = (typeof EPP_SUBCATEGORIES)[number]

// ================================================================
// TABLA PRINCIPAL DE INVENTARIO
// ================================================================

export const inventory = pgTable('inventory', {
  id: uuid('id').primaryKey().defaultRandom(),

  // ── Identificación ──────────────────────────────────────────
  name: text('name').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  brand: text('brand'),
  model: text('model'),
  manufactureYear: integer('manufacture_year'),

  // ── Trazabilidad ────────────────────────────────────────────
  /** Código asignado por CGBVP a nivel institucional (único si existe) */
  codigoCbp: text('codigo_cbp').unique(),
  /** Serial del fabricante */
  numeroSerie: text('numero_serie'),
  /** Correlativo interno de la compañía */
  numeroSecuencia: text('numero_secuencia'),
  /** Para etiquetado físico futuro */
  codigoBarrasQr: text('codigo_barras_qr'),

  // ── Ubicación y asignación ──────────────────────────────────
  /** Tipo de almacén (servicios/sanidad/instruccion/imagen/administracion/maquina) */
  almacenTipo: text('almacen_tipo').notNull(),
  /** Slug de la máquina cuando almacen_tipo='maquina' (p.ej. 'maquina_163_1'). null en otros casos. */
  almacenReferencia: text('almacen_referencia'),
  /**
   * FK al compartimiento especifico donde vive este item dentro de la maquina.
   * Solo aplica cuando almacenTipo='maquina'. Permite checklists por QR.
   * Se resuelve como text (UUID) para evitar ciclo de imports con machines.ts.
   */
  compartmentId: uuid('compartment_id'),
  /** Ubicación específica dentro del almacén (p.ej. "Estante B-3", "Compartimiento 4") */
  ubicacionInterna: text('ubicacion_interna'),
  /** Sección lógica a la que pertenece el ítem (FK opcional — para reportería transversal) */
  sectionId: uuid('section_id').references(() => sections.id),
  /**
   * Código de asignación individual (para EPP y equipos personales).
   * Formatos aceptados:
   *   - A##### → código CGBVP de bombero (ej: A23118)
   *   - R##### → código de piloto rentado (ej: R09570)
   *   - ######## → DNI de 8 dígitos como fallback (cuando no hay código CBP aún)
   */
  assignedCodigo: text('assigned_codigo'),
  /** Link resuelto al profile — se llena cuando el código matchea profiles.codigoCgbvp o profiles.dni */
  assignedProfileId: uuid('assigned_profile_id').references(() => profiles.id),
  /** Link resuelto al piloto rentado — se llena cuando el código matchea hired_drivers.codigoCgbvp */
  assignedHiredDriverId: integer('assigned_hired_driver_id'),
  /** Cantidad en stock. Para ítems individuales suele ser 1 */
  quantity: integer('quantity').notNull().default(1),
  /** Unidad de medida (unidad/par/kit/metro/litro/kilo/caja/...) */
  unitMeasure: text('unit_measure').default('unidad'),

  // ── Estado y mantenimiento ──────────────────────────────────
  condition: text('condition').notNull().default('operativo'),
  requiresMaintenance: boolean('requires_maintenance').default(false),
  lastMaintenanceDate: date('last_maintenance_date'),
  nextMaintenanceDate: date('next_maintenance_date'),
  maintenanceIntervalMonths: integer('maintenance_interval_months'),

  // ── Vencimiento y vida útil ─────────────────────────────────
  /** Fecha en que el ítem vence (medicamentos, insumos médicos, químicos) */
  expirationDate: date('expiration_date'),
  requiresCertification: boolean('requires_certification').default(false),
  lastCertificationDate: date('last_certification_date'),
  nextCertificationDate: date('next_certification_date'),
  /** Vida útil en meses (desde fabricación o adquisición) */
  usefulLifeMonths: integer('useful_life_months'),
  /** Fecha calculada o declarada de fin de vida útil */
  endOfLifeDate: date('end_of_life_date'),
  /** Lote de fabricación (trazabilidad farmacéutica) */
  lote: text('lote'),

  // ── Administrativo ──────────────────────────────────────────
  purchaseDate: date('purchase_date'),
  supplier: text('supplier'),
  /** Valor referencial en PEN — para reposición/seguros */
  referenceValue: decimal('reference_value', { precision: 12, scale: 2 }),
  notes: text('notes'),

  // ── Auditoría ───────────────────────────────────────────────
  createdBy: uuid('created_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  section: one(sections, {
    fields: [inventory.sectionId],
    references: [sections.id],
  }),
  assignedProfile: one(profiles, {
    fields: [inventory.assignedProfileId],
    references: [profiles.id],
  }),
  createdByProfile: one(profiles, {
    fields: [inventory.createdBy],
    references: [profiles.id],
  }),
  attachments: many(inventoryAttachments),
}))

// ================================================================
// ADJUNTOS (fichas técnicas, actas de entrega firmadas, fotos)
// ================================================================

export const INVENTORY_ATTACHMENT_TYPES = [
  'ficha_tecnica',
  'acta_entrega',
  'foto',
  'certificacion',
  'factura',
  'otro',
] as const
export type InventoryAttachmentType = (typeof INVENTORY_ATTACHMENT_TYPES)[number]

export const inventoryAttachments = pgTable('inventory_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  inventoryId: uuid('inventory_id')
    .notNull()
    .references(() => inventory.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  fileName: text('file_name').notNull(),
  /** Key en S3 (no URL completa) — permite regenerar presigned URLs */
  fileKey: text('file_key').notNull(),
  fileSizeBytes: integer('file_size_bytes'),
  mimeType: text('mime_type'),
  uploadedBy: uuid('uploaded_by').references(() => profiles.id),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
  notes: text('notes'),
})

export const inventoryAttachmentsRelations = relations(
  inventoryAttachments,
  ({ one }) => ({
    inventory: one(inventory, {
      fields: [inventoryAttachments.inventoryId],
      references: [inventory.id],
    }),
    uploadedByProfile: one(profiles, {
      fields: [inventoryAttachments.uploadedBy],
      references: [profiles.id],
    }),
  })
)

// ================================================================
// TIPOS INFERIDOS
// ================================================================

export type InventoryItem = typeof inventory.$inferSelect
export type NewInventoryItem = typeof inventory.$inferInsert
export type InventoryAttachment = typeof inventoryAttachments.$inferSelect
export type NewInventoryAttachment = typeof inventoryAttachments.$inferInsert
