import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { profiles, cgbvpAttendance, cgbvpStatusHistory, emergencies, emergencyVehicles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const SYNC_SECRET = process.env.SCRAPPER_SYNC_SECRET || 'change-me'

function auth(req: NextRequest) {
  return req.headers.get('x-sync-token') === SYNC_SECRET
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { action, data } = await req.json()

  try {
    switch (action) {
      case 'upsert_bombero': {
        const fullName = `${data.apellidos}, ${data.nombres}`
        const existing = await db.query.profiles.findFirst({ where: eq(profiles.codigoCgbvp, data.codigo) })
        if (existing) {
          await db.update(profiles).set({ fullName, grade: mapGrade(data.grado), dni: data.dni || existing.dni, updatedAt: new Date() }).where(eq(profiles.id, existing.id))
        } else {
          await db.insert(profiles).values({ codigoCgbvp: data.codigo, fullName, grade: mapGrade(data.grado), dni: data.dni, status: 'activo' })
        }
        return NextResponse.json({ ok: true })
      }
      case 'update_status': {
        const profile = await db.query.profiles.findFirst({ where: eq(profiles.codigoCgbvp, data.codigo) })
        if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        await db.update(profiles).set({ status: mapStatus(data.estado_nuevo), updatedAt: new Date() }).where(eq(profiles.id, profile.id))
        await db.insert(cgbvpStatusHistory).values({ profileId: profile.id, estadoAnterior: data.estado_anterior, estadoNuevo: data.estado_nuevo, fuente: 'scraper' })
        return NextResponse.json({ ok: true })
      }
      case 'upsert_attendance': {
        const profile = await db.query.profiles.findFirst({ where: eq(profiles.codigoCgbvp, data.codigo) })
        if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        await db.insert(cgbvpAttendance).values({
          profileId: profile.id, mes: data.mes, anio: data.anio,
          diasAsistidos: data.dias_asistidos, diasGuardia: data.dias_guardia,
          horasAcumuladas: data.horas_acumuladas, numEmergencias: data.num_emergencias,
        }).onConflictDoUpdate({
          target: [cgbvpAttendance.profileId, cgbvpAttendance.mes, cgbvpAttendance.anio],
          set: { diasAsistidos: data.dias_asistidos, diasGuardia: data.dias_guardia, horasAcumuladas: data.horas_acumuladas, numEmergencias: data.num_emergencias, updatedAt: new Date() },
        })
        return NextResponse.json({ ok: true })
      }
      case 'upsert_emergency': {
        const [emergency] = await db.insert(emergencies).values({
          numeroParte: data.numero_parte, tipo: data.tipo, estado: data.estado,
          fechaDespacho: data.fecha_despacho ? new Date(data.fecha_despacho) : null,
          direccion: data.direccion, distrito: data.distrito,
        }).onConflictDoUpdate({
          target: emergencies.numeroParte,
          set: { estado: data.estado, updatedAt: new Date() },
        }).returning()
        if (data.vehiculos) {
          for (const v of data.vehiculos) {
            await db.insert(emergencyVehicles).values({ emergencyId: emergency.id, codigoVehiculo: v.codigo, nombreVehiculo: v.nombre }).onConflictDoNothing()
          }
        }
        return NextResponse.json({ ok: true, id: emergency.id })
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function mapGrade(g: string): string {
  const m: Record<string, string> = { 'ASPIRANTE': 'aspirante', 'SECCIONARIO': 'seccionario', 'SUB TENIENTE': 'subteniente', 'TENIENTE': 'teniente', 'CAPITAN': 'capitan', 'TENIENTE BRIGADIER': 'teniente_brigadier', 'BRIGADIER': 'brigadier', 'BRIGADIER MAYOR': 'brigadier_mayor', 'BRIGADIER GENERAL': 'brigadier_general' }
  return m[g.toUpperCase()] || 'aspirante'
}
function mapStatus(s: string): string {
  const m: Record<string, string> = { 'ACTIVO': 'activo', 'RESERVA': 'reserva', 'LICENCIA': 'licencia', 'RETIRADO': 'retirado' }
  return m[s.toUpperCase()] || 'activo'
}
