import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AreaHero } from '@/components/areas/area-hero'
import { getAreaInventory } from '@/lib/areas/get-area-inventory'
import { InsumosClient } from '@/components/areas/insumos-client'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

const MEDICO_CATEGORIES: { value: string; label: string }[] = [
  { value: 'medicamento', label: 'Medicamentos' },
  { value: 'insumo_medico', label: 'Insumos médicos' },
  { value: 'medico', label: 'Equipo médico' },
]

const MEDICO_CATEGORY_VALUES = new Set(MEDICO_CATEGORIES.map(c => c.value))

export default async function MedicamentosPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes('area.health.view') && !perms.includes('area.health.manage')) {
    redirect('/areas')
  }

  const { items } = await getAreaInventory('prehospitalaria')
  const filtered = items.filter(i => MEDICO_CATEGORY_VALUES.has(i.category))

  return (
    <div className="max-w-[1400px]">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link
          href="/areas/prehospitalaria"
          className="btn btn--ghost btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
          Volver al tablero
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>·</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Medicamentos e Insumos Médicos
        </span>
      </div>

      <AreaHero areaKey="prehospitalaria" jefeArea={null} />

      <InsumosClient
        items={filtered}
        title="Medicamentos e Insumos Médicos"
        categoryGroups={MEDICO_CATEGORIES}
        areaSlug="prehospitalaria"
      />
    </div>
  )
}
