/**
 * Diccionario de datos del inventario general.
 *
 * Fuente de verdad para documentar cada campo del `InventoryItem` y sus valores
 * permitidos. Se deriva del schema `lib/db/schema/inventory.ts`. Sirve como
 * referencia para quien carga el inventario y para tooltips/validaciones futuras.
 */
import {
  INVENTORY_CATEGORIES, INVENTORY_CONDITIONS, ALMACEN_TIPOS,
  INVENTORY_UNIT_MEASURES, EPP_SUBCATEGORIES, INVENTORY_ATTACHMENT_TYPES,
} from '@/lib/db/schema/inventory'

export interface EnumValue { value: string; label: string; hint?: string }
export interface EnumDef { key: string; title: string; values: EnumValue[] }

export const CATEGORY_LABELS: Record<string, string> = {
  herramienta: 'Herramienta', equipo: 'Equipo', accesorio: 'Accesorio',
  epp: 'EPP (protección personal)', vehiculo: 'Vehículo', comunicacion: 'Comunicación',
  medico: 'Médico', medicamento: 'Medicamento', insumo_medico: 'Insumo médico',
  rescate: 'Rescate', hazmat: 'HAZMAT (mat. peligrosos)', insumo: 'Insumo', mobiliario: 'Mobiliario',
}
export const CONDITION_LABELS: Record<string, string> = {
  operativo: 'Operativo', mantenimiento: 'En mantenimiento', baja: 'De baja', pendiente_revision: 'Pendiente de revisión',
}
export const ALMACEN_TIPO_LABELS: Record<string, string> = {
  servicios: 'Servicios Generales', sanidad: 'Sanidad', instruccion: 'Instrucción',
  imagen: 'Imagen', administracion: 'Administración', maquina: 'Máquina (parque motor)',
}
export const UNIT_LABELS: Record<string, string> = {
  unidad: 'Unidad', par: 'Par', kit: 'Kit', metro: 'Metro', litro: 'Litro', kilo: 'Kilo',
  caja: 'Caja', ampolla: 'Ampolla', frasco: 'Frasco', tableta: 'Tableta', galon: 'Galón', balon: 'Balón',
}
export const EPP_SUB_LABELS: Record<string, string> = {
  capote: 'Capote', pantalon: 'Pantalón', casco: 'Casco', botas: 'Botas', guantes: 'Guantes',
  capucha_nomex: 'Capucha Nomex', scba: 'SCBA (equipo respiración)', cinturon: 'Cinturón',
  radio: 'Radio', linterna: 'Linterna', lampara_casco: 'Lámpara de casco', mascara_proteccion: 'Máscara de protección',
  gafas: 'Gafas', arnes: 'Arnés', cuerda_personal: 'Cuerda personal', casillero: 'Casillero', jaula: 'Jaula', gaveta: 'Gaveta', otros: 'Otros',
}
export const ATTACHMENT_LABELS: Record<string, string> = {
  ficha_tecnica: 'Ficha técnica', acta_entrega: 'Acta de entrega', foto: 'Foto',
  certificacion: 'Certificación', factura: 'Factura', otro: 'Otro',
}

const toValues = (arr: readonly string[], labels: Record<string, string>): EnumValue[] =>
  arr.map(v => ({ value: v, label: labels[v] ?? v }))

export const ENUMS: EnumDef[] = [
  { key: 'category', title: 'Categorías (category)', values: toValues(INVENTORY_CATEGORIES, CATEGORY_LABELS) },
  { key: 'condition', title: 'Condición (condition)', values: toValues(INVENTORY_CONDITIONS, CONDITION_LABELS) },
  { key: 'almacenTipo', title: 'Tipo de almacén (almacenTipo)', values: toValues(ALMACEN_TIPOS, ALMACEN_TIPO_LABELS) },
  { key: 'unitMeasure', title: 'Unidad de medida (unitMeasure)', values: toValues(INVENTORY_UNIT_MEASURES, UNIT_LABELS) },
  { key: 'eppSub', title: 'Subcategorías de EPP (subcategory)', values: toValues(EPP_SUBCATEGORIES, EPP_SUB_LABELS) },
  { key: 'attachment', title: 'Tipos de adjunto (attachments)', values: toValues(INVENTORY_ATTACHMENT_TYPES, ATTACHMENT_LABELS) },
]

