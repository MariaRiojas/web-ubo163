import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AreaHero } from '@/components/areas/area-hero'
import { ddb, TABLE, ScanCommand } from '@/lib/db/dynamodb'
import { CalendarioClient } from '@/components/areas/calendario-client'
import type { Permission } from '@/lib/auth/permissions'
import type { ContentCalendarItem } from '@/lib/db/schema/content-calendar'

export const dynamic = 'force-dynamic'

export default async function CalendarioPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes('area.image.view') && !perms.includes('area.image.manage')) {
    redirect('/areas')
  }

  const { Items } = await ddb.send(new ScanCommand({ TableName: TABLE.contentCalendar }))
  const items = ((Items ?? []) as ContentCalendarItem[]).sort((a, b) => b.date.localeCompare(a.date))

  const canManage = perms.includes('area.image.manage')

  return (
    <div className="max-w-[1400px]">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link
          href="/areas/imagen"
          className="btn btn--ghost btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
          Volver al tablero
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>·</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Calendario de Contenidos
        </span>
      </div>

      <AreaHero areaKey="imagen" jefeArea={null} />

      <CalendarioClient initialItems={items} canManage={canManage} />
    </div>
  )
}
