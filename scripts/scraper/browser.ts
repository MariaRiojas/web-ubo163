import puppeteer, { Browser, Page } from 'puppeteer'

const LOGIN_URL = 'http://www.bomberosperu.gob.pe/extranet/ini.asp'

let browser: Browser | null = null
let page: Page | null = null

export async function initBrowser(): Promise<Page> {
  browser = await puppeteer.launch({
    headless: process.env.HEADLESS !== '0',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
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
      await p.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 30000 })
      // Dismiss alerts
      p.on('dialog', (d) => d.accept().catch(() => {}))
      await p.type('input[name="txtUsuario"]', user, { delay: 50 })
      await p.type('input[name="txtContrasenia"]', pass, { delay: 50 })
      await p.click('input.Boton[value="ACEPTAR"]')
      await p.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
      await sleep(2000)
      if (p.url().includes('bienvenida')) {
        log('Login OK')
        return
      }
    } catch (e) {
      log(`Login intento ${i + 1}/${retries} falló: ${e}`)
      await sleep(10000)
    }
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
