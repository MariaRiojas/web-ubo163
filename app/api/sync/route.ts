import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { ddb, TABLE, GetCommand, PutCommand, UpdateCommand, QueryCommand, generateId, now } from '@/lib/db/dynamodb'
import type { Profile } from '@/lib/db/schema/profiles'
import type { Grade, ProfileStatus } from '@/lib/db/schema/profiles'

const SYNC_SECRET = process.env.SCRAPPER_SYNC_SECRET || 'change-me'

function checkAuth(req: NextRequest) {
  const headerToken = req.headers.get('x-sync-token')
  if (!headerToken) return false

  const headerBuf = Buffer.from(headerToken)
  const secretBuf = Buffer.from(SYNC_SECRET)

  if (headerBuf.length !== secretBuf.length) return false

  return timingSafeEqual(headerBuf, secretBuf)
}

/** Busca un perfil por codigoCgbvp via GSI */
async function findProfileByCodigo(codigo: string): Promise<Profile | null> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE.profiles,
    IndexName: 'codigoCgbvp-index',
    KeyConditionExpression: 'codigoCgbvp = :c',
    ExpressionAttributeValues: { ':c': codigo },
    Limit: 1,
  }))
  return (res.Items?.[0] as Profile | undefined) ?? null
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, data } = await req.json()

  try {
    switch (action) {
      case 'upsert_bombero': {
        const fullName = `${data.apellidos}, ${data.nombres}`
        const grade = mapGrade(data.grado)
        const existing = await findProfileByCodigo(data.codigo)

        if (existing) {
          await ddb.send(new UpdateCommand({
            TableName: TABLE.profiles,
            Key: { profileId: existing.profileId },
            UpdateExpression: 'SET fullName = :n, grade = :g, dni = :d, updatedAt = :t',
            ExpressionAttributeValues: {
              ':n': fullName,
              ':g': grade,
              ':d': data.dni || existing.dni || null,
              ':t': now(),
            },
          }))
        } else {
          await ddb.send(new PutCommand({
            TableName: TABLE.profiles,
            Item: {
              profileId: generateId(),
              codigoCgbvp: data.codigo,
              fullName,
              grade,
              dni: data.dni || undefined,
              status: 'activo' as ProfileStatus,
              createdAt: now(),
              updatedAt: now(),
            },
          }))
        }
        return NextResponse.json({ ok: true })
      }

      case 'update_status': {
        const profile = await findProfileByCodigo(data.codigo)
        if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const newStatus = mapStatus(data.estado_nuevo) as ProfileStatus
        await ddb.send(new UpdateCommand({
          TableName: TABLE.profiles,
          Key: { profileId: profile.profileId },
          UpdateExpression: 'SET #s = :s, updatedAt = :t',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':s': newStatus, ':t': now() },
        }))

        // Registrar historial de estado
        await ddb.send(new PutCommand({
          TableName: TABLE.cgbvpStatus,
          Item: {
            profileId: profile.profileId,
            date: now(),
            estadoAnterior: data.estado_anterior,
            estadoNuevo: data.estado_nuevo,
            fuente: 'scraper',
            createdAt: now(),
          },
        }))
        return NextResponse.json({ ok: true })
      }

      case 'upsert_attendance': {
        const profile = await findProfileByCodigo(data.codigo)
        if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const dateKey = `${data.anio}-${String(data.mes).padStart(2, '0')}`
        await ddb.send(new PutCommand({
          TableName: TABLE.cgbvpAttendance,
          Item: {
            profileId: profile.profileId,
            date: dateKey,
            mes: data.mes,
            anio: data.anio,
            diasAsistidos: data.dias_asistidos,
            diasGuardia: data.dias_guardia,
            horasAcumuladas: data.horas_acumuladas,
            numEmergencias: data.num_emergencias,
            updatedAt: now(),
          },
        }))
        return NextResponse.json({ ok: true })
      }

      case 'upsert_emergency': {
        const emergencyId = `EMG-${data.numero_parte}`
        const date = data.fecha_despacho
          ? data.fecha_despacho.slice(0, 10)
          : new Date().toISOString().slice(0, 10)

        // Obtener vehiculos existentes si queremos merge
        const existing = await ddb.send(new GetCommand({
          TableName: TABLE.emergencies,
          Key: { emergencyId },
        }))

        const vehiculos = data.vehiculos
          ? data.vehiculos.map((v: any) => ({
              codigoVehiculo: v.codigo,
              nombreVehiculo: v.nombre,
            }))
          : (existing.Item?.vehiculos ?? [])

        await ddb.send(new PutCommand({
          TableName: TABLE.emergencies,
          Item: {
            emergencyId,
            numeroParte: data.numero_parte,
            tipo: data.tipo,
            estado: data.estado,
            fechaDespacho: data.fecha_despacho ?? undefined,
            date,
            direccion: data.direccion,
            distrito: data.distrito,
            vehiculos,
            createdAt: existing.Item?.createdAt ?? now(),
            updatedAt: now(),
          },
        }))

        return NextResponse.json({ ok: true, id: emergencyId })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function mapGrade(g: string): Grade {
  const m: Record<string, Grade> = {
    'ASPIRANTE': 'aspirante',
    'SECCIONARIO': 'seccionario',
    'SUB TENIENTE': 'subteniente',
    'TENIENTE': 'teniente',
    'CAPITAN': 'capitan',
    'TENIENTE BRIGADIER': 'teniente_brigadier',
    'BRIGADIER': 'brigadier',
    'BRIGADIER MAYOR': 'brigadier_mayor',
    'BRIGADIER GENERAL': 'brigadier_general',
  }
  return m[g.toUpperCase()] ?? 'aspirante'
}

function mapStatus(s: string): string {
  const m: Record<string, string> = {
    'ACTIVO': 'activo',
    'RESERVA': 'reserva',
    'LICENCIA': 'licencia',
    'RETIRADO': 'retirado',
  }
  return m[s.toUpperCase()] ?? 'activo'
}
