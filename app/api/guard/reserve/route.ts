import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand, PutCommand, QueryCommand, generateId, now } from '@/lib/db/dynamodb'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.profileId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { bedId, bunkId, dormId, date } = await req.json()
    if (!bedId || !bunkId || !dormId || !date) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

    const today = new Date().toISOString().slice(0, 10)
    if (date < today) return NextResponse.json({ error: 'No puede reservar fecha pasada' }, { status: 400 })

    // Verify bed exists
    const { Item: bed } = await ddb.send(new GetCommand({ TableName: TABLE.guardBeds, Key: { bunkId, bedId } }))
    if (!bed) return NextResponse.json({ error: 'Cama no encontrada' }, { status: 404 })
    if (bed.status === 'indisponible') return NextResponse.json({ error: 'Cama fuera de servicio' }, { status: 400 })

    // Verify dormitory gender matches user
    const { Item: dorm } = await ddb.send(new GetCommand({ TableName: TABLE.guardDormitories, Key: { dormId } }))
    const { Item: profile } = await ddb.send(new GetCommand({ TableName: TABLE.profiles, Key: { profileId: session.user.profileId } }))
    if (dorm && profile && profile.gender !== dorm.gender) {
      return NextResponse.json({ error: 'Solo puede reservar camas de su género' }, { status: 403 })
    }

    // Check if bed already reserved for that date
    const { Items: existing } = await ddb.send(new QueryCommand({
      TableName: TABLE.guardReservations,
      IndexName: 'bedId-date-index',
      KeyConditionExpression: 'bedId = :b AND #d = :d',
      ExpressionAttributeNames: { '#d': 'date' },
      ExpressionAttributeValues: { ':b': bedId, ':d': date },
    })).catch(() => ({ Items: [] }))

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Cama ya reservada para esa fecha' }, { status: 409 })
    }

    // Create reservation
    await ddb.send(new PutCommand({
      TableName: TABLE.guardReservations,
      Item: {
        reservationId: generateId(),
        profileId: session.user.profileId,
        bedId,
        bunkId,
        dormId,
        date,
        status: 'activa',
        createdAt: now(),
      },
    }))

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('POST /api/guard/reserve error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
