"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Table2, GraduationCap, Package, TrendingUp, Award, ArrowUp,
} from 'lucide-react'
import type { PerfilData } from '@/lib/perfil/get-perfil-data'
import { DatosPersonalesTab } from './tabs/datos-personales-tab'
import { FormacionTab } from './tabs/formacion-tab'
import { EquiposTab } from './tabs/equipos-tab'
import { HistorialTab } from './tabs/historial-tab'
import { CondecoracionesTab } from './tabs/condecoraciones-tab'
import { AscensosTab } from './tabs/ascensos-tab'

type TabKey = 'datos' | 'formacion' | 'equipos' | 'historial' | 'condecoraciones' | 'ascensos'

export function PerfilTabs({ data }: { data: PerfilData }) {
  const [active, setActive] = useState<TabKey>('datos')

  const tabs: Array<{
    key: TabKey
    label: string
    icon: typeof Table2
    count?: number
  }> = [
    { key: 'datos', label: 'Datos personales', icon: Table2 },
    { key: 'formacion', label: 'Formación', icon: GraduationCap, count: data.enrolledCourses.length },
    { key: 'equipos', label: 'Equipos asignados', icon: Package, count: data.equipmentCount },
    { key: 'historial', label: 'Historial operativo', icon: TrendingUp },
    { key: 'condecoraciones', label: 'Condecoraciones', icon: Award },
    { key: 'ascensos', label: 'Ascensos', icon: ArrowUp },
  ]

  return (
    <>
      <nav className="profile-tabs">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={cn('profile-tab', active === t.key && 'profile-tab--active')}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
              <span>{t.label}</span>
              {t.count != null && t.count > 0 && (
                <span className="profile-tab-count mono">{t.count}</span>
              )}
            </button>
          )
        })}
      </nav>

      {active === 'datos' && <DatosPersonalesTab data={data} />}
      {active === 'formacion' && <FormacionTab data={data} />}
      {active === 'equipos' && <EquiposTab data={data} />}
      {active === 'historial' && <HistorialTab data={data} />}
      {active === 'condecoraciones' && <CondecoracionesTab />}
      {active === 'ascensos' && <AscensosTab data={data} />}
    </>
  )
}
