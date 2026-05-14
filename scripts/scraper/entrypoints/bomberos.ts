/**
 * Entrypoint standalone para Fargate: scraper del padrón de bomberos.
 *
 * Ciclo de vida:
 *   1. init browser
 *   2. login CGBVP
 *   3. scrape lista completa de bomberos (paginado)
 *   4. upsert en profiles
 *   5. close browser
 *   6. exit
 *
 * Invocado por:
 *   - EventBridge Scheduler una vez al mes (día 1, 2 AM) para mantener el padrón.
 *   - Manualmente via ECS Run Task la primera vez tras el deploy inicial.
 */
import { initBrowser, login, closeBrowser, log } from '../browser'
import { scrapeBomberos } from '../scrapers/bomberos'

async function main() {
  const start = Date.now()
  log('Entrypoint: bomberos (padrón)')

  let exitCode = 0
  try {
    const page = await initBrowser()
    await login(page)
    await scrapeBomberos(page)
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
