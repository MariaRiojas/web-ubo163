/**
 * Generación y parseo de archivos Excel para inventario.
 *
 * - generateTemplate(): crea un .xlsx con hojas:
 *     1. "Items"         — columnas + data validation (dropdowns)
 *     2. "Instrucciones" — qué significa cada columna y cuándo aplica
 *     3. "Referencia"    — listas válidas (categorías, máquinas, etc.)
 *     4. "Ejemplos"      — filas de muestra por tipo de ítem
 *
 * - parseImport(buffer): lee la hoja "Items" y devuelve las filas tal
 *   como están (sin validar). La validación la hace validateRow() en
 *   lib/inventory/validation.ts.
 */
import ExcelJS from 'exceljs'
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CONDITIONS,
  ALMACEN_TIPOS,
  INVENTORY_UNIT_MEASURES,
  EPP_SUBCATEGORIES,
  type AlmacenTipo,
} from '@/lib/db/schema/inventory'
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  ALMACEN_TIPO_LABELS,
  UNIT_MEASURE_LABELS,
  EPP_SUBCATEGORY_LABELS,
  EXCEL_COLUMNS,
} from './constants'
import { MACHINES } from '@/lib/cgbvp/machines'

// ─────────────────────────────────────────────────────────────────────
// Generar plantilla
// ─────────────────────────────────────────────────────────────────────

export interface GenerateTemplateOptions {
  /** Si se especifica, la hoja "Ejemplos" resalta filas relevantes a ese almacén. */
  contextAlmacenTipo?: AlmacenTipo
  /** Nombre de la compañía a incluir en el encabezado */
  companyName?: string
}

