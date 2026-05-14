/**
 * Helper para validar credenciales del intranet del CGBVP sin guardarlas.
 *
 * Lanza una instancia efÃ­mera de Puppeteer, intenta iniciar sesiÃ³n en
 *   http://www.bomberosperu.gob.pe/extranet/ini.asp
 * y reporta si las credenciales fueron aceptadas.
 *
 * Uso:
 *   const result = await testCgbvpLogin({ username: 'A23118', password: '...' })
 *   if (result.success) { ... } else { console.log(result.error) }
 *
 * IMPORTANTE: este helper NO guarda las credenciales en ningÃºn lado.
 * El almacenamiento se hace por separado desde el endpoint que lo invoca,
 * solo si este helper devuelve success=true.
 */
import puppeteer, { type Page, type Browser } from 'puppeteer'

const LOGIN_URL = 'http://www.bomberosperu.gob.pe/extranet/ini.asp'
const NAVIGATION_TIMEOUT_MS = 30_000
const POST_SUBMIT_WAIT_MS = 3_000

export interface TestLoginResult {
  success: boolean
  /** Mensaje para mostrar al usuario en caso de error. Redactado en peruano formal. */
  error?: string
  /** CÃ³digo interno del error para logs y mÃ©tricas. No se muestra al usuario. */
  errorCode?: 'timeout' | 'invalid_credentials' | 'network' | 'unexpected_response' | 'browser_error'
  /** DuraciÃ³n total del intento en milisegundos. */
  durationMs: number
}

export interface TestLoginInput {
  username: string
  password: string
}

/**
 * Valida si un usuario y contraseÃ±a son aceptados por el intranet del CGBVP.
 *
 * Esta funciÃ³n es pesada: tarda 5-15 segundos porque levanta Chromium.
 * Solo debe llamarse desde endpoints que corren en un entorno con el
 * navegador disponible (no desde Edge runtime).
 *
 * Modo demo: cuando la variable de entorno CGBVP_DEMO_MODE=true,
 * no hace la conexiÃ³n real al intranet y devuelve una respuesta simulada
 * basada en el usuario ingresado:
 *   - Usuarios que empiezan con "demo" o "test" â†’ success
 *   - Usuarios que empiezan con "fail"          â†’ invalid_credentials
 *   - Usuarios que empiezan con "slow"          â†’ timeout simulado
 *   - Cualquier otro                             â†’ success
 * Esto permite probar el flujo de UI sin tener credenciales reales
 * del CGBVP mientras se desarrolla.
 */
export async function testCgbvpLogin(input: TestLoginInput): Promise<TestLoginResult> {
  if (process.env.CGBVP_DEMO_MODE === 'true') {
    return simulatedTestLogin(input)
  }

  const start = Date.now()
  let browser: Browser | null = null

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ],
    })

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

    // El intranet CGBVP a veces dispara alertas JS; las aceptamos en silencio
    page.on('dialog', (d) => d.accept().catch(() => {}))

    const pageResult = await attemptLogin(page, input)

    return {
      ...pageResult,
      durationMs: Date.now() - start,
    }
  } catch (err: any) {
    return {
      success: false,
      error: 'OcurriÃ³ un problema tÃ©cnico al validar las credenciales. IntÃ©ntelo nuevamente en unos minutos.',
      errorCode: 'browser_error',
      durationMs: Date.now() - start,
    }
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch {
        // Ignoramos errores al cerrar
      }
    }
  }
}

