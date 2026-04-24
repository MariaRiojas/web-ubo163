/**
 * Scraper de partes de emergencia — equivalente a partes_cia.py
 * Captura partes por vehículo, con tiempos, km, al mando, tipo de emergencia.
 */
import type { Page } from 'puppeteer'
import { db, emergencies, emergencyVehicles, emergencyTypes, hiredDrivers, profiles } from '../db'
import { eq, and, ilike, sql } from 'drizzle-orm'
import { parseHtml, clean, parseFecha, toInt } from '../utils'
import { log, sleep, ensureSession } from '../browser'

const URL_PARTES = 'http://www.bomberosperu.gob.pe/extranet/depa/ceem/partesycomi/CEEMParteComiLis.asp'

const VEHICULOS_CIA: Record<string, string> = {
  '0570': 'RES-150', '1288': 'M150-1', '1377': 'AMB-150',
  '1544': 'M150-3', '1737': 'RESLIG-150', '2002': 'CIST-150',
}

const DISTRITOS_CONOCIDOS = [
  'SAN MARTIN DE PORRES', 'PUENTE PIEDRA', 'LOS OLIVOS', 'SANTA ROSA',
  'CARABAYLLO', 'COMAS', 'INDEPENDENCIA', 'ANCON', 'ANCÓN',
  'VENTANILLA', 'MI PERU', 'CALLAO', 'BELLAVISTA', 'LA PERLA',
  'LIMA', 'RIMAC', 'BREÑA', 'LA VICTORIA', 'SAN JUAN DE LURIGANCHO',
]

function extraerDistrito(direccion: string | null): string | null {
  if (!direccion) return null
  const texto = direccion.replace(/\s+/g, ' ').trim().toUpperCase()
  return DISTRITOS_CONOCIDOS.find((d) => texto.endsWith(d)) ?? null
}

async function buscarBomberoAlMando(texto: string | null): Promise<{ id: string | null; texto: string | null }> {
  if (!texto || texto === '--') return { id: null, texto: null }
  const limpio = texto.replace(/\s+/g, ' ').trim()
  const palabras = limpio.split(' ')
  if (palabras.length < 2) return { id: null, texto: limpio }

  for (let i = 1; i < palabras.length - 1; i++) {
    const candidato = `${palabras[i]} ${palabras[i + 1]}`
    const result = await db.query.profiles.findFirst({
      where: ilike(profiles.fullName, `%${candidato}%`),
      columns: { id: true },
    })
    if (result) return { id: result.id, texto: limpio }
  }
  return { id: null, texto: limpio }
}

