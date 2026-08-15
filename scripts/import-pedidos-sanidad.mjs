// scripts/import-pedidos-sanidad.mjs
//
// Importa el pedido anual 2026 de la Sección Sanidad (Prehospitalaria) como
// REQUERIMIENTOS en la tabla ubo163-dev-internal-requests (TABLE.internalRequests).
//
// Uso:
//   PowerShell: $env:AWS_PROFILE='manbuild'; node scripts/import-pedidos-sanidad.mjs
//   Bash:       AWS_PROFILE=manbuild node scripts/import-pedidos-sanidad.mjs
//
// Idempotente: usa PutCommand con requestId determinístico (req-sanidad-2026-NN),
// así que volver a correrlo sobreescribe los mismos 25 ítems sin duplicar.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

const REGION = 'us-east-1'
const TABLE_NAME = 'ubo163-dev-internal-requests'
const TO_SECTION_ID = 'sec-prehospitalaria'

const rawClient = new DynamoDBClient({ region: REGION })
const ddb = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false },
  unmarshallOptions: { wrapNumbers: false },
})

// Ítems del pedido "PEDIDOS DE SECCIÓN SANIDAD 2026".
// type: 'solicitud_compra' para insumos/equipos a comprar,
//       'reporte_averia' para el ítem 25 (arreglo/reparación de equipo).
const ITEMS = [
  'Tensiometro con estetoscopio',
  'Baja lenguas',
  'Tijeras de trauma',
  'Férulas inmovilizadoras de MS y MI',
  'Férulas cervical adulto y pediátrico',
  'Hules',
  'Esparadrapos',
  'Gasa para apositos',
  'Vendas diferentes tamaños',
  'Algodon',
  'Guantes tallas S, M y L',
  'Alcohol, Yodopovidona',
  'Cateter diferente medida',
  'Jeringas diferentes medidas',
  'Mascarillas para oxigenoterapia, simple con reservorio, cánula nasal',
  'Oximetro Adultos y Pediatrico',
  'Sueros fisiológicos',
  'Dextrosa',
  'Cloruro',
  'Linterna ocular',
  'Válvula de oxígeno tipo Yoke bajo flujo autorreguladora',
  'Vaso o botella humidificadora',
  'Spaider',
  'Casco y lentes de seguridad',
  'Arreglo de aspirador manual y eléctrico',
]

const REPAIR_INDEXES = new Set([25]) // 1-indexed: item 25 es reparación, no compra

async function main() {
  const ts = new Date().toISOString()
  let ok = 0

  for (let i = 0; i < ITEMS.length; i++) {
    const n = i + 1
    const nn = String(n).padStart(2, '0')
    const title = ITEMS[i]
    const type = REPAIR_INDEXES.has(n) ? 'reporte_averia' : 'solicitud_compra'

    const item = {
      requestId: `req-sanidad-2026-${nn}`,
      code: `REQ-SN-2026-${nn}`,
      type,
      title,
      description: 'Pedido anual de la Sección Sanidad 2026',
      priority: 'media',
      status: 'pendiente',
      toSectionId: TO_SECTION_ID,
      requestedBy: 'sistema',
      createdAt: ts,
      updatedAt: ts,
    }

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
    ok++
    console.log(`  ${nn}. ${title} [${type}] — OK`)
  }

  console.log(`\nImportados/actualizados ${ok}/${ITEMS.length} requerimientos en ${TABLE_NAME}.`)

  // Verificación: contar cuántos req-sanidad-2026-* existen ahora
  const scan = await ddb.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'begins_with(requestId, :p)',
    ExpressionAttributeValues: { ':p': 'req-sanidad-2026-' },
  }))
  console.log(`Verificación por Scan: ${scan.Items?.length ?? 0} ítems con prefijo req-sanidad-2026-*.`)
}

main().catch((err) => {
  console.error('Error importando pedidos de Sanidad:', err)
  process.exit(1)
})
