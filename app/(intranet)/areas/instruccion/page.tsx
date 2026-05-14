import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { getAreaBaseData } from '@/lib/areas/get-area-base-data'
import { getInstruccionExtraData } from '@/lib/areas/get-instruccion-data'
import { AreaHero } from '@/components/areas/area-hero'
import { AreaBaseClient } from '@/components/areas/area-base-client'
import { InstruccionPanel } from '@/components/areas/instruccion-panel'

export const dynamic = 'force-dynamic'

export default async function AreaInstruccionPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [data, extra] = await Promise.all([
    getAreaBaseData('instruccion'),
    getInstruccionExtraData(),
  ])

  const courseCount = extra.esbasStats
    ? extra.esbasStats.totalEnrolled + extra.topCourses.reduce((a, c) => a + c.totalEnrolled, 0)
    : extra.topCourses.reduce((a, c) => a + c.totalEnrolled, 0)

  return (
    <div className="max-w-[1400px]">
      <AreaHero areaKey="instruccion" jefeArea={data.jefeArea} />

      <AreaBaseClient
        data={data}
        customPanel={{
          key: 'cursos',
          label: 'Cursos y formación',
          icon: GraduationCap,
          count: courseCount,
          node: <InstruccionPanel extra={extra} />,
        }}
      />
    </div>
  )
}
