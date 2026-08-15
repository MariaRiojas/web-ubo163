import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Shirt, AlertTriangle } from 'lucide-react'
import { getAreaBaseData } from '@/lib/areas/get-area-base-data'
import { getServiciosGeneralesExtraData } from '@/lib/areas/get-servicios-generales-data'
import { AreaHero } from '@/components/areas/area-hero'
import { AreaBaseClient } from '@/components/areas/area-base-client'
import { EppAssignmentsPanel } from '@/components/areas/epp-assignments-panel'

export const dynamic = 'force-dynamic'

export default async function AreaServiciosGeneralesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [data, extra] = await Promise.all([
    getAreaBaseData('servicios_generales'),
    getServiciosGeneralesExtraData(),
  ])

  const perms = (session.user.permissions ?? []) as string[]
  const canManageInbox = perms.some(p => p.startsWith('area.') && p.endsWith('.manage'))

  return (
    <div className="max-w-[1400px]">
      <AreaHero areaKey="servicios_generales" jefeArea={data.jefeArea} />

      <AreaBaseClient
        data={data}
        canManageInbox={canManageInbox}
        customPanel={{
          key: 'epp',
          label: 'EPP asignados',
          icon: <Shirt className="w-3.5 h-3.5" strokeWidth={1.8} />,
          count: extra.totalEppAssigned,
          node: (
            <EppAssignmentsPanel
              assignments={extra.eppAssignments}
              totalAssigned={extra.totalEppAssigned}
              nearReplacement={extra.eppNearReplacement}
            />
          ),
        }}
      />
    </div>
  )
}