export async function generateTemplate(
  opts: GenerateTemplateOptions = {}
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CUARTEL-CRM'
  wb.created = new Date()
  wb.title = 'Plantilla de Inventario — UBO 163'

  // ─── Hoja 1: Items (donde el usuario llena) ────────────────────────
  buildItemsSheet(wb)

  // ─── Hoja 2: Instrucciones ─────────────────────────────────────────
  buildInstruccionesSheet(wb, opts.contextAlmacenTipo)

  // ─── Hoja 3: Referencia (listas válidas) ───────────────────────────
  buildReferenciaSheet(wb)

  // ─── Hoja 4: Ejemplos ──────────────────────────────────────────────
  buildEjemplosSheet(wb, opts.contextAlmacenTipo)

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

function buildItemsSheet(wb: ExcelJS.Workbook) {
  const sheet = wb.addWorksheet('Items', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }],
  })

  // Configurar columnas
  sheet.columns = EXCEL_COLUMNS.map((col) => ({
    key: col.key,
    header: col.header + (col.required ? ' *' : ''),
    width: Math.max(col.header.length + 4, 16),
  }))

  // Estilo del header
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  headerRow.height = 36
  headerRow.eachCell((cell, colNumber) => {
    const col = EXCEL_COLUMNS[colNumber - 1]
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colorForBlock(col.key) },
    }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
      bottom: { style: 'medium' },
    }
  })

  // Data validation por columna donde aplica
  const MAX_ROWS = 500 // Permitimos hasta 500 filas de import

  for (let colIdx = 0; colIdx < EXCEL_COLUMNS.length; colIdx++) {
    const col = EXCEL_COLUMNS[colIdx]
    const colLetter = sheet.getColumn(colIdx + 1).letter
    const rangeRef = `${colLetter}2:${colLetter}${MAX_ROWS + 1}`

    let validation: ExcelJS.DataValidation | null = null

    switch (col.key) {
      case 'categoria':
        validation = dropdownValidation([...INVENTORY_CATEGORIES])
        break
      case 'subcategoria':
        // Subcategorías son libres, pero si es EPP sugerimos las del enum.
        // ExcelJS no soporta dropdown condicional fácil, así que listamos
        // las de EPP como sugerencia pero no forzamos.
        validation = {
          type: 'list',
          allowBlank: true,
          showErrorMessage: false,
          formulae: [`"${[...EPP_SUBCATEGORIES].join(',')}"`],
          showInputMessage: true,
          promptTitle: 'Subcategoría',
          prompt:
            'Para EPP: capote/pantalon/casco/botas/guantes/capucha_nomex/scba/cinturon/radio/linterna/casillero/jaula/etc. Libre para otras categorías.',
        } as any
        break
      case 'almacen_tipo':
        validation = dropdownValidation([...ALMACEN_TIPOS])
        break
      case 'almacen_referencia':
        validation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${MACHINES.map((m) => m.label).join(',')}"`],
          showInputMessage: true,
          promptTitle: 'Máquina',
          prompt: 'Solo si el tipo de almacén es "maquina". Seleccioná la máquina de la lista.',
        } as any
        break
      case 'condicion':
        validation = dropdownValidation([...INVENTORY_CONDITIONS])
        break
      case 'unidad_medida':
        validation = dropdownValidation([...INVENTORY_UNIT_MEASURES])
        break
      case 'requiere_mantenimiento':
      case 'requiere_certificacion':
        validation = dropdownValidation(['Sí', 'No'])
        break
      case 'año_fabricacion':
        validation = {
          type: 'whole',
          operator: 'between',
          formulae: [1950, new Date().getFullYear()],
          allowBlank: true,
          showErrorMessage: true,
          errorTitle: 'Año inválido',
          error: 'Debe ser un año entre 1950 y el actual',
        } as any
        break
      case 'cantidad':
      case 'intervalo_mantenimiento_meses':
      case 'vida_util_meses':
        validation = {
          type: 'whole',
          operator: 'greaterThanOrEqual',
          formulae: [0],
          allowBlank: col.key !== 'cantidad',
          showErrorMessage: true,
          errorTitle: 'Valor inválido',
          error: 'Debe ser un número entero ≥ 0',
        } as any
        break
      case 'valor_referencial':
        validation = {
          type: 'decimal',
          operator: 'greaterThanOrEqual',
          formulae: [0],
          allowBlank: true,
          showErrorMessage: true,
          errorTitle: 'Valor inválido',
          error: 'Debe ser un número decimal ≥ 0',
        } as any
        break
      case 'ultima_mantencion':
      case 'proxima_mantencion':
      case 'fecha_vencimiento':
      case 'fecha_ultima_certificacion':
      case 'fecha_proxima_certificacion':
      case 'fecha_fin_vida_util':
      case 'fecha_adquisicion':
        // ExcelJS no tiene validación nativa de fecha fácil; dejamos como texto
        // y el parser acepta ISO o DD/MM/AAAA.
        break
    }

    if (validation) {
      // Aplicar validación a cada celda del rango (ExcelJS requiere loop)
      for (let r = 2; r <= MAX_ROWS + 1; r++) {
        const cell = sheet.getCell(`${colLetter}${r}`)
        cell.dataValidation = validation
      }
    }

    // Formato específico por columna
    if (col.key.includes('fecha') || col.key.includes('mantencion') || col.key.includes('certificacion') || col.key === 'fecha_fin_vida_util') {
      sheet.getColumn(colIdx + 1).numFmt = 'yyyy-mm-dd'
    }
    if (col.key === 'valor_referencial') {
      sheet.getColumn(colIdx + 1).numFmt = '#,##0.00'
    }
  }

  // Auto-ajustar anchos mínimos
  sheet.columns.forEach((col) => {
    if (col.width && col.width < 12) col.width = 12
  })
}

