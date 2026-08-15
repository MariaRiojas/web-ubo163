import 'server-only'
import { ddb, TABLE, ScanCommand } from '@/lib/db/dynamodb'
import type { Emergency } from '@/lib/db/schema/emergencies'

export interface NameCount { name: string; value: number }
export interface EmergenciaRow {
  emergencyId: string
  numeroParte: string
  date: string
  hora: string | null
  tipo: string
  distrito: string
  direccion: string
  alMando: string
  estado: string
}

export interface EmergenciasData {
  kpis: {
    total: number
    ultimoMes: number
    promedioMensual: number
    tipoMasFrecuente: string
    distritoMasAtendido: string
    tiempoRespuestaProm: number | null // minutos
    rangoDesde: string | null
    rangoHasta: string | null
  }
  categorias: { incendios: number; medicas: number; rescates: number; otras: number }
  porMes: NameCount[]        // tendencia (cronológico)
  porTipo: NameCount[]       // top tipos
  porDistrito: NameCount[]   // top distritos
  porDiaSemana: NameCount[]  // Dom..Sáb
  porHora: NameCount[]       // 0..23
  alMando: NameCount[]       // ranking liderazgo
  recientes: EmergenciaRow[] // registro de partes (últimas 200)
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Prefijos de grado/cargo a remover del texto "al mando" para normalizar nombres.
// Incluye formas con mojibake (CAPITÁN → "CAPITN"/"CAPIT" tras perder la Á) para
// que el grado se despoje aunque el encoding del scraper esté roto.
const RANK_WORDS = /\b(CAPITANES|CAPITAN|CAPITN|CAPIT|CAP|BRIGADIERES|BRIGADIER|BRIG|SUBTENIENTES|SUBTENIENTE|SUBTTE|SUB\s*TTE|TENIENTES|TENIENTE|TTE|SECCIONARIOS|SECCIONARIO|SECC|ASPIRANTES|ASPIRANTE|MAYOR|GENERAL|CBP|CGBVP|SR|SRA|DON)\b\.?/g

/** Repara mojibake común (Latin-1 leído como UTF-8) y quita el carácter de reemplazo. */
function fixText(s: string): string {
  if (!s) return ''
  return s
    .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í').replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ').replace(/Ã/g, 'Á').replace(/Â/g, '')
    .replace(/�/g, '')  // carácter de reemplazo (byte no decodificable)
    .replace(/\s+/g, ' ').trim()
}

const stripAccents = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Tipo legible de la emergencia. El campo `tipo` casi siempre es genérico
 * ("EMERGENCIA"), mientras que la clasificación real está en `tipoEmergenciaDesc`
 * (ej. "INCENDIO / ESTRUCTURAS / VIVIENDA"). Se usa la 1ª rama de la descripción.
 */
function tipoDe(e: { tipo?: string; tipoEmergenciaDesc?: string }): string {
  const desc = fixText(e.tipoEmergenciaDesc || '').split('/')[0].trim()
  if (desc) return desc
  const t = fixText(e.tipo || '')
  return t && t.toUpperCase() !== 'EMERGENCIA' ? t : 'Sin clasificar'
}

/**
 * Normaliza el texto "al mando" a una clave canónica para deduplicar variantes
 * del mismo oficial (distinto orden de nombres, con/sin grado, encoding).
 * Ej.: "CAPITÁN CBP SANCHEZ ASCENCIO PAOLO CESAR" y "CAP PAOLO CESAR SANCHEZ ASCENCIO"
 * → misma clave (tokens del nombre ordenados alfabéticamente).
 */
