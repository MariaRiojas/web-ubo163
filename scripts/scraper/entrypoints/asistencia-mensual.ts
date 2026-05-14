/**
 * Entrypoint standalone para Fargate: scraper de asistencia mensual.
 *
 * Ciclo de vida:
 *   1. init browser
 *   2. login CGBVP
 *   3. scrape asistencia del mes anterior (o del mes especificado en env)
 *   4. close browser
 *   5. exit
 *
 * Invocado por EventBridge Scheduler los días 1-5 de cada mes a las 3 AM
 * (los datos del mes anterior ya están consolidados en CGBVP).
 *
 * Env overrides opcionales:
 *   SCRAPE_MES=N       (1-12, por defecto mes anterior)
 *   SCRAPE_ANIO=YYYY   (por defecto año del mes anterior)
 */
import { initBrowser, login, closeBrowser, log } from '../browser'
import { scrapeAsistenciaMensual } from '../scrapers/asistencia-mensual'

async function main() {
  const start = Date.now()

  const hoy = new Date()
  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)

  const mes = parseInt(process.env.SCRAPE_MES || String(mesAnterior.getMonth() + 1), 10)
  const anio = parseInt(process.env.SCRAPE_ANIO || String(mesAnterior.getFullYear()), 10)

  log(`Entrypoint: asistencia-mensual ${String(mes).padStart(2, '0')}/${anio}`)

  let exitCode = 0
  try {
    const page = await initBrowser()
    await login(page)
    await scrapeAsistenciaMensual(page, mes, anio)
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