export interface FieldDef {
  field: string
  label: string
  type: string
  required?: boolean
  enumKey?: string
  desc: string
  example?: string
}
export interface FieldGroup { title: string; note?: string; fields: FieldDef[] }

export const FIELD_GROUPS: FieldGroup[] = [
  {
    title: 'Identificación',
    fields: [
      { field: 'itemId', label: 'ID del ítem', type: 'texto (auto)', desc: 'Identificador único generado por el sistema. No se edita.' },
      { field: 'name', label: 'Nombre', type: 'texto', required: true, desc: 'Denominación del ítem tal como se conoce en la compañía.', example: 'Extintor PQS 6 kg' },
      { field: 'category', label: 'Categoría', type: 'lista', required: true, enumKey: 'category', desc: 'Clasificación principal del ítem.' },
      { field: 'subcategory', label: 'Subcategoría', type: 'lista/texto', enumKey: 'eppSub', desc: 'Para EPP usar la lista de subcategorías; para otras categorías, texto libre opcional.' },
      { field: 'brand', label: 'Marca', type: 'texto', desc: 'Fabricante o marca comercial.', example: 'Bullard' },
      { field: 'model', label: 'Modelo', type: 'texto', desc: 'Modelo específico del fabricante.' },
      { field: 'manufactureYear', label: 'Año de fabricación', type: 'número', desc: 'Año en que se fabricó el ítem.', example: '2022' },
    ],
  },
  {
    title: 'Códigos y trazabilidad',
    fields: [
      { field: 'codigoCbp', label: 'Código CGBVP', type: 'texto', desc: 'Código patrimonial asignado por el Cuerpo General de Bomberos.' },
      { field: 'numeroSerie', label: 'Número de serie', type: 'texto', desc: 'Serie del fabricante (para equipos serializados).' },
      { field: 'numeroSecuencia', label: 'Número de secuencia', type: 'texto', desc: 'Correlativo interno de la compañía.' },
      { field: 'codigoBarrasQr', label: 'Código de barras / QR', type: 'texto', desc: 'Código impreso en la etiqueta del ítem.' },
    ],
  },
  {
    title: 'Ubicación — TRES conceptos distintos',
    note: 'No confundir: (1) a qué ÁREA pertenece, (2) en qué ALMACÉN FÍSICO / unidad está, y (3) su UBICACIÓN INTERNA dentro de esa unidad. El checklist del parque motor se arma con estos campos.',
    fields: [
      { field: 'sectionId', label: 'Sección / área dueña', type: 'referencia', desc: '(1) Área a la que pertenece administrativamente el ítem (Máquinas, Sanidad, Servicios, etc.). Define quién lo gestiona.' },
      { field: 'almacenTipo', label: 'Tipo de almacén', type: 'lista', required: true, enumKey: 'almacenTipo', desc: '(2) Dónde está almacenado físicamente. Usar «Máquina» cuando el ítem va montado en una unidad del parque motor.' },
      { field: 'almacenReferencia', label: 'Referencia del almacén / unidad', type: 'texto', desc: '(2) La unidad o almacén físico concreto. Si almacenTipo = Máquina, aquí va la referencia de la unidad.', example: 'B163-1' },
      { field: 'ubicacionInterna', label: 'Ubicación interna (gabinete)', type: 'texto', desc: '(3) Dónde está el ítem DENTRO de la máquina/ambulancia/rescate: el gabinete o compartimiento.', example: 'Cajón lateral izquierdo 2' },
      { field: 'compartmentId', label: 'Gabinete formal (opcional)', type: 'referencia', desc: 'Enlace a un compartimiento registrado en «Máquina y Gabinetes» (modelo con QR). Alternativo a ubicacionInterna.' },
    ],
  },
  {
    title: 'Asignación',
    fields: [
      { field: 'assignedCodigo', label: 'Código del asignado', type: 'texto', desc: 'Código del efectivo o recurso al que está asignado el ítem.' },
      { field: 'assignedProfileId', label: 'Efectivo asignado', type: 'referencia', desc: 'Perfil del efectivo que tiene el ítem a cargo (ej. EPP personal).' },
      { field: 'assignedHiredDriverId', label: 'Conductor contratado', type: 'número', desc: 'ID del conductor contratado asignado, si aplica.' },
    ],
  },
  {
    title: 'Cantidad y estado',
    fields: [
      { field: 'quantity', label: 'Cantidad', type: 'número', required: true, desc: 'Cantidad de unidades del ítem.', example: '4' },
      { field: 'unitMeasure', label: 'Unidad de medida', type: 'lista', enumKey: 'unitMeasure', desc: 'Unidad en que se cuenta el ítem.' },
      { field: 'condition', label: 'Condición', type: 'lista', required: true, enumKey: 'condition', desc: 'Estado operativo actual del ítem.' },
    ],
  },
  {
    title: 'Mantenimiento',
    fields: [
      { field: 'requiresMaintenance', label: '¿Requiere mantenimiento?', type: 'sí/no', desc: 'Marca si el ítem tiene mantenimiento programado.' },
      { field: 'lastMaintenanceDate', label: 'Último mantenimiento', type: 'fecha', desc: 'Fecha del último mantenimiento (AAAA-MM-DD).' },
      { field: 'nextMaintenanceDate', label: 'Próximo mantenimiento', type: 'fecha', desc: 'Fecha del próximo mantenimiento programado.' },
      { field: 'maintenanceIntervalMonths', label: 'Intervalo (meses)', type: 'número', desc: 'Cada cuántos meses se realiza el mantenimiento.' },
    ],
  },
  {
    title: 'Certificación y vida útil',
    fields: [
      { field: 'requiresCertification', label: '¿Requiere certificación?', type: 'sí/no', desc: 'Marca si el ítem debe certificarse periódicamente (ej. SCBA, cuerdas).' },
      { field: 'lastCertificationDate', label: 'Última certificación', type: 'fecha', desc: 'Fecha de la última certificación.' },
      { field: 'nextCertificationDate', label: 'Próxima certificación', type: 'fecha', desc: 'Fecha de la próxima certificación.' },
      { field: 'usefulLifeMonths', label: 'Vida útil (meses)', type: 'número', desc: 'Vida útil estimada del ítem en meses.' },
      { field: 'endOfLifeDate', label: 'Fin de vida útil', type: 'fecha', desc: 'Fecha en que el ítem llega al fin de su vida útil.' },
      { field: 'expirationDate', label: 'Fecha de vencimiento', type: 'fecha', desc: 'Vencimiento (para insumos/medicamentos).' },
    ],
  },
  {
    title: 'Compra y referencia',
    fields: [
      { field: 'lote', label: 'Lote', type: 'texto', desc: 'Número de lote (insumos/medicamentos).' },
      { field: 'purchaseDate', label: 'Fecha de compra', type: 'fecha', desc: 'Fecha de adquisición.' },
      { field: 'supplier', label: 'Proveedor', type: 'texto', desc: 'Proveedor o donante del ítem.' },
      { field: 'referenceValue', label: 'Valor referencial', type: 'decimal (texto)', desc: 'Valor referencial en soles, como texto para no perder precisión.' },
      { field: 'notes', label: 'Notas', type: 'texto', desc: 'Observaciones adicionales.' },
    ],
  },
  {
    title: 'Auditoría',
    fields: [
      { field: 'createdBy', label: 'Registrado por', type: 'referencia', desc: 'Perfil que creó el registro.' },
      { field: 'createdAt', label: 'Fecha de registro', type: 'fecha/hora (auto)', desc: 'Cuándo se creó el registro.' },
      { field: 'updatedAt', label: 'Última actualización', type: 'fecha/hora (auto)', desc: 'Última modificación del registro.' },
    ],
  },
]
