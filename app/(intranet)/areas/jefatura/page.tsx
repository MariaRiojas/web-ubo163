import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Flame } from 'lucide-react'
import { getAreaBaseData } from '@/lib/areas/get-area-base-data'
import { getJefaturaExtraData } from '@/lib/areas/get-jefatura-data'
import { AreaHero } from '@/components/areas/area-hero'
import { AreaBaseClient } from '@/components/areas/area-base-client'
import { JefaturaPanel } from '@/components/areas/jefatura-panel'

export const dynamic = 'force-dynamic'

export default async function AreaJefaturaPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [data, extra] = await Promise.all([
    getAreaBaseData('jefatura'),
    getJefaturaExtraData(),
  ])

  const alertCount = extra.monthStats.openIncidents + extra.monthStats.openRequests

  return (
    <div className="max-w-[1400px]">
      <AreaHero areaKey="jefatura" jefeArea={data.jefeArea} />

      <AreaBaseClient
        data={data}
        defaultTab="custom"
        customPanel={{
          key: 'operativo',
          label: 'Operativo institucional',
          icon: Flame,
          count: alertCount > 0 ? alertCount : extra.monthStats.emergenciesThisMonth,
          node: <JefaturaPanel extra={extra} />,
        }}
      />
    </div>
  )
}
