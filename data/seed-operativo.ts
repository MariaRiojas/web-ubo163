/**
 * Seed de datos operativos dummy — simula lo que el scraper CGBVP traería.
 * Ejecutar: npm run db:seed:operativo
 *
 * Cuando conectes el scraper real, estos datos se sobreescriben automáticamente
 * porque todo usa PutCommand (upsert por PK).
 *
 * Tablas populadas: profiles (códigos CGBVP), emergencies, cgbvpAttendance.
 * Tablas omitidas (no migradas a DynamoDB): cgbvpCompanyStatus, hiredDrivers, emergencyTypes.
 */
import { ddb, TABLE, ScanCommand, UpdateCommand, PutCommand, now } from '../lib/db/dynamodb'
import type { Profile } from '../lib/db/schema/profiles'

async function scanAll<T>(tableName: string, filterExpr?: string, exprValues?: Record<string, unknown>): Promise<T[]> {
  const items: T[] = []
  let lastKey: Record<string, unknown> | undefined
  do {
    const res = await ddb.send(new ScanCommand({
      TableName: tableName,
      ...(filterExpr ? { FilterExpression: filterExpr, ExpressionAttributeValues: exprValues } : {}),
      ExclusiveStartKey: lastKey,
    }))
    items.push(...(res.Items ?? []) as T[])
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)
  return items
}

