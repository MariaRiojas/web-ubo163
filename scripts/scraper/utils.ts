import * as cheerio from 'cheerio'

export type $ = cheerio.CheerioAPI

export function parseHtml(html: string) {
  return cheerio.load(html)
}

export function clean(text: string): string {
  return text.replace(/\xa0/g, '').replace(/\s+/g, ' ').trim()
}

export function parseFecha(texto: string): Date | null {
  const t = texto.trim()
  // Formatos: "dd/mm/yyyy HH:MM:SS p.m." | "dd/mm/yyyy HH:MM:SS" | "dd/mm/yyyy HH:MM"
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?\s*(AM|PM|a\.?\s*m\.?|p\.?\s*m\.?)?\.?$/i)
  if (!m) return null
  let [, dd, mm, yyyy, hh, min, ss, ampm] = m
  let hour = parseInt(hh)
  if (ampm) {
    const isPM = /p/i.test(ampm)
    if (isPM && hour < 12) hour += 12
    if (!isPM && hour === 12) hour = 0
  }
  return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), hour, parseInt(min), parseInt(ss || '0'))
}

export function toInt(s: string): number | null {
  const n = parseInt(s)
  return isNaN(n) ? null : n
}

/** Fetch con cookies del browser */
export async function fetchWithCookies(url: string, cookies: Record<string, string>): Promise<string> {
  const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookieStr },
  })
  // Detectar encoding latin1 de bomberosperu
  const buf = await res.arrayBuffer()
  return new TextDecoder('latin1').decode(buf)
}
