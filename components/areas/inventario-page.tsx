import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AREAS_META, type AreaKey } from '@/lib/areas/get-areas-hub'
import { getAreaBaseData } from '@/lib/areas/get-area-base-data'
import { getAreaInventory } from '@/lib/areas/get-area-inventory'
import { createInventoryItemAction } from '@/lib/actions/inventory-actions'
import { AreaHero } from './area-hero'
import { InventarioClient } from './inventario-client'

const AREA_KEY_TO_SLUG: Record<AreaKey, string> = {
  maquinas:            'maquinas',
  servicios_generales: 'servicios-generales',
  instruccion:         'instruccion',
  prehospitalaria:     'prehospitalaria',
  administracion:      'administracion',
  imagen:              'imagen',
  jefatura:            'jefatura',
}

interface Props {
  areaKey: AreaKey
}

export async function AreaInventarioPage({ areaKey }: Props) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [baseData, { items }] = await Promise.all([
    getAreaBaseData(areaKey),
    getAreaInventory(areaKey),
  ])

  const areaSlug = AREA_KEY_TO_SLUG[areaKey]
  const createAction = createInventoryItemAction.bind(null, areaKey)

  return (
    <div className="max-w-[1400px]">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link
          href={`/areas/${areaSlug}`}
          className="btn btn--ghost btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
          Volver al tablero
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>·</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Inventario
        </span>
      </div>

      <AreaHero areaKey={areaKey} jefeArea={baseData.jefeArea} />

      <div style={{ marginTop: 20 }}>
        <InventarioClient
          items={items}
          areaSlug={areaSlug}
          createAction={createAction}
        />
      </div>
    </div>
  )
}
