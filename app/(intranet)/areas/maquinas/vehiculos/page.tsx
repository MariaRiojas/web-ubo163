import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMaquinasSetupData } from '@/lib/areas/get-maquinas-setup-data'
import { MaquinasSetupClient } from '@/components/areas/maquinas-setup-client'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function MaquinasVehiculosPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!permissions.includes('area.machines.view') && !permissions.includes('area.machines.manage')) {
    redirect('/dashboard')
  }

  const data = await getMaquinasSetupData()

  return (
    <div className="max-w-[1400px]">
      <MaquinasSetupClient data={data} canManage={permissions.includes('area.machines.manage')} />
    </div>
  )
}
