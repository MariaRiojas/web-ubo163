import 'server-only'
import { ddb, TABLE, ScanCommand, QueryCommand } from '@/lib/db/dynamodb'
import type { Emergency } from '@/lib/db/schema/emergencies'
import { resolveSection } from '@/lib/inventario/get-items'

export interface OperatividadData {
  snapshot: {
    estado: string
    primerJefe: string | null
    segundoJefe: string | null
    vehiculos: { codigo: string; tipo: string; estado: string; motivo?: string }[]
    vehiculosTotal: number
    vehiculosOperativos: number
    personalEnTurno: number
    syncedAt: string | null
  } | null
  guardia: { ocupadas: number; total: number; fecha: string }
  emergencias: {
    esteMes: number
    ultima: { fecha: string; tipo: string; distrito: string; direccion: string } | null
    recientes: { numeroParte: string; fecha: string; tipo: string; distrito: string; direccion: string }[]
  }
  inventario: { area: string; total: number; operativos: number; atencion: number; porcentaje: number }[]
}

const fixText = (s: string) => (s || '').replace(/�/g, '').replace(/\s+/g, ' ').trim()

export async function getOperatividadData(): Promise<OperatividadData> {
  const hoy = new Date().toISOString().slice(0, 10)
  const mesActual = hoy.slice(0, 7)

  // ── Snapshot CGBVP (estado en vivo, puede estar desactualizado) ──
  let snapshot: OperatividadData['snapshot'] = null
  try {
    const { Items = [] } = await ddb.send(new ScanCommand({ TableName: TABLE.cgbvpStatus }))
    const s = (Items as any[]).sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))[0]
    if (s) {
      const vehiculos = (s.vehiculos ?? []).map((v: any) => ({
        codigo: v.codigo ?? '—', tipo: v.tipo ?? '', estado: v.estado ?? 'operativo', motivo: v.motivo,
      }))
      snapshot = {
        estado: s.estado ?? 'operativo',
        primerJefe: s.primerJefe ?? null,
        segundoJefe: s.segundoJefe ?? null,
        vehiculos,
        vehiculosTotal: s.vehiculosTotal ?? vehiculos.length,
        vehiculosOperativos: s.vehiculosOperativos ?? vehiculos.filter((v: any) => v.estado === 'operativo').length,
        personalEnTurno: s.personalEnTurno ?? 0,
        syncedAt: s.timestamp ?? null,
      }
    }
  } catch (err) { console.error('[operatividad] snapshot:', err) }

  // ── Guardia de esta noche ──
  let guardia = { ocupadas: 0, total: 0, fecha: hoy }
  try {
    const [reservas, camas] = await Promise.all([
      ddb.send(new QueryCommand({
        TableName: TABLE.guardReservations,
        KeyConditionExpression: '#d = :hoy',
        ExpressionAttributeNames: { '#d': 'date' },
        ExpressionAttributeValues: { ':hoy': hoy },
      })).catch(() => ({ Items: [] as any[] })),
      ddb.send(new ScanCommand({ TableName: TABLE.guardBeds, Select: 'COUNT' })).catch(() => ({ Count: 0 })),
    ])
    const ocupadas = (reservas.Items ?? []).filter((r: any) => r.status !== 'cancelada').length
    guardia = { ocupadas, total: camas.Count ?? 0, fecha: hoy }
  } catch (err) { console.error('[operatividad] guardia:', err) }

  // ── Emergencias PROPIAS recientes (partes con dirección) ──
  const emergencias: OperatividadData['emergencias'] = { esteMes: 0, ultima: null, recientes: [] }
  try {
    const items: Emergency[] = []
    let ExclusiveStartKey: Record<string, any> | undefined
    do {
      const res = await ddb.send(new ScanCommand({ TableName: TABLE.emergencies, ExclusiveStartKey }))
      items.push(...((res.Items ?? []) as Emergency[]))
      ExclusiveStartKey = res.LastEvaluatedKey
    } while (ExclusiveStartKey)

    const partes = items
      .filter(e => (e.direccion ?? '').trim().length > 0)
      .sort((a, b) => (b.fechaDespacho ?? b.date ?? '').localeCompare(a.fechaDespacho ?? a.date ?? ''))

    emergencias.esteMes = partes.filter(e => (e.date || '').startsWith(mesActual)).length
    emergencias.recientes = partes.slice(0, 6).map(e => ({
      numeroParte: e.numeroParte,
      fecha: e.date || (e.fechaDespacho?.slice(0, 10) ?? ''),
      tipo: fixText(e.tipo || e.tipoEmergenciaDesc || 'Sin clasificar'),
      distrito: fixText(e.distrito || '') || '—',
      direccion: fixText(e.direccion || '') || '—',
    }))
    emergencias.ultima = emergencias.recientes[0]
      ? { fecha: emergencias.recientes[0].fecha, tipo: emergencias.recientes[0].tipo, distrito: emergencias.recientes[0].distrito, direccion: emergencias.recientes[0].direccion }
      : null
  } catch (err) { console.error('[operatividad] emergencias:', err) }

  // ── Operatividad del inventario por área ──
  let inventario: OperatividadData['inventario'] = []
  try {
    const inv: any[] = []
    let ESK: Record<string, any> | undefined
    do {
      const res = await ddb.send(new ScanCommand({
        TableName: TABLE.inventory,
        ProjectionExpression: 'sectionId, #c, active',
        ExpressionAttributeNames: { '#c': 'condition' },
        ExclusiveStartKey: ESK,
      }))
      inv.push(...(res.Items ?? []))
      ESK = res.LastEvaluatedKey
    } while (ESK)

    const porArea = new Map<string, { total: number; operativos: number; atencion: number }>()
    for (const it of inv) {
      if (it.active === false) continue
      const area = resolveSection(it.sectionId ?? '').name
      const cur = porArea.get(area) ?? { total: 0, operativos: 0, atencion: 0 }
      cur.total++
      if (it.condition === 'operativo') cur.operativos++
      else if (it.condition === 'baja') { /* fuera de servicio, no cuenta como atención */ }
      else cur.atencion++
      porArea.set(area, cur)
    }
    inventario = [...porArea.entries()]
      .map(([area, v]) => ({ area, ...v, porcentaje: v.total > 0 ? Math.round((v.operativos / v.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)
  } catch (err) { console.error('[operatividad] inventario:', err) }

  return { snapshot, guardia, emergencias, inventario }
}
