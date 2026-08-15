import puppeteerCore from 'puppeteer-core'
import type { Browser, Page } from 'puppeteer-core'

const puppeteer = puppeteerCore

const LOGIN_URL = process.env.EXTRANET_URL || 'http://www.bomberosperu.gob.pe/extranet/ini.asp'

let browser: Browser | null = null
let page: Page | null = null

export async function initBrowser(): Promise<Page> {
  let executablePath: string | undefined
  let args: string[] = ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process']

  // En Lambda, usar @sparticuz/chromium
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = await import('@sparticuz/chromium')
    executablePath = await (chromium.default?.executablePath ?? chromium.executablePath)()
    args = [...(chromium.default?.args ?? chromium.args ?? []), '--single-process']
  } else {
    // Local: 1) usar PUPPETEER_EXECUTABLE_PATH si está definido;
    //        2) si no, el Chromium que trae `puppeteer` (descargado con npm install);
    //        3) último recurso, el chromium del sistema (Linux).
    executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    if (!executablePath) {
      try {
        const pptr: any = await import('puppeteer')
        const mod = pptr.default ?? pptr
        if (typeof mod.executablePath === 'function') executablePath = mod.executablePath()
      } catch { /* puppeteer full no disponible */ }
    }
    if (!executablePath) executablePath = '/usr/bin/chromium-browser'
  }

  browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args,
  })
  page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0')
  return page
}

export async function login(p: Page, retries = 5): Promise<void> {
  const user = process.env.USUARIO_INTRANET!
  const pass = process.env.CONTRASENA_INTRANET!

  for (let i = 0; i < retries; i++) {
    try {
      // Dismiss any dialogs
      p.on('dialog', (d) => d.accept().catch(() => {}))

      await p.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await sleep(2000)

      // Esperar a que el formulario de login esté disponible
      await p.waitForSelector('input[name="txtUsuario"]', { timeout: 10000 })
      
      // Limpiar campos y escribir
      await p.$eval('input[name="txtUsuario"]', (el: any) => { el.value = '' })
      await p.type('input[name="txtUsuario"]', user, { delay: 30 })
      await p.$eval('input[name="txtContrasenia"]', (el: any) => { el.value = '' })
      await p.type('input[name="txtContrasenia"]', pass, { delay: 30 })

      // Click y esperar navegación sin waitForNavigation (evita frame detach)
      await Promise.all([
        p.click('input[value="ACEPTAR"]').catch(() => p.click('input.Boton')),
        sleep(5000),
      ])

      // Verificar si logueó (puede estar en un frame o nueva URL)
      const url = p.url()
      const content = await p.content()
      if (url.includes('bienvenida') || content.includes('bienvenida') || content.includes('DEPA')) {
        log('Login OK')
        return
      }

      // Intentar verificar en frames
      const frames = p.frames()
      for (const frame of frames) {
        try {
          const fUrl = frame.url()
          if (fUrl.includes('bienvenida') || fUrl.includes('DEPA')) {
            log('Login OK (frame)')
            return
          }
        } catch {}
      }

      log(`Login intento ${i + 1}: no se detectó sesión activa, URL: ${url}`)
    } catch (e) {
      log(`Login intento ${i + 1}/${retries} falló: ${e}`)
    }
    await sleep(5000)
  }
  throw new Error('Login falló tras todos los intentos')
}

/** Relogin si la sesión expiró (redirect a localhost o ini.asp) */
export async function ensureSession(p: Page): Promise<void> {
  const url = p.url()
  if (url.includes('localhost') || url.includes('ini.asp') || url === 'about:blank') {
    log('Sesión expirada, reconectando...')
    await login(p)
  }
}

/** Obtiene cookies del browser para usar con fetch */
export async function getCookies(p: Page): Promise<Record<string, string>> {
  const cookies = await p.cookies()
  return Object.fromEntries(cookies.map((c) => [c.name, c.value]))
}

export async function closeBrowser(): Promise<void> {
  await browser?.close()
  browser = null
  page = null
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export function log(msg: string) {
  const t = new Date().toLocaleTimeString('es-PE', { hour12: false })
  console.log(`[${t}] ${msg}`)
}
