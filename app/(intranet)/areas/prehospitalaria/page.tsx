import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Stethoscope } from 'lucide-react'
import { getAreaBaseData } from '@/lib/areas/get-area-base-data'
import { getPrehospitalariaExtraData } from '@/lib/areas/get-prehospitalaria-data'
import { AreaHero } from '@/components/areas/area-hero'
import { AreaBaseClient } from '@/components/areas/area-base-client'
import { PrehospitalariaPanel } from '@/components/areas/prehospitalaria-panel'

export const dynamic = 'force-dynamic'

export default async function AreaPrehospitalariaPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [data, extra] = await Promise.all([
    getAreaBaseData('prehospitalaria'),
    getPrehospitalariaExtraData(),
  ])

  const alertCount = extra.stats.expiredCount + extra.stats.expiringSoonCount
    + extra.stats.maintenanceOverdueCount

  return (
    <div className="max-w-[1400px]">
      <AreaHero areaKey="prehospitalaria" jefeArea={data.jefeArea} />

      <AreaBaseClient
        data={data}
        customPanel={{
          key: 'medical',
          label: 'Equipos y medicamentos',
          icon: Stethoscope,
          count: alertCount > 0 ? alertCount : extra.stats.total,
          node: <PrehospitalariaPanel extra={extra} />,
        }}
      />
    </div>
  )
}