function buildInstruccionesSheet(
  wb: ExcelJS.Workbook,
  contextAlmacenTipo?: AlmacenTipo
) {
  const sheet = wb.addWorksheet('Instrucciones', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = [
    { key: 'col', header: 'Columna', width: 32 },
    { key: 'req', header: 'Obligatoria', width: 12 },
    { key: 'desc', header: 'Descripción / Cuándo llenar', width: 80 },
  ]
  styleHeader(sheet.getRow(1), 'FF0F172A')

  for (const col of EXCEL_COLUMNS) {
    const row = sheet.addRow({
      col: col.header,
      req: col.required ? 'Sí' : 'No',
      desc: (col.notes ?? '') + (col.example ? `\nEjemplo: ${col.example}` : ''),
    })
    row.alignment = { vertical: 'top', wrapText: true }
    row.height = 36
    if (col.required) {
      row.getCell(2).font = { bold: true, color: { argb: 'FFDC2626' } }
    }
  }

  // Bloque de guía por tipo de ítem
  sheet.addRow({})
  const guideHeader = sheet.addRow({
    col: 'GUÍA POR TIPO DE ÍTEM',
    req: '',
    desc: 'Qué columnas son más importantes según el tipo de objeto',
  })
  guideHeader.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
  guideHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  }

  const guides = [
    {
      tipo: 'Medicamento',
      aplica: 'Lote, fecha de vencimiento, cantidad, unidad (tableta/ampolla/frasco), almacén',
    },
    {
      tipo: 'Insumo médico',
      aplica: 'Lote, fecha de vencimiento, cantidad, unidad (caja/unidad)',
    },
    {
      tipo: 'EPP estructural',
      aplica: 'Subcategoría (capote/casco/etc.), marca, modelo, año de fabricación, vida útil, asignado a código',
    },
    {
      tipo: 'EPP técnico (radio, linterna)',
      aplica: 'Subcategoría, marca, modelo, número de serie, asignado a código',
    },
    {
      tipo: 'Extintor',
      aplica: 'Requiere certificación = Sí, próxima certificación, ubicación interna, almacén',
    },
    {
      tipo: 'SCBA (equipo respiración)',
      aplica: 'Número de serie, certificación hidrostática (próxima certificación), año',
    },
    {
      tipo: 'Herramienta hidráulica',
      aplica: 'Marca, modelo, número de serie, mantenimiento periódico, almacén máquina',
    },
    {
      tipo: 'Equipo médico (desfibrilador)',
      aplica: 'Marca, modelo, número de serie, mantenimiento, ubicación',
    },
  ]

  for (const g of guides) {
    const row = sheet.addRow({ col: g.tipo, req: '', desc: g.aplica })
    row.alignment = { vertical: 'top', wrapText: true }
    row.getCell(1).font = { bold: true }
  }

  if (contextAlmacenTipo) {
    sheet.addRow({})
    const contextRow = sheet.addRow({
      col: `📋 CONTEXTO: ${ALMACEN_TIPO_LABELS[contextAlmacenTipo]}`,
      req: '',
      desc: contextHint(contextAlmacenTipo),
    })
    contextRow.font = { bold: true, color: { argb: 'FF0369A1' } }
    contextRow.alignment = { wrapText: true, vertical: 'top' }
    contextRow.height = 48
  }
}

function contextHint(tipo: AlmacenTipo): string {
  switch (tipo) {
    case 'sanidad':
      return 'Para Sanidad: priorizá lote, fecha_vencimiento, cantidad y unidad. almacen_tipo=sanidad; dejá almacen_referencia vacío.'
    case 'servicios':
      return 'Para Servicios Generales: ubicacion_interna (rack, estante), cantidad y condición. almacen_tipo=servicios.'
    case 'maquina':
      return 'Para máquinas: almacen_tipo=maquina, almacen_referencia=MAQUINA 163-1/AMBULANCIA 163/RESCATE 163/AUXILIAR 163. Usá ubicacion_interna para compartimientos.'
    case 'instruccion':
      return 'Para Instrucción: materiales de ESBAS, simulación, prácticas. almacen_tipo=instruccion.'
    case 'imagen':
      return 'Para Imagen: banderas, insignias, material de ceremonias. almacen_tipo=imagen.'
    case 'administracion':
      return 'Para Administración: papelería, equipos de oficina. almacen_tipo=administracion.'
  }
}

