import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AreaHero } from '@/components/areas/area-hero'
import { getAreaInventory } from '@/lib/areas/get-area-inventory'
import { InsumosClient } from '@/components/areas/insumos-client'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

const INSUMO_CATEGORIES: { value: string; label: string }[] = [
  { value: 'insumo', label: 'Insumos' },
  { value: 'accesorio', label: 'Accesorios' },
  { value: 'mobiliario', label: 'Mobiliario' },
  { value: 'hazmat', label: 'Hazmat' },
]

const INSUMO_CATEGORY_VALUES = new Set(INSUMO_CATEGORIES.map(c => c.value))

export default async function InsumosPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes('area.services.view') && !perms.includes('area.services.manage')) {
    redirect('/areas')
  }

  const { items } = await getAreaInventory('servicios_generales')
  const filtered = items.filter(i => INSUMO_CATEGORY_VALUES.has(i.category))

  return (
    <div className="max-w-[1400px]">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link
          href="/areas/servicios-generales"
          className="btn btn--ghost btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
          Volver al tablero
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>·</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Insumos y Consumibles
        </span>
      </div>

      <AreaHero areaKey="servicios_generales" jefeArea={null} />

      <InsumosClient
        items={filtered}
        title="Insumos y Consumibles"
        categoryGroups={INSUMO_CATEGORIES}
        areaSlug="servicios-generales"
      />
    </div>
  )
}
