import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import ExcelJS from 'exceljs'
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CONDITIONS,
  ALMACEN_TIPOS,
  INVENTORY_UNIT_MEASURES,
  EPP_SUBCATEGORIES,
} from '@/lib/db/schema/inventory'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const area = searchParams.get('area')

  // Mapeo de area a almacen_tipo por defecto
  const areaToAlmacen: Record<string, string> = {
    'maquinas': 'maquina',
    'servicios-generales': 'servicios',
    'sanidad': 'sanidad',
    'instruccion': 'instruccion',
    'imagen': 'imagen',
    'administracion': 'administracion',
  }
  const defaultAlmacen = area ? areaToAlmacen[area] || '' : ''

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'CUARTEL-ERP'
  workbook.lastModifiedBy = 'CUARTEL-ERP'
  workbook.created = new Date()
  workbook.modified = new Date()

  // ── HOJA 1: Items ──────────────────────────────────────────
  const itemsSheet = workbook.addWorksheet('Items')

  const headers = [
    { header: 'Nombre del objeto*', key: 'name', width: 30 },
    { header: 'Categoría*', key: 'category', width: 15 },
    { header: 'Subcategoría', key: 'subcategory', width: 15 },
    { header: 'Tipo de almacén*', key: 'almacenTipo', width: 15 },
    { header: 'Máquina (si aplica)', key: 'almacenReferencia', width: 20 },
    { header: 'Marca', key: 'brand', width: 15 },
    { header: 'Modelo', key: 'model', width: 15 },
    { header: 'N° serie', key: 'numeroSerie', width: 15 },
    { header: 'Código CBP', key: 'codigoCbp', width: 15 },
    { header: 'Cantidad*', key: 'quantity', width: 10 },
    { header: 'Unidad', key: 'unitMeasure', width: 10 },
    { header: 'Condición*', key: 'condition', width: 15 },
    { header: 'Ubicación', key: 'ubicacionInterna', width: 20 },
    { header: 'Asignado a (código)', key: 'assignedCodigo', width: 20 },
    { header: 'Lote', key: 'lote', width: 15 },
    { header: 'Fecha vencimiento', key: 'expirationDate', width: 15 },
    { header: 'Requiere cert.', key: 'requiresCertification', width: 15 },
    { header: 'Última cert.', key: 'lastCertificationDate', width: 15 },
    { header: 'Próxima cert.', key: 'nextCertificationDate', width: 15 },
    { header: 'Vida útil (meses)', key: 'usefulLifeMonths', width: 15 },
    { header: 'Valor ref.', key: 'referenceValue', width: 15 },
    { header: 'Notas', key: 'notes', width: 40 },
  ]

  itemsSheet.columns = headers

  // Estilo para el header
  itemsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  itemsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC00000' }, // Rojo Bomberos
  }
  itemsSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

  // Validaciones de datos (Dropdowns) para las primeras 500 filas
  for (let i = 2; i <= 501; i++) {
    const row = itemsSheet.getRow(i)
    
    // Categoría
    row.getCell('category').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${INVENTORY_CATEGORIES.join(',')}"`],
    }

    // Tipo de Almacén
    row.getCell('almacenTipo').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${ALMACEN_TIPOS.join(',')}"`],
    }
    if (defaultAlmacen) {
      row.getCell('almacenTipo').value = defaultAlmacen
    }

    // Condición
    row.getCell('condition').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${INVENTORY_CONDITIONS.join(',')}"`],
    }
    row.getCell('condition').value = 'operativo'

    // Unidad de medida
    row.getCell('unitMeasure').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${INVENTORY_UNIT_MEASURES.join(',')}"`],
    }
    row.getCell('unitMeasure').value = 'unidad'

    // Máquina
    row.getCell('almacenReferencia').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"maquina_163_1,ambulancia_163,rescate_163,auxiliar_163"'],
    }

    // Requiere cert
    row.getCell('requiresCertification').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Sí,No"'],
    }
    row.getCell('requiresCertification').value = 'No'

    // Cantidad por defecto
    row.getCell('quantity').value = 1
  }

  // ── HOJA 2: Instrucciones ──────────────────────────────────
  const infoSheet = workbook.addWorksheet('Instrucciones')
  infoSheet.columns = [
    { header: 'Campo', key: 'field', width: 25 },
    { header: 'Instrucción', key: 'instruction', width: 80 },
  ]
  infoSheet.getRow(1).font = { bold: true }
  infoSheet.addRows([
    { field: 'Nombre del objeto*', instruction: 'Nombre descriptivo del ítem. Obligatorio.' },
    { field: 'Categoría*', instruction: 'Seleccionar de la lista. Ayuda a clasificar el inventario.' },
    { field: 'Tipo de almacén*', instruction: 'Donde vive el ítem físicamente.' },
    { field: 'Máquina', instruction: 'Solo si el almacén es "maquina". Indica en qué unidad está.' },
    { field: 'Código CBP', instruction: 'Código patrimonial del CGBVP (si lo tiene).' },
    { field: 'Asignado a (código)', instruction: 'Código de bombero (A#####) o DNI (########) para equipos personales.' },
    { field: 'Fecha vencimiento', instruction: 'Formato AAAA-MM-DD. Crítico para medicamentos e insumos.' },
    { field: 'Cantidades*', instruction: 'Número entero mayor a 0.' },
  ])

  // ── HOJA 3: Referencia ─────────────────────────────────────
  const refSheet = workbook.addWorksheet('Referencia')
  refSheet.columns = [
    { header: 'Categorías', key: 'cats', width: 20 },
    { header: 'Condiciones', key: 'conds', width: 20 },
    { header: 'Almacenes', key: 'alms', width: 20 },
    { header: 'Unidades', key: 'units', width: 20 },
    { header: 'EPP Subcategorías', key: 'epp', width: 20 },
  ]
  refSheet.getRow(1).font = { bold: true }

  const maxRefRows = Math.max(
    INVENTORY_CATEGORIES.length,
    INVENTORY_CONDITIONS.length,
    ALMACEN_TIPOS.length,
    INVENTORY_UNIT_MEASURES.length,
    EPP_SUBCATEGORIES.length
  )

  for (let i = 0; i < maxRefRows; i++) {
    refSheet.addRow({
      cats: INVENTORY_CATEGORIES[i] || '',
      conds: INVENTORY_CONDITIONS[i] || '',
      alms: ALMACEN_TIPOS[i] || '',
      units: INVENTORY_UNIT_MEASURES[i] || '',
      epp: EPP_SUBCATEGORIES[i] || '',
    })
  }

  // ── HOJA 4: Ejemplos ───────────────────────────────────────
  const exampleSheet = workbook.addWorksheet('Ejemplos')
  exampleSheet.columns = headers
  exampleSheet.getRow(1).font = { bold: true }
  exampleSheet.addRows([
    {
      name: 'Extintor PQS 6kg',
      category: 'equipo',
      almacenTipo: 'servicios',
      quantity: 5,
      unitMeasure: 'unidad',
      condition: 'operativo',
      requiresCertification: 'Sí',
      nextCertificationDate: '2027-01-01',
    },
    {
      name: 'Capote estructural',
      category: 'epp',
      subcategory: 'capote',
      almacenTipo: 'servicios',
      brand: 'Globe',
      quantity: 1,
      assignedCodigo: 'A23118',
      condition: 'operativo',
    },
    {
      name: 'Adrenalina 1mg',
      category: 'medicamento',
      almacenTipo: 'sanidad',
      quantity: 10,
      unitMeasure: 'ampolla',
      lote: 'L-2024-X',
      expirationDate: '2026-12-31',
      condition: 'operativo',
    },
    {
      name: 'Linterna de casco',
      category: 'epp',
      subcategory: 'linterna',
      almacenTipo: 'maquina',
      almacenReferencia: 'maquina_163_1',
      quantity: 1,
      condition: 'operativo',
    },
  ])

  const buffer = await workbook.xlsx.writeBuffer()

  const filename = `plantilla-inventario-${area || 'general'}-${new Date().toISOString().split('T')[0]}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
