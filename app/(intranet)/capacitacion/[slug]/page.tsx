import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { getCourseDetail } from '@/lib/capacitacion/get-capacitacion-data'
import { CourseDetail } from '@/components/capacitacion/course-detail'

export const dynamic = 'force-dynamic'

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const session = await auth()
  if (!session?.user?.profileId) redirect('/login')

  const { slug } = await params
  const detail = await getCourseDetail(slug, session.user.profileId)

  if (!detail) {
    return (
      <div className="max-w-[1400px]">
        <div className="qr-scan-state">
          <div className="qr-scan-state-icon qr-scan-state-icon--error">
            <AlertCircle className="w-9 h-9" strokeWidth={1.4} />
          </div>
          <h2 className="qr-scan-state-title">Curso no encontrado</h2>
          <p className="qr-scan-state-text">
            El curso que busca no existe o fue retirado del catálogo.
          </p>
          <div style={{ marginTop: 16 }}>
            <Link
              href="/capacitacion"
              className="btn btn--ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.8} />
              Volver a Capacitación
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px]">
      <CourseDetail detail={detail} />
    </div>
  )
}