async function seedOperativo() {
  console.log('🚒 Seed operativo — datos dummy del scraper CGBVP...\n')

  // Obtener perfiles existentes
  const allProfiles = await scanAll<Profile>(TABLE.profiles, '#s = :s',
    { ':s': 'activo' } // ExpressionAttributeNames handled by direct ScanCommand below
  )

  // Re-fetch con la expression correcta
  const profilesResult = await ddb.send(new ScanCommand({
    TableName: TABLE.profiles,
    FilterExpression: '#s = :s',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': 'activo' },
  }))
  const profiles = (profilesResult.Items ?? []) as Profile[]

  if (profiles.length === 0) {
    console.log('❌ No hay perfiles. Ejecuta primero: npm run db:seed')
    process.exit(1)
  }

  const primerJefe = profiles.find((p) => p.grade === 'brigadier')
  const segundoJefe = profiles.find((p) => p.grade === 'teniente_brigadier')

  // ── CÓDIGOS CGBVP ──────────────────────────────────────────────
  console.log('🔗 Asignando códigos CGBVP...')
  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i]
    if (!p.codigoCgbvp) {
      const code = `A${String(10000 + i)}`
      await ddb.send(new UpdateCommand({
        TableName: TABLE.profiles,
        Key: { profileId: p.profileId },
        UpdateExpression: 'SET codigoCgbvp = :c, updatedAt = :t',
        ExpressionAttributeValues: { ':c': code, ':t': now() },
      }))
      profiles[i] = { ...p, codigoCgbvp: code }
    }
  }
  console.log(`  ✓ Códigos asignados`)

  // ── EMERGENCIAS (últimos 60 días) ──────────────────────────────
  console.log('🚨 Creando emergencias dummy...')
  const TIPOS = [
    'INCENDIO / ESTRUCTURAS / VIVIENDA / MATERIAL NOBLE',
    'INCENDIO / TERRENO BALDIO',
    'EMERGENCIA MEDICA / TRAUMATICAS / HERIDO POR CAIDA',
    'EMERGENCIA MEDICA / EVENTOS CRITICOS TIEMPO-VIDA / INCONSCIENTE - DESMAYO',
    'EMERGENCIA MEDICA / TIPO MEDICO / DOLOR DE PECHO',
    'ACCIDENTE VEHICULAR / PARTICULAR / AUTOMOVIL',
    'RESCATE / ANIMALES / RESCATE ANIMAL',
    'MATERIALES PELIGROSOS (INCIDENTE) / FUGA / GAS',
    'COMISION',
  ]
  const DISTRITOS = ['ANCON', 'PUENTE PIEDRA', 'CARABAYLLO', 'COMAS', 'VENTANILLA', 'LOS OLIVOS']
  const DIRECCIONES = [
    'AV. ANDRES AVELINO CACERES 000', 'JR. LOS GALLINAZOS 000', 'AH. LADERAS DE CHILLON',
    'CL. JOSE PARDO ESTE 336', 'AV. MERINO REYNA 800', 'OVALO DE PUENTE PIEDRA',
  ]
  const VEHICULOS = ['AMB-163', 'M163-1', 'M163-2', 'RES-163', 'CIST-163', 'RESLIG-163']

  const baseNow = new Date()
  let emergCount = 0

  for (let d = 60; d >= 0; d--) {
    const day = new Date(baseNow)
    day.setDate(day.getDate() - d)
    const count = Math.floor(Math.random() * 4) + (d < 7 ? 1 : 0)

    for (let i = 0; i < count; i++) {
      const hour = Math.floor(Math.random() * 24)
      const min = Math.floor(Math.random() * 60)
      const despacho = new Date(day)
      despacho.setHours(hour, min, 0, 0)

      const respMin = 5 + Math.floor(Math.random() * 30)
      const durMin = respMin + 10 + Math.floor(Math.random() * 90)
      const retorno = new Date(despacho.getTime() + durMin * 60000)
      const esCerrado = d > 0 || i > 0

      const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)]
      const distrito = DISTRITOS[Math.floor(Math.random() * DISTRITOS.length)]
      const dir = DIRECCIONES[Math.floor(Math.random() * DIRECCIONES.length)]
      const alMando = profiles[Math.floor(Math.random() * Math.min(8, profiles.length))]
      const veh = VEHICULOS[Math.floor(Math.random() * VEHICULOS.length)]
      const parte = `202601${String(14000 + emergCount).padStart(5, '0')}`
      const emergencyId = `EMG-${parte}`
      const date = despacho.toISOString().slice(0, 10)

      await ddb.send(new PutCommand({
        TableName: TABLE.emergencies,
        Item: {
          emergencyId,
          numeroParte: parte,
          tipo: tipo.startsWith('COMISION') ? 'COMISION' : 'EMERGENCIA',
          estado: esCerrado ? 'CERRADO' : 'ATENDIENDO',
          fechaDespacho: despacho.toISOString(),
          ...(esCerrado ? { fechaRetorno: retorno.toISOString() } : {}),
          tipoEmergenciaDesc: tipo,
          direccion: `${dir} ${distrito}`,
          distrito,
          alMandoId: alMando.profileId,
          alMandoTexto: alMando.fullName,
          date,
          vehiculos: [{
            codigoVehiculo: veh,
            nombreVehiculo: veh,
            kmSalida: 10000 + Math.floor(Math.random() * 5000),
            ...(esCerrado ? { kmRetorno: 10000 + Math.floor(Math.random() * 5000) + 10 } : {}),
          }],
          createdAt: now(),
          updatedAt: now(),
        },
        ConditionExpression: 'attribute_not_exists(emergencyId)',
      }).catch(() => {})) // skip if already exists

      emergCount++
    }
  }
  console.log(`  ✓ ${emergCount} emergencias`)

  // ── ASISTENCIA MENSUAL (últimos 4 meses) ───────────────────────
  console.log('📅 Creando asistencia mensual...')
  const meses: { mes: number; anio: number }[] = []
  for (let m = 0; m < 4; m++) {
    const d = new Date(baseNow.getFullYear(), baseNow.getMonth() - m, 1)
    meses.push({ mes: d.getMonth() + 1, anio: d.getFullYear() })
  }

  for (const { mes, anio } of meses) {
    const dateKey = `${anio}-${String(mes).padStart(2, '0')}`
    for (const p of profiles) {
      const horas = 20 + Math.floor(Math.random() * 220)
      const dias = 5 + Math.floor(Math.random() * 25)
      const guardias = Math.floor(Math.random() * 22)
      const emerg = Math.floor(Math.random() * 30)

      await ddb.send(new PutCommand({
        TableName: TABLE.cgbvpAttendance,
        Item: {
          profileId: p.profileId,
          date: dateKey,
          mes,
          anio,
          diasAsistidos: dias,
          diasGuardia: guardias,
          horasAcumuladas: horas,
          numEmergencias: emerg,
          updatedAt: now(),
        },
      }))
    }
  }
  console.log(`  ✓ ${meses.length} meses × ${profiles.length} bomberos`)

  console.log('\n✅ Seed operativo completado.')
  console.log('   Las páginas ahora mostrarán datos en Dashboard, Operatividad,')
  console.log('   Partes de Emergencia, Bomberos, Asistencias, Estadísticas y Análisis.')
  console.log('\n   Cuando conectes el scraper real (USUARIO_INTRANET + CONTRASENA_INTRANET),')
  console.log('   los datos se actualizarán automáticamente.\n')
  process.exit(0)
}

seedOperativo().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
