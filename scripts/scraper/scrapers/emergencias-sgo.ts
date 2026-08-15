/**
 * Scraper de emergencias SGO Norte — equivalente a emergencias.py
 * Scrapea sgonorte.bomberosperu.gob.pe/24horas (no requiere login).
 */
import { ddb, TABLE, GetCommand, PutCommand, now } from '../db'
import { parseHtml, clean, parseFecha } from '../utils'
import { log } from '../browser'

const URL_SGO = 'https://sgonorte.bomberosperu.gob.pe/24horas'

export async function scrapeEmergenciasSGO() {
  try {
    const res = await fetch(URL_SGO, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const html = await res.text()
    const $ = parseHtml(html)

    let procesadas = 0
    const promises: Promise<void>[] = []

    $('table tbody tr').each((_, fila) => {
      const tds = $(fila).find('td')
      if (tds.length < 6) return

      const numeroParte = clean($(tds[0]).text())
      if (!numeroParte) return

      const fechaDt = parseFecha(clean($(tds[1]).text()))
      const tipo = clean($(tds[3]).text())
      const badge = $(tds[4]).find('span').first()
      const estado = badge.length ? clean(badge.text()) : clean($(tds[4]).text())
      const maquinas = $(tds[5]).find('li').map((_, li) => clean($(li).text())).get().filter(Boolean)

      const emergencyId = `EMG-${numeroParte}`
      const fechaDespacho = fechaDt ? fechaDt.toISOString() : undefined
      const date = fechaDt ? fechaDt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)

      promises.push((async () => {
        const { Item: existing } = await ddb.send(new GetCommand({
          TableName: TABLE.emergencies,
          Key: { emergencyId },
        }))

        const existingVehiculos: { codigoVehiculo: string; nombreVehiculo?: string }[] = existing?.vehiculos ?? []
        const existingCodigos = new Set(existingVehiculos.map((v: any) => v.codigoVehiculo))
        const newVehiculos = [
          ...existingVehiculos,
          ...maquinas.filter((cod) => !existingCodigos.has(cod)).map((cod) => ({ codigoVehiculo: cod, nombreVehiculo: cod })),
        ]

        await ddb.send(new PutCommand({
          TableName: TABLE.emergencies,
          Item: {
            emergencyId,
            numeroParte,
            tipo: tipo || undefined,
            estado: estado || undefined,
            ...(fechaDespacho ? { fechaDespacho } : {}),
            date,
            vehiculos: newVehiculos,
            createdAt: existing?.createdAt ?? now(),
            updatedAt: now(),
          },
        }))
        procesadas++
      })())
    })

    await Promise.all(promises)
    log(`SGO Norte — ${procesadas} procesadas`)
  } catch (e) {
    log(`ERROR SGO Norte: ${e}`)
  }
}
