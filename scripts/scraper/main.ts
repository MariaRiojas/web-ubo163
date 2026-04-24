/**
 * Runner principal del scraper — equivalente a main.py
 * Loop infinito con intervalos configurables + health check HTTP.
 *
 * Uso: tsx --env-file=.env.local scripts/scraper/main.ts
 */
import http from 'node:http'
import { initBrowser, login, closeBrowser, log, sleep } from './browser'
import { scrapeEstadoCia } from './scrapers/estado-cia'
import { scrapePartesCia } from './scrapers/partes-cia'
import { scrapeAsistenciaMensual } from './scrapers/asistencia-mensual'
import { scrapeEmergenciasSGO } from './scrapers/emergencias-sgo'

// ── Health check ────────────────────────────────────────────────
const PORT = parseInt(process.env.SCRAPER_HEALTH_PORT || '8080')
http.createServer((_, res) => { res.writeHead(200); res.end('ok') }).listen(PORT)

// ── Intervalos (ms) ─────────────────────────────────────────────
const INTERVALO_ESTADO = 2 * 60 * 1000       // 2 min
const INTERVALO_PARTES = 15 * 60 * 1000      // 15 min
const INTERVALO_ASISTENCIA = 6 * 60 * 60 * 1000 // 6 horas
const INTERVALO_SGO = 5 * 60 * 1000          // 5 min
const TICK = 30 * 1000                        // 30 seg

async function main() {
  log('Iniciando scraper...')
  let page = await initBrowser()
  await login(page)

  let ultimoEstado = 0
  let ultimoPartes = 0
  let ultimoAsistencia = 0
  let ultimoSGO = 0

  log(`Loop iniciado — estado:2min | partes:15min | SGO:5min`)
  log(`Para actualizar padrón: npm run scraper:bomberos`)

  while (true) {
    const ahora = Date.now()
    const hoy = new Date()

    try {
      if (ahora - ultimoEstado >= INTERVALO_ESTADO) {
        await scrapeEstadoCia(page)
        ultimoEstado = Date.now()
      }

      if (ahora - ultimoPartes >= INTERVALO_PARTES) {
        log('Actualizando partes CIA...')
        await scrapePartesCia(page)
        ultimoPartes = Date.now()
      }

      // Asistencia mensual: solo entre día 1 y 5, scrapeando el mes anterior
      if (hoy.getDate() <= 5 && ahora - ultimoAsistencia >= INTERVALO_ASISTENCIA) {
        const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
        log(`Actualizando asistencia ${mesAnterior.getMonth() + 1}/${mesAnterior.getFullYear()}...`)
        await scrapeAsistenciaMensual(page, mesAnterior.getMonth() + 1, mesAnterior.getFullYear())
        ultimoAsistencia = Date.now()
      }

      if (ahora - ultimoSGO >= INTERVALO_SGO) {
        await scrapeEmergenciasSGO()
        ultimoSGO = Date.now()
      }
    } catch (e) {
      log(`ERROR crítico: ${e}`)
      log('Reiniciando browser...')
      try { await closeBrowser() } catch {}
      await sleep(10000)
      page = await initBrowser()
      await login(page)
    }

    await sleep(TICK)
  }
}

main().catch((e) => {
  log(`FATAL: ${e}`)
  process.exit(1)
})
