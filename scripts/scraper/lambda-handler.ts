/**
 * Lambda handler para el scraper CGBVP.
 *
 * Recibe: { scraperType: 'estado-cia' | 'partes-cia' | 'sgo' | 'asistencia-mensual' | 'bomberos',
 *            month?: number, year?: number }
 *
 * Invocado por EventBridge Scheduler según el cron definido en ComputeScraperStack.
 */
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { initBrowser, login, closeBrowser, log } from './browser'
import { scrapeEstadoCia } from './scrapers/estado-cia'
import { scrapePartesCia } from './scrapers/partes-cia'
import { scrapeAsistenciaMensual } from './scrapers/asistencia-mensual'
import { scrapeEmergenciasSGO } from './scrapers/emergencias-sgo'
import { scrapeBomberos } from './scrapers/bomberos'

type ScraperType = 'estado-cia' | 'partes-cia' | 'sgo' | 'asistencia-mensual' | 'bomberos'

interface ScraperEvent {
  scraperType: ScraperType
  month?: number
  year?: number
}

let credentialsLoaded = false

/** Carga credenciales CGBVP desde Secrets Manager (una sola vez por instancia Lambda) */
async function loadCredentials(): Promise<void> {
  if (credentialsLoaded) return

  const arn = process.env.CGBVP_SECRET_ARN
  if (!arn) {
    log('CGBVP_SECRET_ARN no configurado — usando process.env directamente')
    credentialsLoaded = true
    return
  }

  const sm = new SecretsManagerClient({})
  const res = await sm.send(new GetSecretValueCommand({ SecretId: arn }))
  const secret = JSON.parse(res.SecretString ?? '{}')

  process.env.USUARIO_INTRANET = secret.USUARIO_INTRANET ?? ''
  process.env.CONTRASENA_INTRANET = secret.CONTRASENA_INTRANET ?? ''
  credentialsLoaded = true
  log('Credenciales CGBVP cargadas desde Secrets Manager')
}

export async function handler(event: ScraperEvent): Promise<{ ok: boolean; message: string }> {
  const { scraperType, month, year } = event
  log(`Iniciando scraper: ${scraperType}`)

  try {
    // SGO no necesita browser ni login
    if (scraperType === 'sgo') {
      await scrapeEmergenciasSGO()
      return { ok: true, message: 'sgo completado' }
    }

    await loadCredentials()

    const page = await initBrowser()
    try {
      await login(page)

      switch (scraperType) {
        case 'estado-cia':
          await scrapeEstadoCia(page)
          break

        case 'partes-cia':
          await scrapePartesCia(page)
          break

        case 'asistencia-mensual': {
          const now = new Date()
          const targetMonth = month ?? now.getMonth()      // mes anterior = getMonth() (0-based → mes actual sin +1)
          const targetYear  = year  ?? (targetMonth === 0 ? now.getFullYear() - 1 : now.getFullYear())
          await scrapeAsistenciaMensual(page, targetMonth, targetYear)
          break
        }

        case 'bomberos':
          await scrapeBomberos(page)
          break

        default:
          throw new Error(`scraperType desconocido: ${scraperType}`)
      }

      return { ok: true, message: `${scraperType} completado` }
    } finally {
      await closeBrowser().catch(() => {})
    }
  } catch (err) {
    log(`ERROR en ${scraperType}: ${err}`)
    throw err  // Lambda marca la invocación como fallida → EventBridge reintenta
  }
}
