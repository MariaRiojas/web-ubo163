/**
 * Entrypoint standalone para Fargate: scraper de estado de compañía.
 *
 * Ciclo de vida completo:
 *   1. init browser
 *   2. login CGBVP
 *   3. scrape estado
 *   4. close browser
 *   5. exit 0 (o 1 si falla)
 *
 * Invocado por EventBridge Scheduler cada 2 minutos.
 * Todas las credenciales vienen de env vars (Secrets Manager via ECS task def).
 */
import { initBrowser, login, closeBrowser, log } from '../browser'
import { scrapeEstadoCia } from '../scrapers/estado-cia'

async function main() {
  const start = Date.now()
  log('Entrypoint: estado-cia')

  let exitCode = 0
  try {
    const page = await initBrowser()
    await login(page)
    await scrapeEstadoCia(page)
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