function buildReferenciaSheet(wb: ExcelJS.Workbook) {
  const sheet = wb.addWorksheet('Referencia')
  sheet.columns = [
    { key: 'valor', header: 'Valor (usar en Excel)', width: 30 },
    { key: 'label', header: 'Significado', width: 60 },
  ]
  styleHeader(sheet.getRow(1), 'FF0F172A')

  // Categorías
  sheet.addRow({ valor: '── CATEGORÍAS ──', label: '' }).font = { bold: true }
  for (const c of INVENTORY_CATEGORIES) {
    sheet.addRow({ valor: c, label: CATEGORY_LABELS[c] })
  }
  sheet.addRow({})

  // Subcategorías EPP
  sheet.addRow({ valor: '── SUBCATEGORÍAS EPP ──', label: 'Usar solo si categoría=epp' }).font = { bold: true }
  for (const s of EPP_SUBCATEGORIES) {
    sheet.addRow({ valor: s, label: EPP_SUBCATEGORY_LABELS[s] })
  }
  sheet.addRow({})

  // Condiciones
  sheet.addRow({ valor: '── CONDICIONES ──', label: '' }).font = { bold: true }
  for (const c of INVENTORY_CONDITIONS) {
    sheet.addRow({ valor: c, label: CONDITION_LABELS[c] })
  }
  sheet.addRow({})

  // Tipos de almacén
  sheet.addRow({ valor: '── TIPOS DE ALMACÉN ──', label: '' }).font = { bold: true }
  for (const t of ALMACEN_TIPOS) {
    sheet.addRow({ valor: t, label: ALMACEN_TIPO_LABELS[t] })
  }
  sheet.addRow({})

  // Máquinas
  sheet.addRow({ valor: '── MÁQUINAS (si tipo=maquina) ──', label: '' }).font = { bold: true }
  for (const m of MACHINES) {
    sheet.addRow({ valor: m.label, label: m.description })
  }
  sheet.addRow({})

  // Unidades
  sheet.addRow({ valor: '── UNIDADES DE MEDIDA ──', label: '' }).font = { bold: true }
  for (const u of INVENTORY_UNIT_MEASURES) {
    sheet.addRow({ valor: u, label: UNIT_MEASURE_LABELS[u] })
  }
  sheet.addRow({})

  // Códigos de asignación
  sheet.addRow({ valor: '── FORMATO CÓDIGO ASIGNADO ──', label: '' }).font = { bold: true }
  sheet.addRow({ valor: 'A#####', label: 'Bombero activo (ej: A23118)' })
  sheet.addRow({ valor: 'R#####', label: 'Piloto rentado (ej: R09570)' })
  sheet.addRow({ valor: '########', label: 'DNI de 8 dígitos (fallback para recién graduados)' })
}

