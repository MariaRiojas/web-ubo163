import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarCheck } from 'lucide-react'
import { getRevisionAsistencias } from '@/lib/instruccion/get-asistencia-data'
import { RevisionAsistenciasClient } from '@/components/instruccion/revision-asistencias-client'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function RevisionAsistenciasPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes('area.instruction.view') && !perms.includes('area.instruction.manage')) {
    redirect('/areas')
  }
  const canManage = perms.includes('area.instruction.manage')
  const data = await getRevisionAsistencias()

  return (
    <div className="max-w-[1400px]">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href="/areas/instruccion" className="btn btn--ghost btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <ArrowLeft className="w-3 h-3" strokeWidth={1.8} /> Volver al tablero
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>·</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Revisión de asistencias
        </span>
      </div>

      <header className="area-hero" style={{ marginBottom: 18 }}>
        <div className="area-hero-seal"><CalendarCheck className="w-6 h-6" strokeWidth={1.6} /></div>
        <div className="area-hero-body">
          <div className="area-hero-ref">ÁREA DE INSTRUCCIÓN · CONTROL DE ASISTENCIA</div>
          <h1 className="area-hero-title">Revisión de asistencias</h1>
          <p className="area-hero-desc">
            Verifica la evidencia fotográfica y la ubicación de cada marcado de postulantes y
            aspirantes. Un registro observado deja de contar para su nota de asistencia.
          </p>
        </div>
      </header>

      <RevisionAsistenciasClient data={data} canManage={canManage} />
    </div>
  )
}
