import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAuditFeed } from '@/lib/audit/get-audit'
import { AuditoriaClient } from './auditoria-client'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

/**
 * Visor de la bitácora de auditoría inmutable. Solo Primer Jefe.
 * Gate: `company.manage` — lo tiene el Primer Jefe (ALL_PERMISSIONS) pero NO el
 * Segundo Jefe ni ningún otro cargo.
 */
export default async function AuditoriaPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes('company.manage')) {
    redirect('/dashboard')
  }

  const initial = await getAuditFeed({ limit: 50 })

  return (
    <div className="max-w-[1400px]">
      <AuditoriaClient
        initialItems={initial.items}
        initialCursor={initial.nextCursor}
      />
    </div>
  )
}
