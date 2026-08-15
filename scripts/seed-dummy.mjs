// scripts/seed-dummy.mjs
//
// Data DUMMY para validar dos features mientras se carga la información real:
//   A) Inventario de máquinas (parque motor) → alimenta el checklist /parque-motor
//   B) Una cuenta de ASPIRANTE de prueba → para ver el formulario /asistencia-instruccion
//
// Uso (PowerShell): $env:AWS_PROFILE='manbuild'; node scripts/seed-dummy.mjs
// Idempotente: usa IDs determinísticos, se puede volver a correr sin duplicar.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import bcrypt from 'bcryptjs'

const REGION = 'us-east-1'
const P = 'ubo163-dev'
const T = {
  inventory: `${P}-inventory`,
  users: `${P}-users`,
  profiles: `${P}-profiles`,
}
const now = () => new Date().toISOString()
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false },
  unmarshallOptions: { wrapNumbers: false },
})

// ─────────────────────────────────────────────────────────────────────────
// A) Inventario de máquinas → checklist del parque motor
//    almacenTipo='maquina', almacenReferencia = la unidad, ubicacionInterna = el gabinete
// ─────────────────────────────────────────────────────────────────────────
// Nombres INSTITUCIONALES estrictos de las unidades de la 163.
const MAQUINAS = [
  {
    ref: 'MAQUINA 163 - 1', // Autobomba
    gabinetes: {
      'Cajón lateral 1 (Izq.)': [
        ['Llave de hidrante', 'herramienta'],
        ['Llave Storz 2½"', 'herramienta'],
        ['Pitón regulable 1½"', 'equipo'],
        ['Manguera 1½" x 15m', 'equipo'],
      ],
      'Cajón lateral 2 (Izq.)': [
        ['Hacha pico', 'herramienta'],
        ['Herramienta Halligan', 'herramienta'],
        ['Barreta', 'herramienta'],
        ['Cizalla', 'herramienta'],
      ],
      'Cabina': [
        ['Extintor PQS 6 kg', 'herramienta'],
        ['Radio portátil', 'comunicacion'],
        ['Linterna de mano', 'equipo'],
      ],
    },
  },
  {
    ref: 'AMBULANCIA 163',
    gabinetes: {
      'Compartimiento superior': [
        ['Balón de oxígeno 3 m³', 'insumo_medico'],
        ['Tabla espinal larga', 'medico'],
        ['Collarín cervical (juego)', 'medico'],
      ],
      'Botiquín': [
        ['Tensiómetro con estetoscopio', 'insumo_medico'],
        ['Oxímetro de pulso', 'insumo_medico'],
        ['Kit de curación', 'insumo_medico'],
      ],
    },
  },
  {
    ref: 'RESCATE 163',
    gabinetes: {
      'Cajón trasero': [
        ['Motosierra', 'equipo'],
        ['Equipo hidráulico de rescate', 'rescate'],
        ['Cuerda de rescate 50m', 'rescate'],
      ],
    },
  },
  {
    ref: 'AUXILIAR 163',
    gabinetes: {
      'Cajón de herramientas': [
        ['Conos de seguridad (juego)', 'accesorio'],
        ['Cable de arranque', 'herramienta'],
        ['Gata hidráulica', 'herramienta'],
      ],
      'Cama posterior': [
        ['Bidón de agua 20L', 'insumo'],
        ['Mangueras de repuesto', 'equipo'],
      ],
    },
  },
]

// Borra la data dummy previa (cualquier ítem con itemId 'inv-dummy-...').
async function cleanupDummyInventory() {
  let removed = 0
  let lastKey
  do {
    const res = await ddb.send(new ScanCommand({
      TableName: T.inventory,
      FilterExpression: 'begins_with(itemId, :p)',
      ExpressionAttributeValues: { ':p': 'inv-dummy-' },
      ProjectionExpression: 'itemId',
      ExclusiveStartKey: lastKey,
    }))
    for (const it of res.Items ?? []) {
      await ddb.send(new DeleteCommand({ TableName: T.inventory, Key: { itemId: it.itemId } }))
      removed++
    }
    lastKey = res.LastEvaluatedKey
  } while (lastKey)
  if (removed) console.log(`↺ Limpieza: ${removed} ítems dummy anteriores eliminados.`)
}

async function seedInventory() {
  let n = 0
  for (const m of MAQUINAS) {
    let gi = 0
    for (const [gab, items] of Object.entries(m.gabinetes)) {
      gi++
      let ii = 0
      for (const [name, category] of items) {
        ii++
        const itemId = `inv-dummy-${slug(m.ref)}-g${gi}-i${ii}`
        await ddb.send(new PutCommand({
          TableName: T.inventory,
          Item: {
            itemId,
            name,
            category,
            almacenTipo: 'maquina',
            almacenReferencia: m.ref,
            ubicacionInterna: gab,
            quantity: 1,
            unitMeasure: 'unidad',
            condition: 'operativo',
            notes: 'Dato de prueba (dummy) — reemplazar al cargar el inventario real.',
            createdAt: now(),
            updatedAt: now(),
          },
        }))
        n++
      }
    }
  }
  console.log(`✓ Inventario de máquinas: ${n} ítems dummy en ${MAQUINAS.length} unidades.`)
}
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// ─────────────────────────────────────────────────────────────────────────
// B) Cuenta ASPIRANTE de prueba → formulario de asistencia
// ─────────────────────────────────────────────────────────────────────────
const TEST_USER_ID = 'user-dummy-aspirante'
const TEST_PROFILE_ID = 'prof-dummy-aspirante'
const TEST_DNI = '99887766'
const TEST_EMAIL = 'aspirante.prueba@ubo163.pe'
const TEST_PASSWORD = 'Aspirante2026'

async function seedAspirante() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12)
  await ddb.send(new PutCommand({
    TableName: T.users,
    Item: { userId: TEST_USER_ID, email: TEST_EMAIL, passwordHash, createdAt: now(), updatedAt: now() },
  }))
  await ddb.send(new PutCommand({
    TableName: T.profiles,
    Item: {
      profileId: TEST_PROFILE_ID,
      userId: TEST_USER_ID,
      fullName: 'Aspirante De Prueba Ancón',
      dni: TEST_DNI,
      email: TEST_EMAIL,
      phone: '999888777',
      grade: 'aspirante',
      status: 'aspirante_en_curso',
      situacion: 'formacion',
      gender: 'masculino',
      birthDate: '2003-05-20',
      convocatoriaIngresoLabel: '2026-II (AGOSTO)',
      ordenAntiguedad: 999,
      createdAt: now(),
      updatedAt: now(),
    },
  }))
  console.log('✓ Cuenta aspirante de prueba creada.')
  console.log(`   Login → DNI: ${TEST_DNI}  ·  correo: ${TEST_EMAIL}`)
  console.log(`   Contraseña: ${TEST_PASSWORD}`)
}

async function main() {
  await cleanupDummyInventory()
  await seedInventory()
  await seedAspirante()
  console.log('\nListo. Prueba el checklist en /parque-motor y la asistencia iniciando sesión con la cuenta aspirante.')
}
main().catch(e => { console.error(e); process.exit(1) })
