/**
 * Scraper del padrón de bomberos — equivalente a bomberos.py
 * Scrapea la lista completa de bomberos de la compañía desde la extranet CGBVP
 * y hace upsert en la tabla profiles via DynamoDB.
 */
import type { Page } from 'puppeteer'
import { ddb, TABLE, QueryCommand, PutCommand, UpdateCommand, generateId, now } from '../db'
import type { Profile } from '../../../lib/db/schema/profiles'
import { parseHtml, clean } from '../utils'
import { log, sleep, getCookies } from '../browser'

const URL = 'https://www.bomberosperu.gob.pe/extranet/DEPA/BOM/BOMBomLis.asp'

const GRADE_MAP: Record<string, string> = {
  'ASPIRANTE': 'aspirante',
  'SECCIONARIO': 'seccionario',
  'SUB TENIENTE': 'subteniente',
  'SUBTENIENTE': 'subteniente',
  'SUBTENIENTE CBP': 'subteniente',
  'TENIENTE': 'teniente',
  'TENIENTE CBP': 'teniente',
  'CAPITAN': 'capitan',
  'CAPITÁN': 'capitan',
  'CAPITAN CBP': 'capitan',
  'CAPITÁN CBP': 'capitan',
  'TENIENTE BRIGADIER': 'teniente_brigadier',
  'TENIENTE BRIGADIER CBP': 'teniente_brigadier',
  'BRIGADIER': 'brigadier',
  'BRIGADIER CBP': 'brigadier',
  'BRIGADIER MAYOR': 'brigadier_mayor',
  'BRIGADIER MAYOR CBP': 'brigadier_mayor',
  'BRIGADIER GENERAL': 'brigadier_general',
  'BRIGADIER GENERAL CBP': 'brigadier_general',
}

function mapGrade(g: string): string {
  const normalized = g.toUpperCase().trim()
  // Intento directo
  if (GRADE_MAP[normalized]) return GRADE_MAP[normalized]
  // Intento sin tildes
  const sinTildes = normalized.replace(/[ÁÉÍÓÚ]/g, (c) => ({ 'Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U' }[c] || c))
  if (GRADE_MAP[sinTildes]) return GRADE_MAP[sinTildes]
  // Intento sin "CBP"
  const sinCbp = normalized.replace(/\s*CBP\s*$/, '').trim()
  if (GRADE_MAP[sinCbp]) return GRADE_MAP[sinCbp]
  // Si tiene código, no es aspirante
  console.log(`[WARN] Grado no mapeado: "${g}" — asignando seccionario por defecto`)
  return 'seccionario'
}

async function findProfileByCodigo(codigo: string): Promise<Profile | null> {
  const { Items } = await ddb.send(new QueryCommand({
    TableName: TABLE.profiles,
    IndexName: 'codigoCgbvp-index',
    KeyConditionExpression: 'codigoCgbvp = :c',
    ExpressionAttributeValues: { ':c': codigo },
    Limit: 1,
  }))
  return (Items?.[0] as Profile | undefined) ?? null
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

      const existing = await findProfileByCodigo(codigo)

      if (existing) {
        const dniValue = dni || existing.dni || undefined
        const updateExpr = dniValue
          ? 'SET fullName = :n, grade = :g, dni = :d, updatedAt = :t'
          : 'SET fullName = :n, grade = :g, updatedAt = :t'
        const exprValues: Record<string, any> = { ':n': fullName, ':g': grade, ':t': now() }
        if (dniValue) exprValues[':d'] = dniValue

        await ddb.send(new UpdateCommand({
          TableName: TABLE.profiles,
          Key: { profileId: existing.profileId },
          UpdateExpression: updateExpr,
          ExpressionAttributeValues: exprValues,
        }))
      } else {
        await ddb.send(new PutCommand({
          TableName: TABLE.profiles,
          Item: {
            profileId: generateId(),
            codigoCgbvp: codigo,
            fullName,
            grade,
            ...(dni ? { dni } : {}),
            status: 'activo',
            createdAt: now(),
            updatedAt: now(),
          },
        }))
        nuevos++
      }
      total++
    }

    log(`  Página ${pagina}/${totalPaginas} — ${filas.length} filas`)
  }

  log(`Bomberos: ${total} procesados | ${nuevos} nuevos`)
}
