import type {
  InventoryCategory,
  InventoryCondition,
  AlmacenTipo,
  InventoryUnitMeasure,
  EppSubcategory,
  InventoryAttachmentType,
} from '@/lib/db/schema/inventory'

/**
 * Etiquetas en español para los enums de inventario.
 * Se usan en la UI (dropdowns, badges) y en las hojas de Excel.
 */

// ─── Categorías ────────────────────────────────────────────────────────
export const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  herramienta: 'Herramienta',
  equipo: 'Equipo',
  accesorio: 'Accesorio',
  epp: 'EPP (Equipo de Protección Personal)',
  vehiculo: 'Vehículo',
  comunicacion: 'Comunicación',
  medico: 'Equipo médico',
  medicamento: 'Medicamento',
  insumo_medico: 'Insumo médico',
  rescate: 'Rescate',
  hazmat: 'Materiales peligrosos (HazMat)',
  insumo: 'Insumo general',
  mobiliario: 'Mobiliario',
}

// ─── Condición ─────────────────────────────────────────────────────────
export const CONDITION_LABELS: Record<InventoryCondition, string> = {
  operativo: 'Operativo',
  mantenimiento: 'En mantenimiento',
  baja: 'Dado de baja',
  pendiente_revision: 'Pendiente de revisión',
}

// ─── Tipo de almacén ───────────────────────────────────────────────────
export const ALMACEN_TIPO_LABELS: Record<AlmacenTipo, string> = {
  servicios: 'Almacén de Servicios Generales',
  sanidad: 'Almacén de Sanidad (Prehospitalaria)',
  instruccion: 'Almacén de Instrucción',
  imagen: 'Almacén de Imagen Institucional',
  administracion: 'Almacén de Administración',
  maquina: 'Inventario de máquina (vehículo)',
}

// ─── Unidades de medida ────────────────────────────────────────────────
export const UNIT_MEASURE_LABELS: Record<InventoryUnitMeasure, string> = {
  unidad: 'Unidad',
  par: 'Par',
  kit: 'Kit',
  metro: 'Metro',
  litro: 'Litro',
  kilo: 'Kilogramo',
  caja: 'Caja',
  ampolla: 'Ampolla',
  frasco: 'Frasco',
  tableta: 'Tableta',
  galon: 'Galón',
  balon: 'Balón',
}

// ─── Subcategorías de EPP ──────────────────────────────────────────────
export const EPP_SUBCATEGORY_LABELS: Record<EppSubcategory, string> = {
  // Estructural
  capote: 'Capote estructural',
  pantalon: 'Pantalón estructural',
  casco: 'Casco',
  botas: 'Botas',
  guantes: 'Guantes',
  capucha_nomex: 'Capucha Nomex',
  scba: 'SCBA (equipo autónomo de respiración)',
  cinturon: 'Cinturón',
  // Técnico
  radio: 'Radio',
  linterna: 'Linterna',
  lampara_casco: 'Lámpara de casco',
  mascara_proteccion: 'Máscara de protección',
  gafas: 'Gafas de protección',
  arnes: 'Arnés',
  cuerda_personal: 'Cuerda personal',
  // Infraestructura asignada
  casillero: 'Casillero',
  jaula: 'Jaula',
  gaveta: 'Gaveta',
  // Otros
  otros: 'Otros',
}

export const EPP_SUBCATEGORY_GROUPS: Array<{
  label: string
  items: EppSubcategory[]
}> = [
  {
    label: 'Equipo estructural',
    items: ['capote', 'pantalon', 'casco', 'botas', 'guantes', 'capucha_nomex', 'scba', 'cinturon'],
  },
  {
    label: 'Equipo técnico individual',
    items: ['radio', 'linterna', 'lampara_casco', 'mascara_proteccion', 'gafas', 'arnes', 'cuerda_personal'],
  },
  {
    label: 'Infraestructura asignada',
    items: ['casillero', 'jaula', 'gaveta'],
  },
  {
    label: 'Otros',
    items: ['otros'],
  },
]

// ─── Tipos de adjunto ──────────────────────────────────────────────────
export const ATTACHMENT_TYPE_LABELS: Record<InventoryAttachmentType, string> = {
  ficha_tecnica: 'Ficha técnica',
  acta_entrega: 'Acta de entrega',
  foto: 'Fotografía',
  certificacion: 'Certificación',
  factura: 'Factura',
  otro: 'Otro',
}

// ─── Validación de códigos de asignación ───────────────────────────────
/**
 * Formatos aceptados en la columna `asignado_codigo`:
 *   - A##### → código CGBVP de bombero (A + 5 dígitos)
 *   - R##### → código de piloto rentado (R + 5 dígitos)
 *   - ######## → DNI de 8 dígitos (fallback para bomberos recién graduados)
 *
 * Nota: el scraper CGBVP guarda códigos como "31501980006001" (14 dígitos).
 * Éstos no son los códigos del carnet bomberil (A#####). La columna
 * profiles.codigoCgbvp acepta ambos formatos; buscamos por match exacto.
 */
export const ASSIGNED_CODIGO_REGEX = /^(A\d{5}|R\d{5}|\d{8})$/

// ─── Presets de columnas visibles en UI ────────────────────────────────
/**
 * Cada preset define qué columnas se muestran por defecto.
 * El usuario puede guardar su propio preset en localStorage.
 */