function canonicalMando(raw: string): { key: string; display: string } {
  const cleaned = stripAccents(fixText(raw).toUpperCase())
    .replace(RANK_WORDS, ' ')
    .replace(/[^A-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const tokens = cleaned.split(' ').filter(t => t.length > 1)
  const key = [...tokens].sort().join(' ')
  // Display: Título Con Mayúscula Inicial (orden original tras quitar el grado)
  const display = tokens
    .map(t => t.charAt(0) + t.slice(1).toLowerCase())
    .join(' ')
  return { key, display }
}

function topN(map: Map<string, number>, n: number): NameCount[] {
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n)
}

async function scanAll(): Promise<Emergency[]> {
  const items: Emergency[] = []
  let ExclusiveStartKey: Record<string, any> | undefined
  do {
    const res = await ddb.send(new ScanCommand({ TableName: TABLE.emergencies, ExclusiveStartKey }))
    items.push(...((res.Items ?? []) as Emergency[]))
    ExclusiveStartKey = res.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return items
}

export async function getEmergenciasData(): Promise<EmergenciasData> {
  let all: Emergency[] = []
  try {
    all = await scanAll()
  } catch (err) {
    console.error('[getEmergenciasData] error:', err)
  }

  // Solo emergencias PROPIAS de la Compañía (Partes CIA): son las que tienen
  // dirección. Se excluyen los registros de zona (SGO Norte) que solo traen
  // campos mínimos y que inflaban artificialmente los totales (~683/mes vs ~40 real).
  const partes = all.filter(e => (e.direccion ?? '').trim().length > 0)

  const porMes = new Map<string, number>()      // key: YYYY-MM
  const porTipo = new Map<string, number>()
  const porDistrito = new Map<string, number>()
  const porDia = new Array(7).fill(0)
  const porHora = new Array(24).fill(0)
  const alMandoMap = new Map<string, { display: string; value: number }>()
  const respMinutos: number[] = []

  let fechaMin: string | null = null
  let fechaMax: string | null = null

  for (const e of partes) {
    const dateStr = e.date || (e.fechaDespacho ? e.fechaDespacho.slice(0, 10) : '')
    if (dateStr) {
      if (!fechaMin || dateStr < fechaMin) fechaMin = dateStr
      if (!fechaMax || dateStr > fechaMax) fechaMax = dateStr
      const ym = dateStr.slice(0, 7)
      porMes.set(ym, (porMes.get(ym) ?? 0) + 1)
      const d = new Date(dateStr + 'T00:00:00')
      if (!isNaN(d.getTime())) porDia[d.getDay()]++
    }
    if (e.fechaDespacho) {
      const dd = new Date(e.fechaDespacho)
      if (!isNaN(dd.getTime())) porHora[dd.getHours()]++
      if (e.fechaRetorno) {
        const rr = new Date(e.fechaRetorno)
        if (!isNaN(rr.getTime())) {
          const mins = (rr.getTime() - dd.getTime()) / 60000
          if (mins > 0 && mins < 24 * 60) respMinutos.push(mins)
        }
      }
    }
    const tipo = tipoDe(e)
    porTipo.set(tipo, (porTipo.get(tipo) ?? 0) + 1)
    const distrito = fixText(e.distrito || '') || 'Sin especificar'
    porDistrito.set(distrito, (porDistrito.get(distrito) ?? 0) + 1)
    const mandoRaw = (e.alMandoTexto || '').trim()
    if (mandoRaw) {
      const { key, display } = canonicalMando(mandoRaw)
      if (key) {
        const cur = alMandoMap.get(key)
        if (cur) cur.value++
        else alMandoMap.set(key, { display, value: 1 })
      }
    }
  }

  // Serie mensual cronológica (últimos 12 meses con datos)
  const mesesOrdenados = [...porMes.keys()].sort()
  const ultimos12 = mesesOrdenados.slice(-12)
  const porMesArr: NameCount[] = ultimos12.map(ym => {
    const [y, m] = ym.split('-')
    return { name: `${MESES[Number(m) - 1]} ${y.slice(2)}`, value: porMes.get(ym)! }
  })

  const ultimoMesKey = mesesOrdenados[mesesOrdenados.length - 1]
  const ultimoMes = ultimoMesKey ? porMes.get(ultimoMesKey)! : 0
  const promedioMensual = porMes.size > 0 ? Math.round(partes.length / porMes.size) : 0

  const tipoTop = topN(porTipo, 1)[0]?.name ?? '—'
  const distritoTop = topN(porDistrito, 1)[0]?.name ?? '—'
  const tiempoRespuestaProm = respMinutos.length > 0
    ? Math.round(respMinutos.reduce((a, b) => a + b, 0) / respMinutos.length)
    : null

  // Registro reciente (últimas 200 por fecha desc)
  const recientes: EmergenciaRow[] = [...partes]
    .sort((a, b) => (b.fechaDespacho ?? b.date ?? '').localeCompare(a.fechaDespacho ?? a.date ?? ''))
    .slice(0, 200)
    .map(e => ({
      emergencyId: e.emergencyId,
      numeroParte: e.numeroParte,
      date: e.date || (e.fechaDespacho?.slice(0, 10) ?? ''),
      hora: e.fechaDespacho ? new Date(e.fechaDespacho).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : null,
      tipo: tipoDe(e),
      distrito: fixText(e.distrito || '') || '—',
      direccion: fixText(e.direccion || '') || '—',
      alMando: e.alMandoTexto ? canonicalMando(e.alMandoTexto).display : '—',
      estado: fixText(e.estado || '') || '—',
    }))

  const alMando: NameCount[] = [...alMandoMap.values()]
    .map(v => ({ name: v.display, value: v.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  // Categorización operativa (lo que el mando quiere ver)
  const categorias = { incendios: 0, medicas: 0, rescates: 0, otras: 0 }
  for (const e of partes) {
    const t = stripAccents(fixText(`${e.tipo || ''} ${e.tipoEmergenciaDesc || ''}`).toUpperCase())
    if (/INCENDIO|AMAGO|CONATO|FUEGO/.test(t)) categorias.incendios++
    else if (/MEDIC|EMERGENCIA MEDICA|APH|AUXILIO|TRASLADO|PACIENTE|SALUD|SANITAR/.test(t)) categorias.medicas++
    else if (/RESCATE|ATRAPAD|COLAPSO|ALTURA|ACUATIC|VEHICULAR|ACCIDENTE/.test(t)) categorias.rescates++
    else categorias.otras++
  }

  return {
    kpis: {
      total: partes.length,
      ultimoMes,
      promedioMensual,
      tipoMasFrecuente: tipoTop,
      distritoMasAtendido: distritoTop,
      tiempoRespuestaProm,
      rangoDesde: fechaMin,
      rangoHasta: fechaMax,
    },
    categorias,
    porMes: porMesArr,
    porTipo: topN(porTipo, 8),
    porDistrito: topN(porDistrito, 8),
    porDiaSemana: porDia.map((value, i) => ({ name: DIAS[i], value })),
    porHora: porHora.map((value, i) => ({ name: String(i).padStart(2, '0'), value })),
    alMando,
    recientes,
  }
}
