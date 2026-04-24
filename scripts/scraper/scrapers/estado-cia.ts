/**
 * Scraper de estado de compañía — equivalente a estado_cia.py
 * Captura: estado general, jefes, vehículos, personal en turno.
 * Se ejecuta cada ~2 minutos.
 */
import type { Page } from 'puppeteer'
import { db, profiles, cgbvpCompanyStatus, cgbvpVehicles, cgbvpStatusVehicles, cgbvpShiftAttendance, cgbvpStatusHistory } from '../db'
import { eq, and, ilike, sql } from 'drizzle-orm'
import { parseHtml, clean, parseFecha, fetchWithCookies } from '../utils'
import { log, getCookies, ensureSession } from '../browser'

const URL_ESTADO = 'https://www.bomberosperu.gob.pe/extranet/DEPA/CEEM/EstadoCia/CEEMCiaLis.asp'
const CODIGO_CIA = '31501980006'

async function buscarBombero(nombreRaw: string): Promise<string | null> {
  const nombre = nombreRaw.replace(/\s*\(\d*\)\s*$/, '').replace(/\s+/g, ' ').trim()
  if (!nombre.includes(',')) return null
  const [parteIzq, nombres] = nombre.split(',', 2)
  const palabras = parteIzq.trim().split(' ')
  const apellidos = palabras.length >= 2 ? palabras.slice(-2).join(' ') : palabras[0]

  const result = await db.query.profiles.findFirst({
    where: and(
      ilike(profiles.fullName, `%${apellidos}%`),
      ilike(profiles.fullName, `%${nombres.trim()}%`),
    ),
    columns: { id: true },
  })
  return result?.id ?? null
}

async function actualizarEstadoBombero(profileId: string, nuevoEstado: string) {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
    columns: { id: true, status: true },
  })
  if (!profile) return
  if (profile.status !== nuevoEstado) {
    await db.update(profiles).set({ status: nuevoEstado, updatedAt: new Date() }).where(eq(profiles.id, profileId))
    await db.insert(cgbvpStatusHistory).values({
      profileId, estadoAnterior: profile.status, estadoNuevo: nuevoEstado, fuente: 'scraper',
    })
  }
}

