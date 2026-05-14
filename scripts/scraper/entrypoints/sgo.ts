/**
 * Entrypoint standalone para Fargate: scraper de emergencias SGO Norte.
 *
 * A diferencia de los otros scrapers, **no requiere login a la extranet**:
 * sgonorte.bomberosperu.gob.pe/24horas es público.
 *
 * No abre browser — usa fetch directo. Por eso es rápido (~10-30s).
 *
 * Invocado por EventBridge Scheduler cada 5 minutos.
 */
import { log } from '../browser'
import { scrapeEmergenciasSGO } from '../scrapers/emergencias-sgo'

async function main() {
  const start = Date.now()
  log('Entrypoint: sgo')

  let exitCode = 0
  try {
    await scrapeEmergenciasSGO()
    log(`OK — duración ${((Date.now() - start) / 1000).toFixed(1)}s`)
  } catch (e) {
    log(`ERROR: ${e instanceof Error ? e.message : e}`)
    exitCode = 1
  }

  process.exit(exitCode)
}

main()