function buildEjemplosSheet(
  wb: ExcelJS.Workbook,
  contextAlmacenTipo?: AlmacenTipo
) {
  const sheet = wb.addWorksheet('Ejemplos')
  sheet.columns = EXCEL_COLUMNS.map((col) => ({
    key: col.key,
    header: col.header,
    width: 20,
  }))
  styleHeader(sheet.getRow(1), 'FF0F172A')

  // Set completo de ejemplos representativos
  const allExamples: Array<Partial<Record<string, unknown>>> = [
    // Sanidad - medicamento
    {
      nombre_objeto: 'Ampolla Adrenalina 1mg',
      categoria: 'medicamento',
      marca: 'Genfar',
      modelo: '1mg/1ml',
      almacen_tipo: 'maquina',
      almacen_referencia: 'AMBULANCIA 163',
      ubicacion_interna: 'Gaveta médica 2',
      cantidad: 20,
      unidad_medida: 'ampolla',
      condicion: 'operativo',
      fecha_vencimiento: '2027-03-15',
      lote: 'L-ADR-2406-08',
      notas: 'Almacenar 15-25°C',
    },
    // Sanidad - insumo médico
    {
      nombre_objeto: 'Gasa estéril 10x10cm',
      categoria: 'insumo_medico',
      marca: 'Protens',
      almacen_tipo: 'sanidad',
      ubicacion_interna: 'Estante A-1',
      cantidad: 50,
      unidad_medida: 'caja',
      condicion: 'operativo',
      fecha_vencimiento: '2029-02-10',
      lote: 'L-GZ-2024-055',
    },
    // Máquinas - equipo médico
    {
      nombre_objeto: 'Desfibrilador DEA',
      categoria: 'medico',
      marca: 'Zoll',
      modelo: 'AED Plus',
      codigo_cbp: 'CBP-163-DEA-01',
      almacen_tipo: 'maquina',
      almacen_referencia: 'AMBULANCIA 163',
      ubicacion_interna: 'Cabina trasera - mueble A',
      cantidad: 1,
      unidad_medida: 'unidad',
      condicion: 'operativo',
      requiere_mantenimiento: 'Sí',
      proxima_mantencion: '2026-09-01',
      notas: 'Electrodos vencen ago-2026',
    },
    // Máquinas - herramienta hidráulica
    {
      nombre_objeto: 'Cizalla Hidráulica',
      categoria: 'herramienta',
      marca: 'Holmatro',
      modelo: 'CU5050',
      año_fabricacion: 2019,
      codigo_cbp: 'CBP-163-HID-01',
      numero_serie: 'HLM-CU-12456',
      almacen_tipo: 'maquina',
      almacen_referencia: 'MAQUINA 163-1',
      ubicacion_interna: 'Compartimiento lateral 2',
      cantidad: 1,
      condicion: 'operativo',
      requiere_certificacion: 'Sí',
      fecha_proxima_certificacion: '2026-10-15',
      notas: 'Certificación hidráulica anual',
    },
    // Máquinas - SCBA
    {
      nombre_objeto: 'SCBA Botella 4500psi',
      categoria: 'epp',
      subcategoria: 'scba',
      marca: 'Scott',
      modelo: 'AirPak X3',
      año_fabricacion: 2021,
      codigo_cbp: 'CBP-163-SCBA-04',
      almacen_tipo: 'maquina',
      almacen_referencia: 'MAQUINA 163-1',
      ubicacion_interna: 'Cabina interior',
      cantidad: 4,
      condicion: 'operativo',
      requiere_certificacion: 'Sí',
      fecha_proxima_certificacion: '2026-11-20',
      notas: 'Prueba hidrostática vence nov-2026',
    },
    // Servicios - espuma
    {
      nombre_objeto: 'Espuma AFFF 6%',
      categoria: 'insumo',
      marca: 'Solberg',
      almacen_tipo: 'servicios',
      ubicacion_interna: 'Rack industrial',
      cantidad: 20,
      unidad_medida: 'balon',
      condicion: 'operativo',
      fecha_vencimiento: '2028-12-01',
      notas: 'Stock mínimo 10 balones',
    },
    // Servicios - extintor
    {
      nombre_objeto: 'Extintor PQS 6kg',
      categoria: 'equipo',
      subcategoria: 'extintor',
      marca: 'Kidde',
      almacen_tipo: 'servicios',
      ubicacion_interna: 'Pasillo principal',
      cantidad: 4,
      condicion: 'operativo',
      requiere_certificacion: 'Sí',
      fecha_proxima_certificacion: '2027-05-01',
      notas: 'Prueba hidrostática cada 5 años',
    },
    // EPP asignado - capote
    {
      nombre_objeto: 'Capote estructural',
      categoria: 'epp',
      subcategoria: 'capote',
      marca: 'Globe',
      modelo: 'G-XTREME',
      año_fabricacion: 2024,
      codigo_cbp: 'CBP-163-CAP-018',
      almacen_tipo: 'servicios',
      asignado_codigo: 'A23118',
      cantidad: 1,
      condicion: 'operativo',
      vida_util_meses: 120,
      fecha_fin_vida_util: '2034-06-15',
    },
    // EPP asignado - radio (equipo técnico individual)
    {
      nombre_objeto: 'Radio portátil',
      categoria: 'epp',
      subcategoria: 'radio',
      marca: 'Motorola',
      modelo: 'APX900',
      numero_serie: 'MT-AP-445612',
      almacen_tipo: 'servicios',
      asignado_codigo: 'R09570',
      cantidad: 1,
      condicion: 'operativo',
      notas: 'Asignación temporal durante turno',
    },
    // Casillero asignado
    {
      nombre_objeto: 'Casillero N° 14',
      categoria: 'epp',
      subcategoria: 'casillero',
      almacen_tipo: 'servicios',
      ubicacion_interna: 'Vestidor zona B',
      asignado_codigo: 'A23118',
      cantidad: 1,
      condicion: 'operativo',
    },
  ]

  // Si hay contexto, filtramos ejemplos relevantes al inicio
  let examples = allExamples
  if (contextAlmacenTipo) {
    const relevant = allExamples.filter((e) => e.almacen_tipo === contextAlmacenTipo)
    const others = allExamples.filter((e) => e.almacen_tipo !== contextAlmacenTipo)
    examples = [...relevant, ...others]
  }

  for (const ex of examples) {
    const row = sheet.addRow(ex as any)
    row.alignment = { vertical: 'top', wrapText: true }
    // Resaltar contexto
    if (contextAlmacenTipo && ex.almacen_tipo === contextAlmacenTipo) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCFCE7' },
      }
    }
  }

  // Formato de fechas
  const dateColKeys = [
    'ultima_mantencion', 'proxima_mantencion', 'fecha_vencimiento',
    'fecha_ultima_certificacion', 'fecha_proxima_certificacion',
    'fecha_fin_vida_util', 'fecha_adquisicion',
  ]
  for (const key of dateColKeys) {
    const col = sheet.getColumn(key)
    if (col) col.numFmt = 'yyyy-mm-dd'
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers de estilo
// ─────────────────────────────────────────────────────────────────────

function dropdownValidation(values: string[]): ExcelJS.DataValidation {
  return {
    type: 'list',
    allowBlank: true,
    showErrorMessage: true,
    errorTitle: 'Valor no permitido',
    error: `Debe ser uno de: ${values.join(', ')}`,
    formulae: [`"${values.join(',')}"`],
  } as any
}

function styleHeader(row: ExcelJS.Row, bgColorArgb: string) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.alignment = { vertical: 'middle', horizontal: 'center' }
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: bgColorArgb },
  }
  row.height = 24
}

