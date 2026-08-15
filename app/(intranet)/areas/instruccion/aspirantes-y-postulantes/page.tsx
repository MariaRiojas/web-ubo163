import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getWorkspaceData } from '@/lib/instruccion/get-workspace-data'
import { AspirantesWorkspace } from './workspace-client'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function AspirantesPostulantesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes('area.instruction.view') && !perms.includes('area.instruction.manage')) {
    redirect('/areas')
  }
  const canManage = perms.includes('area.instruction.manage')
  const data = await getWorkspaceData()

  return (
    <div className="max-w-[1400px]">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href="/areas/instruccion" className="btn btn--ghost btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <ArrowLeft className="w-3 h-3" strokeWidth={1.8} /> Volver al tablero
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>·</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Aspirantes y Postulantes
        </span>
      </div>

      <AspirantesWorkspace data={data} canManage={canManage} />
    </div>
  )
}
