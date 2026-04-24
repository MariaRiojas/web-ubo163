/**
 * Scraper de emergencias SGO Norte — equivalente a emergencias.py
 * Scrapea sgonorte.bomberosperu.gob.pe/24horas (no requiere login).
 */
import { db, emergencies, emergencyVehicles } from '../db'
import { parseHtml, clean, parseFecha } from '../utils'
import { log } from '../browser'

const URL_SGO = 'https://sgonorte.bomberosperu.gob.pe/24horas'

export async function scrapeEmergenciasSGO() {
  try {
    const res = await fetch(URL_SGO, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const html = await res.text()
    const $ = parseHtml(html)

    let nuevas = 0, actualizadas = 0

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

      // Fire-and-forget async inside each
      void (async () => {
        const [emergency] = await db.insert(emergencies).values({
          numeroParte, tipo, estado, fechaDespacho: fechaDt,
        }).onConflictDoUpdate({
          target: emergencies.numeroParte,
          set: { estado, tipo, updatedAt: new Date() },
        }).returning()

        for (const cod of maquinas) {
          await db.insert(emergencyVehicles).values({
            emergencyId: emergency.id, codigoVehiculo: cod, nombreVehiculo: cod,
          }).onConflictDoNothing()
        }

        // Can't easily track new vs updated with Drizzle onConflict, just count
        nuevas++
      })()
    })

    // Wait a tick for async operations
    await new Promise((r) => setTimeout(r, 1000))
    log(`SGO Norte — ${nuevas} procesadas`)
  } catch (e) {
    log(`ERROR SGO Norte: ${e}`)
  }
}