async function buscarOCrearTipoEmergencia(descripcion: string | null): Promise<number | null> {
  if (!descripcion || descripcion === '--') return null
  const desc = descripcion.trim()
  const existing = await db.query.emergencyTypes.findFirst({ where: eq(emergencyTypes.descripcion, desc) })
  if (existing) return existing.id
  const [created] = await db.insert(emergencyTypes).values({ descripcion: desc }).returning()
  return created.id
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

async function procesarFila(tds: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI, codTexto: string) {
  if (tds.length < 18) return null

  const numeroParte = $(tds[2]).text().trim()
  if (!numeroParte || numeroParte === '--') return null

  const tipoParte = $(tds[1]).text().trim()
  const fechaDespacho = parseFecha($(tds[5]).text().trim())
  const fechaSalida = parseFecha($(tds[6]).text().trim())
  const fechaLlegada = parseFecha($(tds[7]).text().trim())
  const fechaRetorno = parseFecha($(tds[8]).text().trim())
  const fechaIngreso = parseFecha($(tds[9]).text().trim())
  const tipoEmerg = limpiarCampo($(tds[10]).text().trim())
  const observacion = limpiarCampo($(tds[11]).text().trim())
  const direccion = limpiarCampo($(tds[12]).text().trim())
  const alMandoRaw = limpiarCampo($(tds[13]).text().trim())
  const numEfectivos = toInt($(tds[14]).text().trim())
  const pilotoNombre = limpiarCampo($(tds[15]).text().trim())
  const kmSalida = toInt($(tds[16]).text().trim())
  const kmIngreso = toInt($(tds[17]).text().trim())

  const { id: alMandoId, texto: alMandoTexto } = await buscarBomberoAlMando(alMandoRaw)
  const tipoEmergenciaId = await buscarOCrearTipoEmergencia(tipoEmerg)
  const distrito = extraerDistrito(direccion)
  const estado = fechaIngreso ? 'CERRADO' : 'ATENDIENDO'

  const [emergency] = await db.insert(emergencies).values({
    numeroParte, tipo: tipoParte, estado, direccion, distrito,
    fechaDespacho, fechaRetorno, observaciones: observacion,
    alMandoId, alMandoTexto, tipoEmergenciaId,
  }).onConflictDoUpdate({
    target: emergencies.numeroParte,
    set: {
      estado, updatedAt: new Date(),
      direccion: sql`COALESCE(EXCLUDED.direccion, ${emergencies.direccion})`,
      fechaRetorno: sql`COALESCE(EXCLUDED.fecha_retorno, ${emergencies.fechaRetorno})`,
      alMandoId: sql`COALESCE(EXCLUDED.al_mando_id, ${emergencies.alMandoId})`,
      tipoEmergenciaId: sql`COALESCE(EXCLUDED.tipo_emergencia_id, ${emergencies.tipoEmergenciaId})`,
      distrito: sql`COALESCE(EXCLUDED.distrito, ${emergencies.distrito})`,
    },
  }).returning()

  // Vincular vehículo
  await db.insert(emergencyVehicles).values({
    emergencyId: emergency.id, codigoVehiculo: codTexto, nombreVehiculo: codTexto,
    kmSalida, kmRetorno: kmIngreso,
  }).onConflictDoNothing()

  return emergency
}

/** Scrape de partes del día actual por vehículo */
export async function scrapePartesCia(page: Page) {
  const hoy = new Date()
  let nuevos = 0, actualizados = 0

  for (const [codVehi, codTexto] of Object.entries(VEHICULOS_CIA)) {
    try {
      const params = buildParams(hoy, codVehi)
      for (let intento = 0; intento < 3; intento++) {
        await page.goto(`${URL_PARTES}?${params}`, { waitUntil: 'networkidle2', timeout: 30000 })
        await sleep(3000)
        if (!page.url().includes('localhost') && !page.url().includes('ini.asp')) break
        await ensureSession(page)
      }

      const $ = parseHtml(await page.content())
      const filas = $('tr[onmouseover], tr[onMouseOver]')

      for (let i = 0; i < filas.length; i++) {
        const tds = $(filas[i]).find('td')
        const result = await procesarFila(tds, $, codTexto)
        if (result) nuevos++
      }

      log(`  ${codTexto}: ${filas.length} partes procesados`)
    } catch (e) {
      log(`  ERROR partes ${codTexto}: ${e}`)
    }
  }

  log(`Partes CIA — ${nuevos} procesados`)
}

/** Scrape de rango de fechas (carga histórica) */
export async function scrapePartesCiaRango(page: Page, fechaInicio: Date, fechaFin: Date) {
  let total = 0
  const dia = new Date(fechaInicio)

  while (dia <= fechaFin) {
    log(`  Procesando ${dia.toLocaleDateString('es-PE')}...`)
    const params = buildParams(dia, '') // sin filtro de vehículo

    try {
      for (let intento = 0; intento < 3; intento++) {
        await page.goto(`${URL_PARTES}?${params}`, { waitUntil: 'networkidle2', timeout: 30000 })
        await sleep(3000)
        if (!page.url().includes('localhost') && !page.url().includes('ini.asp')) break
        await ensureSession(page)
      }

      const $ = parseHtml(await page.content())
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
    }

    dia.setDate(dia.getDate() + 1)
    await sleep(2000)
  }

  log(`Histórico completo — ${total} partes procesados`)
}
