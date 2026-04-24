/**
 * Scraper del padrón de bomberos — equivalente a bomberos.py
 * Scrapea la lista completa de bomberos de la compañía desde la extranet CGBVP
 * y hace upsert en la tabla profiles via Drizzle.
 */
import type { Page } from 'puppeteer'
import { db, profiles } from '../db'
import { eq } from 'drizzle-orm'
import { parseHtml, clean } from '../utils'
import { log, sleep, getCookies } from '../browser'

const URL = 'https://www.bomberosperu.gob.pe/extranet/DEPA/BOM/BOMBomLis.asp'

const GRADE_MAP: Record<string, string> = {
  ASPIRANTE: 'aspirante',
  SECCIONARIO: 'seccionario',
  'SUB TENIENTE': 'subteniente',
  TENIENTE: 'teniente',
  CAPITAN: 'capitan',
  'TENIENTE BRIGADIER': 'teniente_brigadier',
  BRIGADIER: 'brigadier',
  'BRIGADIER MAYOR': 'brigadier_mayor',
  'BRIGADIER GENERAL': 'brigadier_general',
}

function mapGrade(g: string): string {
  return GRADE_MAP[g.toUpperCase()] || 'aspirante'
}

export async function scrapeBomberos(page: Page) {
  log('Iniciando scrape de padrón de bomberos...')

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await sleep(2000)
  const html = await page.content()
  const $ = parseHtml(html)

  // Detectar paginación
  let totalPaginas = 1
  let totalRegistros = 0
  const scriptTag = $('script').filter((_, el) => ($(el).html() || '').includes('ArmarComboPagina')).first()
  const scriptText = scriptTag.html() || ''
  const m = scriptText.match(/ArmarComboPagina\(\d+,(\d+),(\d+)\)/)
  if (m) {
    totalPaginas = parseInt(m[1])
    totalRegistros = parseInt(m[2])
  }

  const cookies = await getCookies(page)
  const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')

  let total = 0
  let nuevos = 0

  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    let pageHtml: string
    if (pagina === 1) {
      pageHtml = html
    } else {
      const params = new URLSearchParams({
        txtDNI: '', txtApeMat: '', NivelArbol: '../../',
        txtOrden: 'apepat', txtOrdenSentido: 'asc', txtOrdenAnterior: '',
        txtCodIdenEst: '', txtCodEstructura: '', cboEstado: '100',
        txtValoresCadenaDependencia: '', txtCodBom: '',
        txtTitulo: 'RELACION DE BOMBEROS', txtApePat: '', txtNombres: '',
        cboGrado: '', txtTotalPagina: String(totalPaginas),
        txtTotalRegistro: String(totalRegistros), cboPagina: String(pagina),
      })
      for (let intento = 0; intento < 3; intento++) {
        try {
          const res = await fetch(`${URL}?${params}`, {
            headers: { 'User-Agent': 'Mozilla/5.0', Referer: URL, Cookie: cookieStr },
          })
          const buf = await res.arrayBuffer()
          pageHtml = new TextDecoder('latin1').decode(buf)
          break
        } catch (e) {
          log(`  Timeout página ${pagina}, intento ${intento + 1}/3`)
          await sleep(10000)
        }
      }
      if (!pageHtml!) {
        log(`  Saltando página ${pagina}`)
        continue
      }
    }

    const $p = parseHtml(pageHtml)
    const filas = $p('table tr[onmouseover]')

    for (let i = 0; i < filas.length; i++) {
      const celdas = $p(filas[i]).find('td')
      if (celdas.length < 6) continue

      const codigo = clean($p(celdas[2]).text())
      const grado = clean($p(celdas[3]).text())
      const nombreRaw = clean($p(celdas[4]).text())
      const dni = clean($p(celdas[5]).text()) || null

      let apellidos: string, nombres: string
      if (nombreRaw.includes(',')) {
        [apellidos, nombres] = nombreRaw.split(',', 2).map((s) => s.trim())
      } else {
        apellidos = nombreRaw
        nombres = ''
      }

      const fullName = `${apellidos}, ${nombres}`
      const grade = mapGrade(grado)

      const existing = await db.query.profiles.findFirst({
        where: eq(profiles.codigoCgbvp, codigo),
      })

      if (existing) {
        await db.update(profiles).set({
          fullName, grade, dni: dni || existing.dni, updatedAt: new Date(),
        }).where(eq(profiles.id, existing.id))
      } else {
        await db.insert(profiles).values({
          codigoCgbvp: codigo, fullName, grade, dni, status: 'activo',
        })
        nuevos++
      }
      total++
    }

    log(`  Página ${pagina}/${totalPaginas} — ${filas.length} filas`)
  }

  log(`Bomberos: ${total} procesados | ${nuevos} nuevos`)
}