async function attemptLogin(page: Page, input: TestLoginInput): Promise<Omit<TestLoginResult, 'durationMs'>> {
  // Intentamos cargar la pÃ¡gina de login
  try {
    await page.goto(LOGIN_URL, {
      waitUntil: 'networkidle2',
      timeout: NAVIGATION_TIMEOUT_MS,
    })
  } catch {
    return {
      success: false,
      error: 'No pudimos acceder al intranet del CGBVP. Puede que el sitio estÃ© fuera de servicio. IntÃ©ntelo en unos minutos.',
      errorCode: 'network',
    }
  }

  // Verificamos que el formulario de login exista
  const userInput = await page.$('input[name="txtUsuario"]')
  const passInput = await page.$('input[name="txtContrasenia"]')
  const submitBtn = await page.$('input.Boton[value="ACEPTAR"]')

  if (!userInput || !passInput || !submitBtn) {
    return {
      success: false,
      error: 'El intranet del CGBVP cambiÃ³ su formulario de ingreso. Contacte al administrador del sistema.',
      errorCode: 'unexpected_response',
    }
  }

  // Ingresamos credenciales
  try {
    await userInput.type(input.username, { delay: 30 })
    await passInput.type(input.password, { delay: 30 })
    await Promise.all([
      submitBtn.click(),
      page
        .waitForNavigation({ waitUntil: 'networkidle2', timeout: NAVIGATION_TIMEOUT_MS })
        .catch(() => null), // puede no haber navegaciÃ³n explÃ­cita si el login falla
    ])
    await new Promise((r) => setTimeout(r, POST_SUBMIT_WAIT_MS))
  } catch {
    return {
      success: false,
      error: 'El intranet del CGBVP tardÃ³ demasiado en responder. IntÃ©ntelo nuevamente.',
      errorCode: 'timeout',
    }
  }

  const finalUrl = page.url()

  // El intranet redirige a una pÃ¡gina de bienvenida cuando el login es correcto
  if (finalUrl.includes('bienvenida') || finalUrl.includes('menu') || finalUrl.includes('DEPA')) {
    return { success: true }
  }

  // Si volvimos a la pÃ¡gina de login, las credenciales son invÃ¡lidas
  if (finalUrl.includes('ini.asp') || finalUrl.includes('login')) {
    return {
      success: false,
      error: 'El intranet del CGBVP rechazÃ³ el usuario o la contraseÃ±a. Verifique que sean los mismos que usa para ingresar a bomberosperu.gob.pe/extranet.',
      errorCode: 'invalid_credentials',
    }
  }

  // Caso borde: terminamos en una URL inesperada
  return {
    success: false,
    error: 'El intranet respondiÃ³ de forma inesperada. IntÃ©ntelo nuevamente o contacte al administrador si el problema persiste.',
    errorCode: 'unexpected_response',
  }
}


// -------------------------------------------------------------------
// MODO DEMO
// -------------------------------------------------------------------

/**
 * Versión simulada de testCgbvpLogin para desarrollo.
 * No se conecta al intranet real — responde según un patrón en el usuario.
 * Se activa con CGBVP_DEMO_MODE=true en .env.local.
 */
async function simulatedTestLogin(input: TestLoginInput): Promise<TestLoginResult> {
  const start = Date.now()
  const u = input.username.toLowerCase()

  // Esperamos un ratito para que se sienta como una validación real
  await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500))

  if (u.startsWith('fail') || u === 'error') {
    return {
      success: false,
      error: 'El intranet del CGBVP rechazó el usuario o la contraseña. Verifique que sean los mismos que usa para ingresar a bomberosperu.gob.pe/extranet.',
      errorCode: 'invalid_credentials',
      durationMs: Date.now() - start,
    }
  }

  if (u.startsWith('slow') || u === 'timeout') {
    await new Promise((r) => setTimeout(r, 5000))
    return {
      success: false,
      error: 'El intranet del CGBVP tardó demasiado en responder. Inténtelo nuevamente.',
      errorCode: 'timeout',
      durationMs: Date.now() - start,
    }
  }

  if (u.startsWith('network') || u === 'down') {
    return {
      success: false,
      error: 'No pudimos acceder al intranet del CGBVP. Puede que el sitio esté fuera de servicio. Inténtelo en unos minutos.',
      errorCode: 'network',
      durationMs: Date.now() - start,
    }
  }

  // Por defecto en modo demo: aceptamos cualquier credencial
  return {
    success: true,
    durationMs: Date.now() - start,
  }
}
