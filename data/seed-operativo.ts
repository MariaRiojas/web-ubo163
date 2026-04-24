/**
 * Seed de datos operativos dummy — simula lo que el scraper CGBVP traería.
 * Ejecutar: npm run db:seed:operativo
 *
 * Cuando conectes el scraper real, estos datos se sobreescriben automáticamente
 * porque todo usa upsert / ON CONFLICT.
 */
import { db } from '../lib/db'
import {
  profiles, cgbvpCompanyStatus, cgbvpVehicles, cgbvpShiftAttendance,
  cgbvpAttendance, cgbvpStatusHistory, emergencies, emergencyVehicles,
  emergencyTypes, hiredDrivers,
} from '../lib/db/schema'
import { eq, sql } from 'drizzle-orm'

async function seedOperativo() {
  console.log('🚒 Seed operativo — datos dummy del scraper CGBVP...\n')

  // Obtener perfiles existentes
  const allProfiles = await db.select().from(profiles).where(eq(profiles.status, 'activo'))
  if (allProfiles.length === 0) {
    console.log('❌ No hay perfiles. Ejecuta primero: npm run db:seed')
    process.exit(1)
  }

  const primerJefe = allProfiles.find(p => p.grade === 'brigadier')!
  const segundoJefe = allProfiles.find(p => p.grade === 'teniente_brigadier')!

  // Asignar códigos CGBVP dummy a los perfiles que no tengan
  console.log('🔗 Asignando códigos CGBVP...')
  for (let i = 0; i < allProfiles.length; i++) {
    const p = allProfiles[i]
    if (!p.codigoCgbvp) {
      const code = `A${(10000 + i).toString()}`
      await db.update(profiles).set({ codigoCgbvp: code }).where(eq(profiles.id, p.id))
      allProfiles[i] = { ...p, codigoCgbvp: code }
    }
  }

  // ── VEHÍCULOS ──────────────────────────────────────────────────
  console.log('🚗 Creando vehículos...')
  const vehiculosData = [
    { codigo: 'AMB-163', tipo: 'AMBULANCIA', estado: 'EN BASE', motivo: null },
    { codigo: 'M163-1', tipo: 'AUTOBOMBA/RESCATE', estado: 'EN BASE', motivo: null },
    { codigo: 'M163-2', tipo: 'AUTOBOMBA', estado: 'CON FALLA', motivo: 'DESPERFECTOS MECANICOS' },
    { codigo: 'RES-163', tipo: 'AUTOBOMBA/RESCATE', estado: 'EN BASE', motivo: null },
    { codigo: 'CIST-163', tipo: 'CISTERNA', estado: 'CON FALLA', motivo: 'DESPACHO A EMERGENCIA' },
    { codigo: 'RESLIG-163', tipo: 'AUXILIARES', estado: 'EN BASE', motivo: null },
  ]
  for (const v of vehiculosData) {
    await db.insert(cgbvpVehicles).values(v).onConflictDoUpdate({
      target: cgbvpVehicles.codigo,
      set: { estado: v.estado, motivo: v.motivo, tipo: v.tipo },
    })
  }
  console.log(`  ✓ ${vehiculosData.length} vehículos`)

  // ── PILOTOS RENTADOS ───────────────────────────────────────────
  await db.insert(hiredDrivers).values([
    { apellidos: 'ROMERO FERNANDEZ', nombres: 'Alexander', activo: 'si' },
    { apellidos: 'CASTRO SILVA', nombres: 'Miguel', activo: 'si' },
  ]).onConflictDoNothing()

  // ── ESTADO DE COMPAÑÍA (snapshot actual) ───────────────────────
  console.log('📊 Creando estado de compañía...')
  const [status] = await db.insert(cgbvpCompanyStatus).values({
    primerJefe: primerJefe.fullName,
    segundoJefe: segundoJefe.fullName,
    estadoGeneral: 'EN SERVICIO',
    pilotosDisponibles: 1,
    paramedicosDisponibles: 0,
    personalDisponible: 3,
    observaciones: null,
    informante: primerJefe.fullName,
    fechaHora: new Date(),
  }).returning()

  // Asistencia de turno
  const enTurno = allProfiles.slice(0, 3) // primeros 3 en turno
  for (const p of enTurno) {
    await db.insert(cgbvpShiftAttendance).values({
      statusId: status.id, profileId: p.id, nombreRaw: p.fullName,
      tipo: 'BOM', horaIngreso: '21:39',
      esBombero: 1, esAlMando: p.id === primerJefe.id ? 1 : 0,
      esPiloto: 0, esMedico: 0, esAppa: 0, esMap: 0, esBrec: 0,
    })
  }
  // Piloto rentado
  await db.insert(cgbvpShiftAttendance).values({
    statusId: status.id, nombreRaw: 'ROMERO FERNANDEZ, Alexander',
    tipo: 'REN', horaIngreso: '07:04', esPiloto: 1,
    esBombero: 0, esAlMando: 0, esMedico: 0, esAppa: 0, esMap: 0, esBrec: 0,
  })
  console.log('  ✓ Estado + turno actual')

  // ── TIPOS DE EMERGENCIA ────────────────────────────────────────
  console.log('🔥 Creando tipos de emergencia...')
  const tipos = [
    'INCENDIO / ESTRUCTURAS / VIVIENDA / MATERIAL NOBLE',
    'INCENDIO / TERRENO BALDIO',
    'INCENDIO / OTROS / CHIMENEA',
    'EMERGENCIA MEDICA / TRAUMATICAS / HERIDO POR CAIDA',
    'EMERGENCIA MEDICA / EVENTOS CRITICOS TIEMPO-VIDA / INCONSCIENTE - DESMAYO',
    'EMERGENCIA MEDICA / TIPO MEDICO / DOLOR DE PECHO',
    'EMERGENCIA MEDICA / EVENTOS CRITICOS TIEMPO-VIDA / EMBARAZO - PARTO',
    'ACCIDENTE VEHICULAR / PARTICULAR / AUTOMOVIL',
    'ACCIDENTE VEHICULAR / PARTICULAR / DESPISTE',
    'RESCATE / ANIMALES / RESCATE ANIMAL',
    'MATERIALES PELIGROSOS (INCIDENTE) / FUGA / GAS',
    'COMISION',
  ]
  const tipoIds: Record<string, number> = {}
  for (const desc of tipos) {
    const [t] = await db.insert(emergencyTypes).values({ descripcion: desc })
      .onConflictDoUpdate({ target: emergencyTypes.descripcion, set: { descripcion: desc } })
      .returning()
    tipoIds[desc] = t.id
  }
  console.log(`  ✓ ${tipos.length} tipos`)

  // ── EMERGENCIAS (últimos 60 días) ──────────────────────────────
  console.log('🚨 Creando emergencias dummy...')
  const distritos = ['ANCON', 'PUENTE PIEDRA', 'CARABAYLLO', 'COMAS', 'VENTANILLA', 'LOS OLIVOS']
  const direcciones = [
    'AV. ANDRES AVELINO CACERES 000', 'JR. LOS GALLINAZOS 000', 'AH. LADERAS DE CHILLON',
    'CL. JOSE PARDO ESTE 336', 'AV. MERINO REYNA 800', 'PLAZA VEA', 'OVALO DE PUENTE PIEDRA',
    'CLL LOS CIPRESES MZ K LT 1', 'AV. MARCOS ESPINOZA ALT', 'HUERTOS DE CHILLON MAZ',
  ]
  const vehiculos = ['AMB-163', 'M163-1', 'M163-2', 'RES-163', 'CIST-163', 'RESLIG-163']
  const tipoKeys = Object.keys(tipoIds)
  const now = new Date()
  let emergCount = 0

  for (let d = 60; d >= 0; d--) {
    const day = new Date(now)
    day.setDate(day.getDate() - d)
    // 0-5 emergencias por día
    const count = Math.floor(Math.random() * 4) + (d < 7 ? 1 : 0)
    for (let i = 0; i < count; i++) {
      const hour = Math.floor(Math.random() * 24)
      const min = Math.floor(Math.random() * 60)
      const despacho = new Date(day)
      despacho.setHours(hour, min, 0)

      const respMin = 5 + Math.floor(Math.random() * 30)
      const durMin = respMin + 10 + Math.floor(Math.random() * 90)
      const llegada = new Date(despacho.getTime() + respMin * 60000)
      const retorno = new Date(despacho.getTime() + durMin * 60000)

      const tipoKey = tipoKeys[Math.floor(Math.random() * tipoKeys.length)]
      const distrito = distritos[Math.floor(Math.random() * distritos.length)]
      const dir = direcciones[Math.floor(Math.random() * direcciones.length)]
      const alMando = allProfiles[Math.floor(Math.random() * Math.min(8, allProfiles.length))]
      const numEfectivos = 1 + Math.floor(Math.random() * 5)
      const esCerrado = d > 0 || i > 0 // última del día actual = ATENDIENDO
      const parte = `2026${String(despacho.getMonth() + 1).padStart(2, '0')}${String(14000 + emergCount).padStart(5, '0')}`

      try {
        const [em] = await db.insert(emergencies).values({
          numeroParte: parte,
          tipo: tipoKey.startsWith('COMISION') ? 'COMISION' : 'EMERGENCIA',
          estado: esCerrado ? 'CERRADO' : 'ATENDIENDO',
          fechaDespacho: despacho,
          fechaRetorno: esCerrado ? retorno : null,
          tipoEmergenciaId: tipoIds[tipoKey],
          direccion: `${dir} ${distrito}`,
          distrito,
          alMandoId: alMando.id,
          alMandoTexto: alMando.fullName,
          observaciones: null,
        }).onConflictDoNothing().returning()

        if (em) {
          const veh = vehiculos[Math.floor(Math.random() * vehiculos.length)]
          await db.insert(emergencyVehicles).values({
            emergencyId: em.id, codigoVehiculo: veh, nombreVehiculo: veh,
            horaSalida: new Date(despacho.getTime() + 2 * 60000),
            horaRetorno: esCerrado ? retorno : null,
            kmSalida: 10000 + Math.floor(Math.random() * 5000),
            kmRetorno: esCerrado ? 10000 + Math.floor(Math.random() * 5000) + 10 : null,
          }).onConflictDoNothing()
          emergCount++
        }
      } catch { /* skip duplicates */ }
    }
  }
  console.log(`  ✓ ${emergCount} emergencias`)

  // ── ASISTENCIA MENSUAL (últimos 4 meses) ───────────────────────
  console.log('📅 Creando asistencia mensual...')
  const meses = []
  for (let m = 0; m < 4; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
    meses.push({ mes: d.getMonth() + 1, anio: d.getFullYear() })
  }

  for (const { mes, anio } of meses) {
    for (const p of allProfiles) {
      if (p.status !== 'activo') continue
      const horas = 20 + Math.floor(Math.random() * 220)
      const dias = 5 + Math.floor(Math.random() * 25)
      const guardias = Math.floor(Math.random() * 22)
      const emerg = Math.floor(Math.random() * 30)

      await db.insert(cgbvpAttendance).values({
        profileId: p.id, mes, anio,
        diasAsistidos: dias, diasGuardia: guardias,
        horasAcumuladas: horas, numEmergencias: emerg,
      }).onConflictDoUpdate({
        target: [cgbvpAttendance.profileId, cgbvpAttendance.mes, cgbvpAttendance.anio],
        set: { diasAsistidos: dias, diasGuardia: guardias, horasAcumuladas: horas, numEmergencias: emerg },
      })
    }
  }
  console.log(`  ✓ ${meses.length} meses × ${allProfiles.filter(p => p.status === 'activo').length} bomberos`)

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
