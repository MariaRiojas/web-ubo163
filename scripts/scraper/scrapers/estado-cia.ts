/**
 * Scraper de estado de compañía — equivalente a estado_cia.py
 * Captura: estado general, jefes, vehículos, personal en turno.
 * Se ejecuta cada ~2 minutos.
 *
 * DynamoDB: actualiza profile.status + cgbvpStatus history.
 * El snapshot completo de estado se guarda en cgbvpSync (PK='estado-cia', SK=ISO).
 */
import type { Page } from 'puppeteer'
import { ddb, TABLE, GetCommand, PutCommand, UpdateCommand, ScanCommand, generateId, now } from '../db'
import type { Profile } from '../../../lib/db/schema/profiles'
import { parseHtml, clean, parseFecha, fetchWithCookies } from '../utils'
import { log, getCookies, ensureSession } from '../browser'

const URL_ESTADO = 'https://www.bomberosperu.gob.pe/extranet/DEPA/CEEM/CEEMEstaCon.asp'
const CODIGO_CIA = '31631980006'

/** Fuzzy search por apellidos y nombres (nombres almacenados en mayúsculas desde bomberos scraper) */
async function buscarBombero(nombreRaw: string): Promise<string | null> {
  const nombre = nombreRaw.replace(/\s*\(\d*\)\s*$/, '').replace(/\s+/g, ' ').trim().toUpperCase()
  if (!nombre.includes(',')) return null
  const [parteIzq, nombres] = nombre.split(',', 2)
  const palabras = parteIzq.trim().split(' ')
  const apellidos = palabras.length >= 2 ? palabras.slice(-2).join(' ') : palabras[0]
  const nombresLimpio = nombres.trim()

  const { Items } = await ddb.send(new ScanCommand({
    TableName: TABLE.profiles,
    FilterExpression: 'contains(fullName, :ape) AND contains(fullName, :nom)',
    ExpressionAttributeValues: { ':ape': apellidos, ':nom': nombresLimpio },
    Limit: 50,
  }))
  return (Items?.[0] as Profile | undefined)?.profileId ?? null
}

async function actualizarEstadoBombero(profileId: string, nuevoEstado: string) {
  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE.profiles,
    Key: { profileId },
    ProjectionExpression: 'profileId, #s',
    ExpressionAttributeNames: { '#s': 'status' },
  }))
  if (!Item) return
  const estadoAnterior = Item.status as string
  if (estadoAnterior === nuevoEstado) return

  await ddb.send(new UpdateCommand({
    TableName: TABLE.profiles,
    Key: { profileId },
    UpdateExpression: 'SET #s = :s, updatedAt = :t',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': nuevoEstado, ':t': now() },
  }))

  await ddb.send(new PutCommand({
    TableName: TABLE.cgbvpStatus,
    Item: {
      profileId,
      date: now(),
      estadoAnterior,
      estadoNuevo: nuevoEstado,
      fuente: 'scraper',
      createdAt: now(),
    },
  }))
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
  let fechaHoraStr: string | null = null

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
    else if (label.includes('fecha')) {
      const dt = parseFecha(valor)
      fechaHoraStr = dt ? dt.toISOString() : null
    }
  })

  // Tabla 2: vehículos (denormalized array)
  const vehiculos: { codigoVehiculo: string; estado?: string; motivo?: string; tipoVehiculo?: string }[] = []
  const filasVeh = $(tablas[1]).find('tr').slice(2)
  filasVeh.each((_, fila) => {
    const inputs = $(fila).find('input')
    if (inputs.length < 7) return
    const codV = $(inputs[0]).attr('value')?.trim()
    if (!codV) return
    const estadoV = $(inputs[3]).attr('value')?.trim() || 'EN BASE'
    const motivoV = $(inputs[4]).attr('value')?.trim() || undefined
    const tipoV = $(inputs[6]).attr('value')?.trim() || 'DESCONOCIDO'
    vehiculos.push({ codigoVehiculo: codV, estado: estadoV, motivo: motivoV, tipoVehiculo: tipoV })
  })

  // Tabla 4: personal en turno
  const bomberosEnTurno = new Set<string>()
  const personal_list: { profileId?: string; nombreRaw?: string; tipo?: string; horaIngreso?: string; esBombero?: boolean; esAlMando?: boolean; esPiloto?: boolean; esMedico?: boolean }[] = []

  if (tablas.length >= 4) {
    const filasTurno = $(tablas[3]).find('tr').slice(2)
    for (let i = 0; i < filasTurno.length; i++) {
      const tds = $(filasTurno[i]).find('td')
      if (tds.length < 10) continue
      const tipoEf = clean($(tds[0]).text())
      const nombreRaw = clean($(tds[1]).text())
      const horaIng = clean($(tds[2]).text()) || undefined
      const flags = [3, 4, 5, 6, 7, 8, 9].map((j) => $(tds[j]).text().includes('X'))

      let profileId: string | undefined
      if (tipoEf === 'BOM') {
        const pid = await buscarBombero(nombreRaw)
        if (pid) {
          profileId = pid
          bomberosEnTurno.add(pid)
          await actualizarEstadoBombero(pid, 'en_turno')
        }
      }

      personal_list.push({
        profileId,
        nombreRaw,
        tipo: tipoEf,
        horaIngreso: horaIng,
        esBombero: flags[0],
        esAlMando: flags[1],
        esPiloto: flags[2],
        esMedico: flags[3],
      })
    }
  }

  // Guardar snapshot en cgbvpSync
  const ts = now()
  await ddb.send(new PutCommand({
    TableName: TABLE.cgbvpSync,
    Item: {
      syncType: 'estado-cia',
      timestamp: ts,
      statusId: generateId(),
      primerJefe: primerJefe ?? undefined,
      segundoJefe: segundoJefe ?? undefined,
      estadoGeneral: estadoGeneral ?? undefined,
      pilotosDisponibles: pilotos ?? undefined,
      paramedicosDisponibles: paramedicos ?? undefined,
      personalDisponible: personal ?? undefined,
      observaciones: observaciones ?? undefined,
      informante: informante ?? undefined,
      fechaHora: fechaHoraStr ?? undefined,
      vehiculos,
      personal: personal_list,
      createdAt: ts,
    },
  }))

  // Marcar como franco a quienes estaban en turno y ya no aparecen
  if (bomberosEnTurno.size > 0) {
    const { Items: enTurnoItems } = await ddb.send(new ScanCommand({
      TableName: TABLE.profiles,
      FilterExpression: '#s = :en_turno',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':en_turno': 'en_turno' },
      ProjectionExpression: 'profileId',
    }))
    for (const item of enTurnoItems ?? []) {
      const pid = (item as Profile).profileId
      if (!bomberosEnTurno.has(pid)) {
        await actualizarEstadoBombero(pid, 'franco')
      }
    }
  }

  log(`Estado CIA — ${estadoGeneral} | personal: ${personal}`)
}
