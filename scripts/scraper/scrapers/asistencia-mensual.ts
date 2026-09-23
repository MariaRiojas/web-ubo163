/**
 * Scraper de asistencia mensual — equivalente a asistencia_mensual.py
 * Captura días asistidos, guardias, horas acumuladas, emergencias por bombero.
 */
import type { Page } from 'puppeteer'
import { ddb, TABLE, QueryCommand, PutCommand, now } from '../db'
import type { Profile } from '../../../lib/db/schema/profiles'
import { parseHtml, clean, toInt } from '../utils'
import { log, sleep, ensureSession, login } from '../browser'
import type { HttpSession } from '../http-client'

const URL_ASISTENCIA = 'http://www.bomberosperu.gob.pe/extranet/depa/ceem/asistencia_bomberos/CEEMAsisLis.asp'

function asistenciaUrl(mes: number, anio: number): string {
  const params = new URLSearchParams({
    NivelArbol: '../../../', txtOrden: 'numParte', txtOrdenSentido: 'asc',
    txtOrdenAnterior: '', txtCodIdenEst: '', chk: 'checkbox',
    txtCodEstructura: '', txtValoresCadenaDependencia: '', txtCodigoUbigeo: '',
    cboMes: String(mes), cboAnio: String(anio),
    txtTitulo: 'ESTADO DE COMPANIAS', opc: '1',
  })
  return `${URL_ASISTENCIA}?${params}`
}

/** Parseo + upsert de una tabla de asistencia. Reusado por navegador y HTTP. */
async function processAsistencia(html: string, mes: number, anio: number): Promise<number> {
  const $ = parseHtml(html)
  const filas = $('table tr')
  let procesados = 0
  for (let i = 0; i < filas.length; i++) {
    const tds = $(filas[i]).find('td')
    if (tds.length < 8) continue
    const primerTexto = clean($(tds[0]).text())
    if (!/^\d+$/.test(primerTexto)) continue
    const codigo = clean($(tds[1]).text())
    if (!codigo) continue
    const profile = await findProfileByCodigo(codigo)
    if (!profile) continue
    await ddb.send(new PutCommand({
      TableName: TABLE.cgbvpAttendance,
      Item: {
        profileId: profile.profileId,
        date: `${anio}-${String(mes).padStart(2, '0')}`,
        mes, anio,
        diasAsistidos: toInt(clean($(tds[4]).text())) ?? 0,
        diasGuardia: toInt(clean($(tds[5]).text())) ?? 0,
        horasAcumuladas: toInt(clean($(tds[6]).text())) ?? 0,
        numEmergencias: toInt(clean($(tds[7]).text())) ?? 0,
        updatedAt: now(),
      },
    }))
    procesados++
  }
  return procesados
}

/** Versión SIN navegador (HTTP). */
export async function scrapeAsistenciaMensualHttp(session: HttpSession, mes: number, anio: number) {
  const procesados = await processAsistencia(await session.fetchHtml(asistenciaUrl(mes, anio)), mes, anio)
  log(`Asistencia ${String(mes).padStart(2, '0')}/${anio} — ${procesados} procesados`)
}

async function findProfileByCodigo(codigo: string): Promise<Profile | null> {
  const { Items } = await ddb.send(new QueryCommand({
    TableName: TABLE.profiles,
    IndexName: 'codigoCgbvp-index',
    KeyConditionExpression: 'codigoCgbvp = :c',
    ExpressionAttributeValues: { ':c': codigo },
    Limit: 1,
  }))
  return (Items?.[0] as Profile | undefined) ?? null
}

export async function scrapeAsistenciaMensual(pageInicial: Page, mes: number, anio: number) {
  const params = new URLSearchParams({
    NivelArbol: '../../../', txtOrden: 'numParte', txtOrdenSentido: 'asc',
    txtOrdenAnterior: '', txtCodIdenEst: '', chk: 'checkbox',
    txtCodEstructura: '', txtValoresCadenaDependencia: '', txtCodigoUbigeo: '',
    cboMes: String(mes), cboAnio: String(anio),
    txtTitulo: 'ESTADO DE COMPANIAS', opc: '1',
  })
  const url = `${URL_ASISTENCIA}?${params}`

  let page = pageInicial
  let procesados = 0

  // Hasta 2 intentos: si el sitio ASP desprende el frame ("Navigating frame was
  // detached"), se recrea la página y se re-loguea antes de reintentar.
  for (let intento = 0; intento < 2; intento++) {
   try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await sleep(3000)

    if (page.url().includes('localhost') || page.url().includes('ini.asp')) {
      await ensureSession(page)
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
      await sleep(3000)
    }

    const $ = parseHtml(await page.content())
    const filas = $('table tr')

    for (let i = 0; i < filas.length; i++) {
      const tds = $(filas[i]).find('td')
      if (tds.length < 8) continue

      const primerTexto = clean($(tds[0]).text())
      if (!/^\d+$/.test(primerTexto)) continue // skip headers

      const codigo = clean($(tds[1]).text())
      if (!codigo) continue

      const diasAsistidos = toInt(clean($(tds[4]).text())) ?? 0
      const diasGuardia = toInt(clean($(tds[5]).text())) ?? 0
      const horasAcumuladas = toInt(clean($(tds[6]).text())) ?? 0
      const numEmergencias = toInt(clean($(tds[7]).text())) ?? 0

      const profile = await findProfileByCodigo(codigo)
      if (!profile) continue

      const dateKey = `${anio}-${String(mes).padStart(2, '0')}`
      await ddb.send(new PutCommand({
        TableName: TABLE.cgbvpAttendance,
        Item: {
          profileId: profile.profileId,
          date: dateKey,
          mes,
          anio,
          diasAsistidos,
          diasGuardia,
          horasAcumuladas,
          numEmergencias,
          updatedAt: now(),
        },
      }))
      procesados++
    }

    break // scrape exitoso, salir del retry
   } catch (e) {
    log(`ERROR asistencia mensual (intento ${intento + 1}): ${e}`)
    if (/detached|Frame|Target closed|Session closed/i.test(String(e)) && intento === 0) {
      try {
        const browser = page.browser()
        const fresh = await browser.newPage()
        await page.close().catch(() => {})
        page = fresh
        await login(page)
        log('  ↻ página recreada y sesión restaurada tras frame desprendido')
      } catch (re) {
        log(`  No se pudo recuperar la sesión: ${re}`)
        break
      }
    } else {
      break
    }
   }
  }

  log(`Asistencia ${String(mes).padStart(2, '0')}/${anio} — ${procesados} procesados`)
}
