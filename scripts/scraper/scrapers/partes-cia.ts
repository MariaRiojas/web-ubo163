/**
 * Scraper de partes de emergencia — equivalente a partes_cia.py
 * Captura partes por vehículo, con tiempos, km, al mando, tipo de emergencia.
 */
import type { Page } from 'puppeteer'
import type * as cheerio from 'cheerio'
import { ddb, TABLE, GetCommand, PutCommand, ScanCommand, now } from '../db'
import type { Profile } from '../../../lib/db/schema/profiles'
import { parseHtml, clean, parseFecha, toInt } from '../utils'
import { log, sleep, ensureSession, login } from '../browser'

const stripAcc = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

const URL_PARTES = 'http://www.bomberosperu.gob.pe/extranet/depa/ceem/partesycomi/CEEMParteComiLis.asp'

const VEHICULOS_CIA: Record<string, string> = {
  '1104': 'AMB-163', '1304': 'M163-1', '0986': 'RES-163',
  '0605': 'AUX-163',
}

const DISTRITOS_CONOCIDOS = [
  'SAN MARTIN DE PORRES', 'PUENTE PIEDRA', 'LOS OLIVOS', 'SANTA ROSA',
  'CARABAYLLO', 'COMAS', 'INDEPENDENCIA', 'ANCON', 'ANCÓN',
  'VENTANILLA', 'MI PERU', 'CALLAO', 'BELLAVISTA', 'LA PERLA',
  'LIMA', 'RIMAC', 'BREÑA', 'LA VICTORIA', 'SAN JUAN DE LURIGANCHO',
]

function extraerDistrito(direccion: string | null): string | null {
  if (!direccion) return null
  const texto = stripAcc(direccion.replace(/\s+/g, ' ').trim().toUpperCase())
  // Buscar el distrito conocido que aparezca en cualquier parte de la dirección
  // (antes solo matcheaba si estaba al final → muchos partes quedaban "sin distrito").
  // Se prefiere el nombre más largo para evitar falsos positivos (p. ej. "LIMA").
  let mejor: string | null = null
  let mejorLen = 0
  for (const d of DISTRITOS_CONOCIDOS) {
    const dn = stripAcc(d)
    if (texto.includes(dn) && dn.length > mejorLen) { mejor = d; mejorLen = dn.length }
  }
  return mejor
}

/** Busca profileId por nombre usando ScanCommand con contains (case-sensitive, nombres en mayúsculas) */
async function buscarBomberoAlMando(texto: string | null): Promise<{ id: string | null; texto: string | null }> {
  if (!texto || texto === '--') return { id: null, texto: null }
  const limpio = texto.replace(/\s+/g, ' ').trim().toUpperCase()
  const palabras = limpio.split(' ')
  if (palabras.length < 2) return { id: null, texto: limpio }

  for (let i = 1; i < palabras.length - 1; i++) {
    const candidato = `${palabras[i]} ${palabras[i + 1]}`
    const { Items } = await ddb.send(new ScanCommand({
      TableName: TABLE.profiles,
      FilterExpression: 'contains(fullName, :kw)',
      ExpressionAttributeValues: { ':kw': candidato },
      Limit: 50,
    }))
    if (Items && Items.length > 0) {
      return { id: (Items[0] as Profile).profileId, texto: limpio }
    }
  }
  return { id: null, texto: limpio }
}

function buildParams(dia: Date, codVehi: string) {
  return new URLSearchParams({
    NivelArbol: '../../../', txtOrden: 'numParte', txtOrdenSentido: 'asc',
    txtOrdenAnterior: '', txtTotalRegistro: '', txtCodigoUbigeo: '',
    txtCodIdenEst: '', txtCodEstructura: '', txtDireccion: '',
    txtValoresCadenaDependencia: '', opc: '1', cboTipos: 'T',
    cboMesFechaInicio: String(dia.getMonth() + 1).padStart(2, '0'),
    cboAnioFechaInicio: String(dia.getFullYear()),
    cboMesFechaFin: String(dia.getMonth() + 1).padStart(2, '0'),
    cboAnioFechaFin: String(dia.getFullYear()),
    cboDiaFechaInicio: String(dia.getDate()),
    cboDiaFechaFin: String(dia.getDate()),
    cboHoraFechaInicio: '0', cboHoraFechaFin: '23',
    cboMinutoFechaInicio: '0', cboMinutoFechaFin: '59',
    txtTitulo: 'ESTADO DE COMPANIAS', cboVehi: codVehi,
  })
}

function limpiarCampo(s: string): string | null {
  const v = s.replace(/^[–-]+/, '').trim()
  return v || null
}

