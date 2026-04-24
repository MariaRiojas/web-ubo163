/**
 * Scraper de asistencia mensual — equivalente a asistencia_mensual.py
 * Captura días asistidos, guardias, horas acumuladas, emergencias por bombero.
 */
import type { Page } from 'puppeteer'
import { db, profiles, cgbvpAttendance } from '../db'
import { eq } from 'drizzle-orm'
import { parseHtml, clean, toInt } from '../utils'
import { log, sleep, ensureSession } from '../browser'

const URL_ASISTENCIA = 'http://www.bomberosperu.gob.pe/extranet/depa/ceem/asistencia_bomberos/CEEMAsisLis.asp'

export async function scrapeAsistenciaMensual(page: Page, mes: number, anio: number) {
  const params = new URLSearchParams({
    NivelArbol: '../../../', txtOrden: 'numParte', txtOrdenSentido: 'asc',
    txtOrdenAnterior: '', txtCodIdenEst: '', chk: 'checkbox',
    txtCodEstructura: '', txtValoresCadenaDependencia: '', txtCodigoUbigeo: '',
    cboMes: String(mes), cboAnio: String(anio),
    txtTitulo: 'ESTADO DE COMPANIAS', opc: '1',
  })

  let nuevos = 0, actualizados = 0

  try {
    await page.goto(`${URL_ASISTENCIA}?${params}`, { waitUntil: 'networkidle2', timeout: 30000 })
    await sleep(3000)

    if (page.url().includes('localhost') || page.url().includes('ini.asp')) {
      await ensureSession(page)
      await page.goto(`${URL_ASISTENCIA}?${params}`, { waitUntil: 'networkidle2', timeout: 30000 })
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

      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.codigoCgbvp, codigo),
        columns: { id: true },
      })
      if (!profile) continue

      const [result] = await db.insert(cgbvpAttendance).values({
        profileId: profile.id, mes, anio, diasAsistidos, diasGuardia, horasAcumuladas, numEmergencias,
      }).onConflictDoUpdate({
        target: [cgbvpAttendance.profileId, cgbvpAttendance.mes, cgbvpAttendance.anio],
        set: { diasAsistidos, diasGuardia, horasAcumuladas, numEmergencias, updatedAt: new Date() },
      }).returning({ id: cgbvpAttendance.id })

      // Simple heuristic: if id is new it's a new record
      result ? actualizados++ : nuevos++
    }

    log(`Asistencia ${String(mes).padStart(2, '0')}/${anio} — ${nuevos + actualizados} procesados`)
  } catch (e) {
    log(`ERROR asistencia mensual: ${e}`)
  }
}