export const COLUMN_PRESETS: Record<string, string[]> = {
  Todo: [
    'name', 'category', 'subcategory', 'brand', 'model', 'manufactureYear',
    'codigoCbp', 'numeroSerie', 'numeroSecuencia',
    'almacenTipo', 'almacenReferencia', 'ubicacionInterna', 'assignedCodigo',
    'quantity', 'unitMeasure', 'condition',
    'requiresMaintenance', 'lastMaintenanceDate', 'nextMaintenanceDate',
    'expirationDate', 'lote',
    'requiresCertification', 'nextCertificationDate',
    'endOfLifeDate',
    'purchaseDate', 'supplier', 'referenceValue', 'notes',
  ],
  Sanidad: [
    'name', 'category', 'brand', 'lote', 'quantity', 'unitMeasure',
    'expirationDate', 'almacenReferencia', 'ubicacionInterna', 'condition', 'notes',
  ],
  EPP: [
    'name', 'subcategory', 'brand', 'model',
    'assignedCodigo', 'almacenTipo', 'condition',
    'manufactureYear', 'endOfLifeDate', 'notes',
  ],
  Maquinas: [
    'name', 'category', 'brand', 'model', 'numeroSerie',
    'almacenReferencia', 'ubicacionInterna',
    'condition', 'requiresCertification', 'nextCertificationDate',
    'lastMaintenanceDate', 'nextMaintenanceDate',
    'notes',
  ],
  Administrativo: [
    'name', 'category', 'supplier', 'purchaseDate', 'referenceValue',
    'almacenTipo', 'ubicacionInterna', 'quantity', 'condition', 'notes',
  ],
}

// ─── Columnas del Excel en orden ───────────────────────────────────────
export const EXCEL_COLUMNS: Array<{
  key: string
  header: string
  required: boolean
  example: string
  notes?: string
}> = [
  // Identificación
  { key: 'nombre_objeto', header: 'Nombre del objeto', required: true, example: 'Desfibrilador DEA' },
  { key: 'categoria', header: 'Categoría', required: true, example: 'medico', notes: 'Ver hoja "Referencia"' },
  { key: 'subcategoria', header: 'Subcategoría', required: false, example: 'capote', notes: 'Si EPP, ver hoja "Referencia"' },
  { key: 'marca', header: 'Marca', required: false, example: 'Zoll' },
  { key: 'modelo', header: 'Modelo', required: false, example: 'AED Plus' },
  { key: 'año_fabricacion', header: 'Año fabricación', required: false, example: '2022' },

  // Trazabilidad
  { key: 'codigo_cbp', header: 'Código CBP', required: false, example: 'CBP-163-DEA-01', notes: 'Si está duplicado, actualiza el ítem existente' },
  { key: 'numero_serie', header: 'Número de serie', required: false, example: 'SN-12345' },
  { key: 'numero_secuencia', header: 'Número de secuencia', required: false, example: 'MAQ-2026-042' },
  { key: 'codigo_barras_qr', header: 'Código barras / QR', required: false, example: '' },

  // Ubicación
  { key: 'almacen_tipo', header: 'Tipo de almacén', required: true, example: 'maquina', notes: 'Ver hoja "Referencia"' },
  { key: 'almacen_referencia', header: 'Máquina (si aplica)', required: false, example: 'AMBULANCIA 163', notes: 'Solo si tipo=maquina' },
  { key: 'ubicacion_interna', header: 'Ubicación interna', required: false, example: 'Estante B-3' },
  { key: 'asignado_codigo', header: 'Asignado a (código)', required: false, example: 'A23118', notes: 'A##### bombero, R##### piloto, o DNI' },
  { key: 'cantidad', header: 'Cantidad', required: true, example: '1' },
  { key: 'unidad_medida', header: 'Unidad de medida', required: false, example: 'unidad' },

  // Estado
  { key: 'condicion', header: 'Condición', required: true, example: 'operativo' },
  { key: 'requiere_mantenimiento', header: 'Requiere mantenimiento', required: false, example: 'Sí' },
  { key: 'ultima_mantencion', header: 'Última mantención', required: false, example: '2026-01-15', notes: 'Formato AAAA-MM-DD' },
  { key: 'proxima_mantencion', header: 'Próxima mantención', required: false, example: '2026-07-15' },
  { key: 'intervalo_mantenimiento_meses', header: 'Intervalo mantto. (meses)', required: false, example: '6' },

  // Vencimiento / vida útil
  { key: 'fecha_vencimiento', header: 'Fecha de vencimiento', required: false, example: '2027-03-15', notes: 'Para medicamentos e insumos' },
  { key: 'requiere_certificacion', header: 'Requiere certificación', required: false, example: 'Sí' },
  { key: 'fecha_ultima_certificacion', header: 'Última certificación', required: false, example: '2025-11-20' },
  { key: 'fecha_proxima_certificacion', header: 'Próxima certificación', required: false, example: '2026-11-20' },
  { key: 'vida_util_meses', header: 'Vida útil (meses)', required: false, example: '120' },
  { key: 'fecha_fin_vida_util', header: 'Fin de vida útil', required: false, example: '2034-06-15' },
  { key: 'lote', header: 'Lote', required: false, example: 'L-ADR-2406-08' },

  // Administrativo
  { key: 'fecha_adquisicion', header: 'Fecha de adquisición', required: false, example: '2025-03-10' },
  { key: 'proveedor', header: 'Proveedor', required: false, example: 'Distribuidora Médica S.A.' },
  { key: 'valor_referencial', header: 'Valor referencial (PEN)', required: false, example: '1800.00' },
  { key: 'notas', header: 'Notas', required: false, example: 'Revisar stock mensual' },
]
