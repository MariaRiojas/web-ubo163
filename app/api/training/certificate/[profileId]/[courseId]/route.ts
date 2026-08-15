import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand } from '@/lib/db/dynamodb'
import { getDownloadPresignedUrl } from '@/lib/storage/s3'
import type { Permission } from '@/lib/auth/permissions'
import type { TrainingCertificate } from '@/lib/db/schema/training'

/**
 * Devuelve una URL prefirmada para descargar el certificado PDF de un efectivo.
 * Acceso: el instructor (training.manage / training.issue_certificate) o el
 * propio efectivo dueño del certificado.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string; courseId: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { profileId, courseId } = await params
  const permissions = (session.user.permissions ?? []) as Permission[]
  const isManager =
    permissions.includes('training.manage') || permissions.includes('training.issue_certificate')
  const isOwner = session.user.profileId === profileId
  if (!isManager && !isOwner) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const res = await ddb.send(new GetCommand({
    TableName: TABLE.trainingCertificates,
    Key: { profileId, certificateId: `cert-${courseId}` },
  }))
  if (!res.Item) return NextResponse.json({ error: 'Certificado no encontrado' }, { status: 404 })
  const cert = res.Item as TrainingCertificate

  const url = await getDownloadPresignedUrl(cert.fileKey, 3600)
  return NextResponse.json({ url })
}
