import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUploadPresignedUrl } from '@/lib/storage/s3'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admission/upload  — PÚBLICO pero TIGHTLY CONSTRAINED
 * Emite una URL prefirmada para subir el CERTIJOVEN de una postulación.
 * - Solo PDF.
 * - Máx 10 MB (informativo; el navegador respeta el límite antes de subir).
 * - Key forzada a `admission/{cohortId}/{applicationId}/certijoven.pdf` — el
 *   cliente NO controla la ruta, así que no puede sobrescribir otros objetos.
 * No expone el presign general (que requiere sesión).
 */
const schema = z.object({
  cohortId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  applicationId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  contentType: z.literal('application/pdf'),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Solo se acepta un PDF de hasta 10 MB.' }, { status: 422 })
  }

  const key = `admission/${parsed.data.cohortId}/${parsed.data.applicationId}/certijoven.pdf`
  const uploadUrl = await getUploadPresignedUrl(key, 'application/pdf', 600)

  return NextResponse.json({ uploadUrl, key })
}
