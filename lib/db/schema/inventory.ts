/**
 * Inventario
 *
 * Tablas DynamoDB:
 *   {PREFIX}-inventory              PK: itemId  + GSI sectionId-index, category-index
 *   {PREFIX}-inventory-attachments  PK: itemId, SK: attachmentId
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

export const ALMACEN_TIPOS = [
  'servicios',
  'sanidad',
  'instruccion',
  'imagen',
  'administracion',
  'maquina',
] as const
export type AlmacenTipo = (typeof ALMACEN_TIPOS)[number]

export const INVENTORY_UNIT_MEASURES = [
  'unidad', 'par', 'kit', 'metro', 'litro', 'kilo',
  'caja', 'ampolla', 'frasco', 'tableta', 'galon', 'balon',
] as const
export type InventoryUnitMeasure = (typeof INVENTORY_UNIT_MEASURES)[number]

export const EPP_SUBCATEGORIES = [
  'capote', 'pantalon', 'casco', 'botas', 'guantes', 'capucha_nomex',
  'scba', 'cinturon', 'radio', 'linterna', 'lampara_casco',
  'mascara_proteccion', 'gafas', 'arnes', 'cuerda_personal',
  'casillero', 'jaula', 'gaveta', 'otros',
] as const
export type EppSubcategory = (typeof EPP_SUBCATEGORIES)[number]

export const INVENTORY_ATTACHMENT_TYPES = [
  'ficha_tecnica', 'acta_entrega', 'foto', 'certificacion', 'factura', 'otro',
] as const
export type InventoryAttachmentType = (typeof INVENTORY_ATTACHMENT_TYPES)[number]

export interface InventoryItem {
  itemId: string               // PK
  name: string
  category: InventoryCategory  // GSI: category-index
  subcategory?: string
  brand?: string
  model?: string
  manufactureYear?: number
  codigoCbp?: string
  numeroSerie?: string
  numeroSecuencia?: string
  codigoBarrasQr?: string
  almacenTipo: AlmacenTipo
  almacenReferencia?: string
  compartmentId?: string
  ubicacionInterna?: string
  sectionId?: string           // GSI: sectionId-index
  assignedCodigo?: string
  assignedProfileId?: string
  assignedHiredDriverId?: number
  quantity: number
  unitMeasure?: InventoryUnitMeasure
  condition: InventoryCondition
  requiresMaintenance?: boolean
  lastMaintenanceDate?: string  // YYYY-MM-DD
  nextMaintenanceDate?: string
  maintenanceIntervalMonths?: number
  expirationDate?: string
  requiresCertification?: boolean
  lastCertificationDate?: string
  nextCertificationDate?: string
  usefulLifeMonths?: number
  endOfLifeDate?: string
  lote?: string
  purchaseDate?: string
  supplier?: string
  referenceValue?: string       // decimal como string para precisión
  notes?: string
  createdBy?: string            // profileId
  createdAt: string             // ISO 8601
  updatedAt: string
}

export interface InventoryAttachment {
  itemId: string               // PK
  attachmentId: string         // SK
  type: InventoryAttachmentType
  fileName: string
  fileKey: string              // Key en S3
  fileSizeBytes?: number
  mimeType?: string
  uploadedBy?: string          // profileId
  uploadedAt: string           // ISO 8601
  notes?: string
}

export type NewInventoryItem = Omit<InventoryItem, 'createdAt' | 'updatedAt'>
export type NewInventoryAttachment = Omit<InventoryAttachment, 'uploadedAt'>
