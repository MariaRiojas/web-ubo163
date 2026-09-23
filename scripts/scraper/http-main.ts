/**
 * Runner del scraper SIN navegador (HTTP) — equivalente a main.ts pero usando
 * http-client (login por HTTP) en vez de puppeteer. Para máquinas donde el
 * Chromium headless está bloqueado a la red pero Node sí sale (ej. PC del cuartel).
 *
 * Uso: tsx --env-file=.env.local scripts/scraper/http-main.ts
 */
import http from 'node:http'
import { log, sleep } from './browser'
import { httpLogin } from './http-client'
import { scrapeEstadoCiaHttp } from './scrapers/estado-cia'
import { scrapePartesCiaHttp } from './scrapers/partes-cia'
import { scrapeAsistenciaMensualHttp } from './scrapers/asistencia-mensual'
import { scrapeEmergenciasSGO } from './scrapers/emergencias-sgo'

const PORT = parseInt(process.env.SCRAPER_HEALTH_PORT || '8080')
http.createServer((_, res) => { res.writeHead(200); res.end('ok') }).listen(PORT)

const INTERVALO_ESTADO = 2 * 60 * 1000
const INTERVALO_PARTES = 15 * 60 * 1000
const INTERVALO_ASISTENCIA = 6 * 60 * 60 * 1000
const INTERVALO_SGO = 5 * 60 * 1000
const RELOGIN = 25 * 60 * 1000            // refrescar la sesión cada 25 min
const TICK = 30 * 1000

async function main() {
  log('Iniciando scraper (HTTP, sin navegador)...')
  let session = await httpLogin()
  let ultimoLogin = Date.now()
  let ultimoEstado = 0, ultimoPartes = 0, ultimoAsistencia = 0, ultimoSGO = 0

  log('Loop iniciado — estado:2min | partes:15min | SGO:5min | re-login:25min')

  while (true) {
    const ahora = Date.now()
    const hoy = new Date()
    try {
      // Refresco periódico de sesión (evita expiración silenciosa del ASP).
      if (ahora - ultimoLogin >= RELOGIN) {
        session = await httpLogin()
        ultimoLogin = Date.now()
      }
      if (ahora - ultimoEstado >= INTERVALO_ESTADO) {
        await scrapeEstadoCiaHttp(session)
        ultimoEstado = Date.now()
      }
      if (ahora - ultimoPartes >= INTERVALO_PARTES) {
        log('Actualizando partes CIA...')
        await scrapePartesCiaHttp(session)
        ultimoPartes = Date.now()
      }
      if (hoy.getDate() <= 5 && ahora - ultimoAsistencia >= INTERVALO_ASISTENCIA) {
        const m = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
        log(`Actualizando asistencia ${m.getMonth() + 1}/${m.getFullYear()}...`)
        await scrapeAsistenciaMensualHttp(session, m.getMonth() + 1, m.getFullYear())
        ultimoAsistencia = Date.now()
      }
      if (ahora - ultimoSGO >= INTERVALO_SGO) {
        await scrapeEmergenciasSGO()
        ultimoSGO = Date.now()
      }
    } catch (e) {
      log(`ERROR crítico: ${e}`)
      log('Re-login HTTP...')
      await sleep(10000)
      try { session = await httpLogin(); ultimoLogin = Date.now() } catch (re) { log(`No se pudo re-loguear: ${re}`) }
    }
    await sleep(TICK)
  }
}

main().catch((e) => { log(`FATAL: ${e}`); process.exit(1) })
