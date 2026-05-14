/**
 * Entrypoint standalone para Fargate: scraper de partes de emergencia (día actual).
 *
 * Ciclo de vida:
 *   1. init browser
 *   2. login CGBVP
 *   3. scrape partes del día actual para cada vehículo
 *   4. close browser
 *   5. exit
 *
 * Invocado por EventBridge Scheduler cada 15 minutos.
 *
 * Opcional: si se pasa env SCRAPE_RANGE_DAYS=N, scrapea los últimos N días
 * (útil para recargar histórico via Run Task manual).
 */
import { initBrowser, login, closeBrowser, log } from '../browser'
import { scrapePartesCia, scrapePartesCiaRango } from '../scrapers/partes-cia'

async function main() {
  const start = Date.now()
  const rangeDays = parseInt(process.env.SCRAPE_RANGE_DAYS || '0', 10)

  log(rangeDays > 0 ? `Entrypoint: partes-cia (histórico ${rangeDays} días)` : 'Entrypoint: partes-cia')

  let exitCode = 0
  try {
    const page = await initBrowser()
    await login(page)

    if (rangeDays > 0) {
      const fin = new Date()
      const ini = new Date(fin)
      ini.setDate(ini.getDate() - rangeDays)
      await scrapePartesCiaRango(page, ini, fin)
    } else {
      await scrapePartesCia(page)
    }

    log(`OK — duración ${((Date.now() - start) / 1000).toFixed(1)}s`)
  } catch (e) {
    log(`ERROR: ${e instanceof Error ? e.message : e}`)
    exitCode = 1
  } finally {
    try {
      await closeBrowser()
    } catch {}
  }

  process.exit(exitCode)
}

main()