async function procesarFila(tds: cheerio.Cheerio<any>, $: cheerio.CheerioAPI, codTexto: string) {
  if (tds.length < 18) return null

  const numeroParte = $(tds[2]).text().trim()
  if (!numeroParte || numeroParte === '--') return null

  const tipoParte = $(tds[1]).text().trim()
  const fechaDespacho = parseFecha($(tds[5]).text().trim())
  const fechaRetorno = parseFecha($(tds[8]).text().trim())
  const tipoEmerg = limpiarCampo($(tds[10]).text().trim())
  const observacion = limpiarCampo($(tds[11]).text().trim())
  const direccion = limpiarCampo($(tds[12]).text().trim())
  const alMandoRaw = limpiarCampo($(tds[13]).text().trim())
  const kmSalida = toInt($(tds[16]).text().trim())
  const kmIngreso = toInt($(tds[17]).text().trim())
  const fechaIngreso = parseFecha($(tds[9]).text().trim())

  const { id: alMandoId, texto: alMandoTexto } = await buscarBomberoAlMando(alMandoRaw)
  const distrito = extraerDistrito(direccion)
  const estado = fechaIngreso ? 'CERRADO' : 'ATENDIENDO'

  const emergencyId = `EMG-${numeroParte}`
  const date = fechaDespacho ? fechaDespacho.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)

  // Get existing to merge vehicles
  const { Item: existing } = await ddb.send(new GetCommand({
    TableName: TABLE.emergencies,
    Key: { emergencyId },
  }))

  const existingVehiculos: any[] = existing?.vehiculos ?? []
  const alreadyHas = existingVehiculos.some((v: any) => v.codigoVehiculo === codTexto)
  const vehiculos = alreadyHas
    ? existingVehiculos.map((v: any) =>
        v.codigoVehiculo === codTexto
          ? { ...v, kmSalida: kmSalida ?? v.kmSalida, kmRetorno: kmIngreso ?? v.kmRetorno }
          : v,
      )
    : [
        ...existingVehiculos,
        {
          codigoVehiculo: codTexto,
          nombreVehiculo: codTexto,
          ...(kmSalida != null ? { kmSalida } : {}),
          ...(kmIngreso != null ? { kmRetorno: kmIngreso } : {}),
        },
      ]

  await ddb.send(new PutCommand({
    TableName: TABLE.emergencies,
    Item: {
      emergencyId,
      numeroParte,
      tipo: tipoParte || undefined,
      estado,
      ...(fechaDespacho ? { fechaDespacho: fechaDespacho.toISOString() } : {}),
      ...(fechaRetorno ? { fechaRetorno: fechaRetorno.toISOString() } : {}),
      date,
      direccion: direccion ?? existing?.direccion,
      distrito: distrito ?? existing?.distrito,
      alMandoId: alMandoId ?? existing?.alMandoId,
      alMandoTexto: alMandoTexto ?? existing?.alMandoTexto,
      tipoEmergenciaDesc: tipoEmerg ?? existing?.tipoEmergenciaDesc,
      observaciones: observacion ?? existing?.observaciones,
      vehiculos,
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    },
  }))

  return numeroParte
}

/**
 * Navega a una URL del CGBVP y devuelve el HTML decodificado con el charset
 * correcto (Windows-1252). La página ASP del CGBVP está en Windows-1252, pero
 * Chrome la asume UTF-8 y rompe los acentos (Á → "�"). Leyendo los bytes crudos
 * de la respuesta y decodificándolos con Windows-1252 se preservan los acentos
 * en origen (ej. "CAPITÁN" en vez de "CAPIT�N").
 */
async function gotoDecoded(page: Page, url: string): Promise<string> {
  let resp: Awaited<ReturnType<Page['goto']>> = null
  for (let intento = 0; intento < 3; intento++) {
    resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await sleep(3000)
    if (!page.url().includes('localhost') && !page.url().includes('ini.asp')) break
    await ensureSession(page)
  }
  if (resp) {
    try {
      const buf = await resp.buffer()
      return new TextDecoder('windows-1252').decode(buf)
    } catch { /* si falla el buffer, se usa el DOM decodificado por el navegador */ }
  }
  return await page.content()
}

/** Scrape de partes del día actual por vehículo */
export async function scrapePartesCia(page: Page) {
  const hoy = new Date()
  let procesados = 0

  for (const [codVehi, codTexto] of Object.entries(VEHICULOS_CIA)) {
    try {
      const params = buildParams(hoy, codVehi)
      const $ = parseHtml(await gotoDecoded(page, `${URL_PARTES}?${params}`))
      const filas = $('tr[onmouseover], tr[onMouseOver]')

      for (let i = 0; i < filas.length; i++) {
        const tds = $(filas[i]).find('td')
        const result = await procesarFila(tds, $, codTexto)
        if (result) procesados++
      }

      log(`  ${codTexto}: ${filas.length} partes procesados`)
    } catch (e) {
      log(`  ERROR partes ${codTexto}: ${e}`)
    }
  }

  log(`Partes CIA — ${procesados} procesados`)
}

/** Scrape de rango de fechas (carga histórica) */
export async function scrapePartesCiaRango(pageInicial: Page, fechaInicio: Date, fechaFin: Date) {
  let total = 0
  let page = pageInicial
  const dia = new Date(fechaInicio)

  while (dia <= fechaFin) {
    log(`  Procesando ${dia.toLocaleDateString('es-PE')}...`)
    const params = buildParams(dia, '') // sin filtro de vehículo

    try {
      const $ = parseHtml(await gotoDecoded(page, `${URL_PARTES}?${params}`))
      const filas = $('tr[onmouseover], tr[onMouseOver]')

      for (let i = 0; i < filas.length; i++) {
        const tds = $(filas[i]).find('td')
        const codVehTexto = $(tds[4]).text().trim()
        const result = await procesarFila(tds, $, codVehTexto)
        if (result) total++
      }

      log(`    ${filas.length} filas procesadas`)
    } catch (e) {
      log(`    ERROR ${dia.toLocaleDateString('es-PE')}: ${e}`)
      // Recuperación del bug "Attempted to use detached Frame": el sitio ASP con
      // frames desprende el frame al re-navegar y, sin esto, TODOS los días
      // siguientes fallaban. Se recrea la página y se re-loguea para continuar.
      if (/detached|Frame|Target closed|Session closed/i.test(String(e))) {
        try {
          const browser = page.browser()
          const fresh = await browser.newPage()
          await page.close().catch(() => {})
          page = fresh
          await login(page)
          log('    ↻ página recreada y sesión restaurada tras frame desprendido')
        } catch (re) {
          log(`    No se pudo recuperar la sesión (se detiene el histórico): ${re}`)
          break
        }
      }
    }

    dia.setDate(dia.getDate() + 1)
    await sleep(2000)
  }

  log(`Histórico completo — ${total} partes procesados`)
}
