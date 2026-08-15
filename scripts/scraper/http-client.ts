/**
 * Cliente HTTP del intranet CGBVP — SIN navegador.
 *
 * Alternativa a browser.ts (puppeteer) para máquinas donde un firewall/EDR
 * bloquea el Chromium headless pero SÍ deja salir a la pila HTTP de Node
 * (verificado: `fetch` al CGBVP responde 200). Replica el login por formulario
 * (POST a validando.asp) y mantiene la cookie de sesión ASP.
 */
import { log } from './browser'

const BASE = process.env.EXTRANET_BASE || 'http://www.bomberosperu.gob.pe/extranet'
const UA = 'Mozilla/5.0'

function latin1(buf: ArrayBuffer): string {
  return new TextDecoder('latin1').decode(buf)
}

/** Extrae cookies de una respuesta (Node 20: getSetCookie). */
function collectCookies(res: Response, jar: Record<string, string>): void {
  const anyHeaders = res.headers as any
  const list: string[] = typeof anyHeaders.getSetCookie === 'function'
    ? anyHeaders.getSetCookie()
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : [])
  for (const c of list) {
    const kv = c.split(';')[0]
    const i = kv.indexOf('=')
    if (i > 0) jar[kv.slice(0, i).trim()] = kv.slice(i + 1).trim()
  }
}

export interface HttpSession {
  cookie: string
  /** Descarga una página del intranet (decodifica latin1) con la sesión. */
  fetchHtml(url: string, referer?: string): Promise<string>
}

/** Inicia sesión en el CGBVP por HTTP y devuelve una sesión con la cookie. */
export async function httpLogin(): Promise<HttpSession> {
  const user = process.env.USUARIO_INTRANET
  const pass = process.env.CONTRASENA_INTRANET
  if (!user || !pass) throw new Error('Faltan USUARIO_INTRANET / CONTRASENA_INTRANET en el entorno')

  const jar: Record<string, string> = {}
  const cookieStr = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')

  // 1) GET ini.asp → cookie de sesión ASP
  const r1 = await fetch(`${BASE}/ini.asp`, { headers: { 'User-Agent': UA } })
  collectCookies(r1, jar)
  await r1.arrayBuffer()

  // 2) POST validando.asp con las credenciales
  const body = `txtUsuario=${encodeURIComponent(user)}&txtContrasenia=${encodeURIComponent(pass)}`
  const r2 = await fetch(`${BASE}/validando.asp`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: `${BASE}/ini.asp`,
      Cookie: cookieStr(),
    },
    body,
    redirect: 'manual',
  })
  collectCookies(r2, jar)
  await r2.arrayBuffer()

  // 3) Verificar sesión pidiendo una página protegida
  const check = await fetch(`${BASE}/DEPA/BOM/BOMBomLis.asp`, {
    headers: { 'User-Agent': UA, Cookie: cookieStr() },
  })
  collectCookies(check, jar)
  const chtml = latin1(await check.arrayBuffer())
  const esLogin = /name=["']?txtContrasenia/i.test(chtml)          // seguimos en la página de login
  const tieneContenido = /ArmarComboPagina|RELACION DE BOMBEROS|cboEstado|onmouseover/i.test(chtml)
  if (esLogin || !tieneContenido) {
    throw new Error('Login HTTP falló — credenciales inválidas o sesión rechazada')
  }

  log('Login HTTP OK')

  return {
    cookie: cookieStr(),
    async fetchHtml(url: string, referer = BASE) {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: referer, Cookie: cookieStr() } })
      collectCookies(res, jar)
      return latin1(await res.arrayBuffer())
    },
  }
}
