import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CONDITIONS,
  ALMACEN_TIPOS,
  INVENTORY_UNIT_MEASURES,
  InventoryCategory,
  InventoryCondition,
  AlmacenTipo,
  InventoryUnitMeasure,
} from '@/lib/db/schema/inventory'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    const worksheet = workbook.getWorksheet('Items') || workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json({ error: 'No se encontró la hoja "Items" o alguna hoja válida' }, { status: 400 })
    }

    const validatedRows: any[] = []

    // Empezamos desde la fila 2 (la 1 son headers)
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return

      const issues: { field: string; message: string; severity: 'warning' | 'error' }[] = []
      
      const rawData: any = {
        name: row.getCell(1).value?.toString()?.trim(),
        category: row.getCell(2).value?.toString()?.trim(),
        subcategory: row.getCell(3).value?.toString()?.trim(),
        almacenTipo: row.getCell(4).value?.toString()?.trim(),
        almacenReferencia: row.getCell(5).value?.toString()?.trim(),
        brand: row.getCell(6).value?.toString()?.trim(),
        model: row.getCell(7).value?.toString()?.trim(),
        numeroSerie: row.getCell(8).value?.toString()?.trim(),
        codigoCbp: row.getCell(9).value?.toString()?.trim(),
        quantity: parseInt(row.getCell(10).value?.toString() || '0'),
        unitMeasure: row.getCell(11).value?.toString()?.trim() || 'unidad',
        condition: row.getCell(12).value?.toString()?.trim(),
        ubicacionInterna: row.getCell(13).value?.toString()?.trim(),
        assignedCodigo: row.getCell(14).value?.toString()?.trim(),
        lote: row.getCell(15).value?.toString()?.trim(),
        expirationDate: row.getCell(16).value,
        requiresCertification: row.getCell(17).value?.toString()?.trim() === 'Sí',
        lastCertificationDate: row.getCell(18).value,
        nextCertificationDate: row.getCell(19).value,
        usefulLifeMonths: parseInt(row.getCell(20).value?.toString() || '0'),
        referenceValue: row.getCell(21).value?.toString()?.trim(),
        notes: row.getCell(22).value?.toString()?.trim(),
      }

      // ── VALIDACIONES ────────────────────────────────────────

      // Nombre
      if (!rawData.name) {
        issues.push({ field: 'name', message: 'El nombre es obligatorio', severity: 'error' })
      }

      // Categoría
      if (!rawData.category) {
        issues.push({ field: 'category', message: 'La categoría es obligatoria', severity: 'error' })
      } else if (!INVENTORY_CATEGORIES.includes(rawData.category as InventoryCategory)) {
        issues.push({ field: 'category', message: `Categoría inválida: ${rawData.category}`, severity: 'error' })
      }

      // Tipo Almacén
      if (!rawData.almacenTipo) {
        issues.push({ field: 'almacenTipo', message: 'El tipo de almacén es obligatorio', severity: 'error' })
      } else if (!ALMACEN_TIPOS.includes(rawData.almacenTipo as AlmacenTipo)) {
        issues.push({ field: 'almacenTipo', message: `Tipo de almacén inválido: ${rawData.almacenTipo}`, severity: 'error' })
      }

      // Máquina
      if (rawData.almacenTipo === 'maquina' && !rawData.almacenReferencia) {
        issues.push({ field: 'almacenReferencia', message: 'Debe especificar la máquina', severity: 'error' })
      }

      // Cantidad
      if (isNaN(rawData.quantity) || rawData.quantity <= 0) {
        issues.push({ field: 'quantity', message: 'La cantidad debe ser un número mayor a 0', severity: 'error' })
      }

      // Condición
      if (!rawData.condition) {
        issues.push({ field: 'condition', message: 'La condición es obligatoria', severity: 'error' })
      } else if (!INVENTORY_CONDITIONS.includes(rawData.condition as InventoryCondition)) {
        issues.push({ field: 'condition', message: `Condición inválida: ${rawData.condition}`, severity: 'error' })
      }

      // Unidad
      if (rawData.unitMeasure && !INVENTORY_UNIT_MEASURES.includes(rawData.unitMeasure as InventoryUnitMeasure)) {
        issues.push({ field: 'unitMeasure', message: `Unidad inválida: ${rawData.unitMeasure}`, severity: 'warning' })
      }

      // Fechas (ExcelJS suele devolver objetos Date si el formato es correcto)
      const dateFields = ['expirationDate', 'lastCertificationDate', 'nextCertificationDate']
      for (const field of dateFields) {
        if (rawData[field] && !(rawData[field] instanceof Date)) {
          // Intentar parsear si es string
          const d = new Date(rawData[field])
          if (isNaN(d.getTime())) {
            issues.push({ field, message: 'Formato de fecha inválido. Use AAAA-MM-DD', severity: 'error' })
          } else {
            rawData[field] = d.toISOString().split('T')[0]
          }
        } else if (rawData[field] instanceof Date) {
          rawData[field] = rawData[field].toISOString().split('T')[0]
        }
      }

      // Warnings preventivos
      if (rawData.category === 'medicamento' && !rawData.lote) {
        issues.push({ field: 'lote', message: 'Se recomienda incluir el lote para medicamentos', severity: 'warning' })
      }
      if (rawData.category === 'medicamento' && !rawData.expirationDate) {
        issues.push({ field: 'expirationDate', message: 'Se recomienda incluir fecha de vencimiento', severity: 'warning' })
      }

      const hasError = issues.some(i => i.severity === 'error')
      const hasWarning = issues.some(i => i.severity === 'warning')

      validatedRows.push({
        rowNumber,
        status: hasError ? 'error' : (hasWarning ? 'warning' : 'valid'),
        data: rawData,
        issues
      })
    })

    return NextResponse.json({ rows: validatedRows })
  } catch (error: any) {
    console.error('Error validando excel:', error)
    return NextResponse.json({ error: 'Error procesando el archivo: ' + error.message }, { status: 500 })
  }
}
