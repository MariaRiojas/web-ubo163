import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Camera } from 'lucide-react'
import { getAreaBaseData } from '@/lib/areas/get-area-base-data'
import { getImagenExtraData } from '@/lib/areas/get-imagen-data'
import { AreaHero } from '@/components/areas/area-hero'
import { AreaBaseClient } from '@/components/areas/area-base-client'
import { ImagenPanel } from '@/components/areas/imagen-panel'

export const dynamic = 'force-dynamic'

export default async function AreaImagenPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [data, extra] = await Promise.all([
    getAreaBaseData('imagen'),
    getImagenExtraData(),
  ])

  const pendingCount = extra.stats.plannedThisMonth + extra.stats.inProgressThisMonth

  return (
    <div className="max-w-[1400px]">
      <AreaHero areaKey="imagen" jefeArea={data.jefeArea} />

      <AreaBaseClient
        data={data}
        customPanel={{
          key: 'contenido',
          label: 'Contenido y anuncios',
          icon: Camera,
          count: pendingCount > 0 ? pendingCount : undefined,
          node: <ImagenPanel extra={extra} />,
        }}
      />
    </div>
  )
}
