import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getEmergenciasData } from '@/lib/reportes/get-emergencias-data'
import { EmergenciasClient } from '@/components/reportes/emergencias-client'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function EmergenciasPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes('reports.view_all') && !perms.includes('reports.view_section')) {
    redirect('/dashboard')
  }

  const data = await getEmergenciasData()

  return (
    <div className="max-w-[1400px]">
      <EmergenciasClient data={data} />
    </div>
  )
}
