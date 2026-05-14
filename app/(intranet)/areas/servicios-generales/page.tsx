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

  return (
    <div className="max-w-[1400px]">
      <AreaHero areaKey="servicios_generales" jefeArea={data.jefeArea} />

      <AreaBaseClient
        data={data}
        customPanel={{
          key: 'epp',
          label: 'EPP asignados',
          icon: Shirt,
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