export async function scrapeEstadoCia(page: Page) {
  const cookies = await getCookies(page)
  let html: string

  try {
    html = await fetchWithCookies(`${URL_ESTADO}?CodigoCia=${CODIGO_CIA}`, cookies)
  } catch {
    await ensureSession(page)
    const newCookies = await getCookies(page)
    html = await fetchWithCookies(`${URL_ESTADO}?CodigoCia=${CODIGO_CIA}`, newCookies)
  }

  if (html.includes('localhost') || html.length < 500) {
    await ensureSession(page)
    const newCookies = await getCookies(page)
    html = await fetchWithCookies(`${URL_ESTADO}?CodigoCia=${CODIGO_CIA}`, newCookies)
  }

  const $ = parseHtml(html)
  const tablas = $('table')
  if (tablas.length < 3) {
    log('Estado CIA: respuesta inesperada')
    return
  }

  // Tabla 1: jefes y estado general
  const filasT1 = $(tablas[0]).find('tr')
  const celda = (fila: number, idx = 1) => {
    const tds = $(filasT1[fila]).find('td')
    return tds.length > idx ? clean($(tds[idx]).text()) : ''
  }
  const primerJefe = celda(0) || null
  const segundoJefe = celda(1) || null
  const estadoGeneral = celda(2) || null

  // Tabla 3: disponibilidad
  let pilotos: number | null = null
  let paramedicos: number | null = null
  let personal: number | null = null
  let observaciones: string | null = null
  let informante: string | null = null
  let fechaHora: Date | null = null

  $(tablas[2]).find('tr').each((_, fila) => {
    const tds = $(fila).find('td')
    if (tds.length < 2) return
    const label = clean($(tds[0]).text()).toLowerCase()
    const valor = clean($(tds[1]).text())
    if (label.includes('piloto')) pilotos = parseInt(valor) || null
    else if (label.includes('param')) paramedicos = parseInt(valor) || null
    else if (label.includes('personal')) personal = parseInt(valor) || null
    else if (label.includes('observa')) observaciones = valor || null
    else if (label.includes('informante')) informante = valor || null
    else if (label.includes('fecha')) fechaHora = parseFecha(valor)
  })

  // Insertar estado
  const [status] = await db.insert(cgbvpCompanyStatus).values({
    primerJefe, segundoJefe, estadoGeneral: estadoGeneral,
    pilotosDisponibles: pilotos, paramedicosDisponibles: paramedicos,
    personalDisponible: personal, observaciones, informante, fechaHora,
  }).returning()

  // Tabla 2: vehículos
  const filasVeh = $(tablas[1]).find('tr').slice(2)
  filasVeh.each((_, fila) => {
    const inputs = $(fila).find('input')
    if (inputs.length < 7) return
    const codV = $(inputs[0]).attr('value')?.trim()
    if (!codV) return
    const estadoV = $(inputs[3]).attr('value')?.trim() || 'EN BASE'
    const motivoV = $(inputs[4]).attr('value')?.trim() || null
    const tipoV = $(inputs[6]).attr('value')?.trim() || 'DESCONOCIDO'

    // Upsert vehículo y vincular al snapshot (fire-and-forget dentro del each)
    void (async () => {
      const [veh] = await db.insert(cgbvpVehicles).values({ codigo: codV, tipo: tipoV, estado: estadoV, motivo: motivoV })
        .onConflictDoUpdate({ target: cgbvpVehicles.codigo, set: { estado: estadoV, motivo: motivoV, tipo: tipoV, updatedAt: new Date() } })
        .returning()
      await db.insert(cgbvpStatusVehicles).values({
        statusId: status.id, vehicleId: veh.id, codigoVehiculo: codV, estado: estadoV, motivo: motivoV, tipoVehiculo: tipoV,
      })
    })()
  })

  // Tabla 4: asistencia de turno
  const bomberosEnTurno = new Set<string>()
  if (tablas.length >= 4) {
    const filasTurno = $(tablas[3]).find('tr').slice(2)
    for (let i = 0; i < filasTurno.length; i++) {
      const tds = $(filasTurno[i]).find('td')
      if (tds.length < 10) continue
      const tipoEf = clean($(tds[0]).text())
      const nombreRaw = clean($(tds[1]).text())
      const horaIng = clean($(tds[2]).text()) || null
      const flags = [3, 4, 5, 6, 7, 8, 9].map((j) => $(tds[j]).text().includes('X') ? 1 : 0)

      let profileId: string | null = null
      if (tipoEf === 'BOM') {
        profileId = await buscarBombero(nombreRaw)
        if (profileId) {
          bomberosEnTurno.add(profileId)
          await actualizarEstadoBombero(profileId, 'en_turno')
        }
      }

      await db.insert(cgbvpShiftAttendance).values({
        statusId: status.id, profileId, nombreRaw, tipo: tipoEf,
        horaIngreso: horaIng,
        esBombero: flags[0], esAlMando: flags[1], esPiloto: flags[2],
        esMedico: flags[3], esAppa: flags[4], esMap: flags[5], esBrec: flags[6],
      })
    }
  }

  // Marcar como franco a quienes no están en turno
  if (bomberosEnTurno.size > 0) {
    const enTurno = await db.select({ id: profiles.id }).from(profiles)
      .where(and(eq(profiles.status, 'en_turno'), sql`${profiles.id} != ALL(${Array.from(bomberosEnTurno)}::uuid[])`))
    for (const { id } of enTurno) {
      await actualizarEstadoBombero(id, 'franco')
    }
  }

  log(`Estado CIA — ${estadoGeneral} | personal: ${personal}`)
}
