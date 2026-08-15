import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const SCRAPER_FUNCTION = process.env.SCRAPER_FUNCTION_NAME ?? 'ubo163-dev-scraper'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { scraperType } = await req.json()
    const validTypes = ['bomberos', 'estado-cia', 'partes-cia', 'asistencia-mensual', 'sgo']
    if (!validTypes.includes(scraperType)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }

    await lambda.send(new InvokeCommand({
      FunctionName: SCRAPER_FUNCTION,
      InvocationType: 'Event', // async, no espera resultado
      Payload: JSON.stringify({ scraperType }),
    }))

    return NextResponse.json({ success: true, message: `Sincronización "${scraperType}" iniciada` })
  } catch (error: any) {
    console.error('POST /api/sync/trigger error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
