import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getAllSiteContent } from '@/lib/site-content/get-content'
import { EDITABLE_BLOCKS } from '@/lib/db/schema/site-content'
import { ContenidoWebClient } from './contenido-web-client'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function ContenidoWebPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes('content.manage') && !perms.includes('area.image.view')) {
    redirect('/areas')
  }
  const canManage = perms.includes('content.manage')

  const stored = await getAllSiteContent()
  const blocks = EDITABLE_BLOCKS.map(b => ({ ...b, currentHtml: stored[b.key] ?? b.defaultHtml, edited: stored[b.key] !== undefined }))

  return (
    <div className="max-w-[1400px]">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href="/areas/imagen" className="btn btn--ghost btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
          Volver al tablero
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>·</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Contenido Web
        </span>
      </div>

      <ContenidoWebClient blocks={blocks} canManage={canManage} />
    </div>
  )
}
