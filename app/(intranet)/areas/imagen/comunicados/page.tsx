import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AreaHero } from '@/components/areas/area-hero'
import { ddb, TABLE, ScanCommand, QueryCommand } from '@/lib/db/dynamodb'
import { ComunicadosClient } from '@/components/areas/comunicados-client'
import type { Permission } from '@/lib/auth/permissions'
import type { Announcement } from '@/lib/db/schema/announcements'
import type { Section } from '@/lib/db/schema/sections'

export const dynamic = 'force-dynamic'

export default async function ComunicadosPage() {
  const session = await auth()
  if (!session?.user?.profileId) redirect('/login')

  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes('area.image.view') && !perms.includes('area.image.manage')) {
    redirect('/areas')
  }

  // Get imagen sectionId
  const { Items: sectionItems } = await ddb.send(new QueryCommand({
    TableName: TABLE.sections,
    IndexName: 'key-index',
    KeyConditionExpression: '#k = :key',
    ExpressionAttributeNames: { '#k': 'key' },
    ExpressionAttributeValues: { ':key': 'imagen' },
    Limit: 1,
  }))
  const section = (sectionItems?.[0] ?? null) as Section | null
  const sectionId = section?.sectionId ?? ''

  // Scan announcements filtered by originSectionId
  let items: Announcement[] = []
  if (sectionId) {
    const { Items } = await ddb.send(new ScanCommand({
      TableName: TABLE.announcements,
      FilterExpression: 'originSectionId = :sid',
      ExpressionAttributeValues: { ':sid': sectionId },
    }))
    items = (Items ?? []) as Announcement[]
  }

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
          Comunicados
        </span>
      </div>

      <AreaHero areaKey="imagen" jefeArea={null} />

      <ComunicadosClient
        initialItems={items}
        canManage={canManage}
        sectionId={sectionId}
        profileId={session.user.profileId as string}
      />
    </div>
  )
}