/**
 * Color de fondo del header por bloque visual.
 * Identificación / Trazabilidad / Ubicación / Estado / Vencimiento / Administrativo
 */
function colorForBlock(key: string): string {
  const IDENT = ['nombre_objeto', 'categoria', 'subcategoria', 'marca', 'modelo', 'año_fabricacion']
  const TRAZA = ['codigo_cbp', 'numero_serie', 'numero_secuencia', 'codigo_barras_qr']
  const UBIC = ['almacen_tipo', 'almacen_referencia', 'ubicacion_interna', 'asignado_codigo', 'cantidad', 'unidad_medida']
  const ESTADO = ['condicion', 'requiere_mantenimiento', 'ultima_mantencion', 'proxima_mantencion', 'intervalo_mantenimiento_meses']
  const VIDA = ['fecha_vencimiento', 'requiere_certificacion', 'fecha_ultima_certificacion', 'fecha_proxima_certificacion', 'vida_util_meses', 'fecha_fin_vida_util', 'lote']
  // const ADMIN = ['fecha_adquisicion', 'proveedor', 'valor_referencial', 'notas']

  if (IDENT.includes(key)) return 'FF1E40AF' // azul
  if (TRAZA.includes(key)) return 'FF7E22CE' // violeta
  if (UBIC.includes(key)) return 'FF15803D' // verde
  if (ESTADO.includes(key)) return 'FFB45309' // ámbar
  if (VIDA.includes(key)) return 'FFBE123C' // rojo
  return 'FF475569' // gris (administrativo / default)
}

// ─────────────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────────────

/**
 * Lee un archivo xlsx y devuelve las filas de la hoja "Items" como
 * objetos con las keys según EXCEL_COLUMNS. No valida — solo parsea.
 *
 * Filas completamente vacías se descartan.
 */
export async function parseImport(buffer: Buffer | ArrayBuffer | Uint8Array): Promise<
  Array<{ rowIndex: number; data: Record<string, unknown> }>
> {
  const wb = new ExcelJS.Workbook()
  // exceljs acepta Buffer o ArrayBuffer
  await wb.xlsx.load(buffer as any)

  const sheet = wb.getWorksheet('Items') ?? wb.worksheets[0]
  if (!sheet) throw new Error('El archivo no contiene hojas')

  // Mapear header → key. Los usuarios podrían editar el header, así que
  // buscamos por coincidencia insensible a mayúsculas y al asterisco de
  // "Obligatoria *".
  const headerRow = sheet.getRow(1)
  const headerToKey = new Map<number, string>()

  headerRow.eachCell((cell, colNumber) => {
    const text = String(cell.value ?? '').replace(/\s*\*\s*$/, '').trim().toLowerCase()
    const col = EXCEL_COLUMNS.find(
      (c) => c.header.toLowerCase() === text || c.key.toLowerCase() === text
    )
    if (col) {
      headerToKey.set(colNumber, col.key)
    }
  })

  const rows: Array<{ rowIndex: number; data: Record<string, unknown> }> = []

  sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
    if (rowIndex === 1) return // skip header
    const data: Record<string, unknown> = {}
    let hasAny = false

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = headerToKey.get(colNumber)
      if (!key) return
      const val = cellValue(cell)
      if (val !== null && val !== '') {
        data[key] = val
        hasAny = true
      }
    })

    if (hasAny) {
      rows.push({ rowIndex, data })
    }
  })

  return rows
}

function cellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value
  if (v === null || v === undefined) return null

  // Rich text (formatted)
  if (typeof v === 'object' && v !== null && 'richText' in v) {
    const rt = (v as { richText: Array<{ text: string }> }).richText
    return rt.map((r) => r.text).join('').trim()
  }

  // Date
  if (v instanceof Date) return v

  // Formula result
  if (typeof v === 'object' && v !== null && 'result' in v) {
    return (v as { result: unknown }).result ?? null
  }

  // Hyperlink
  if (typeof v === 'object' && v !== null && 'text' in v) {
    return (v as { text: string }).text
  }

  return v
}
