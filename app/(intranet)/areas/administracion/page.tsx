import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BarChart2 } from 'lucide-react'
import { getAreaBaseData } from '@/lib/areas/get-area-base-data'
import { getAdministracionExtraData } from '@/lib/areas/get-administracion-data'
import { AreaHero } from '@/components/areas/area-hero'
import { AreaBaseClient } from '@/components/areas/area-base-client'
import { AdministracionPanel } from '@/components/areas/administracion-panel'

export const dynamic = 'force-dynamic'

export default async function AreaAdministracionPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [data, extra] = await Promise.all([
    getAreaBaseData('administracion'),
    getAdministracionExtraData(),
  ])

  return (
    <div className="max-w-[1400px]">
      <AreaHero areaKey="administracion" jefeArea={data.jefeArea} />

      <AreaBaseClient
        data={data}
        customPanel={{
          key: 'admin',
          label: 'Reportería institucional',
          icon: BarChart2,
          count: extra.stats.pendingRequestsCount > 0
            ? extra.stats.pendingRequestsCount
            : undefined,
          node: <AdministracionPanel extra={extra} />,
        }}
      />
    </div>
  )
}
