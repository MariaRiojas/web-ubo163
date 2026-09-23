"use client"

import { useState } from 'react'
import Link from 'next/link'
import {
  ClipboardCheck, AlertTriangle, FileText, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FaenaData } from '@/lib/faena/get-faena-data'
import { IncidenciasTab } from './tabs/incidencias-tab'
import { SolicitudesTab } from './tabs/solicitudes-tab'

type TabKey = 'incidencias' | 'solicitudes'

interface SectionOption {
  id: string
  name: string
}

export function FaenaClient({
  data,
  sections,
}: {
  data: FaenaData
  sections: SectionOption[]
}) {
  const [active, setActive] = useState<TabKey>('incidencias')

  const openIncidents = data.myIncidents.filter(
    (i) => i.status === 'pendiente' || i.status === 'en_proceso',
  ).length
  const openRequests = data.myRequests.filter(
    (r) => ['pendiente', 'aprobada', 'en_proceso'].includes(r.status),
  ).length

  return (
    <>
      {/*
        El checklist de unidades vive en Parque Motor, que deriva unidades y
        gabinetes del inventario. La vieja pestaña "Inspecciones" leia las
        tablas machines/machine-compartments/machine-checklists, hoy vacias:
        mostraba siempre una vista muerta. Se deja el acceso senalizado para
        que haya una sola puerta al checklist.
      */}
      <Link
        href="/parque-motor"
        style={{
          display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
          padding: '12px 14px', marginBottom: 16, borderRadius: 4,
          background: 'var(--ink-elevated)', border: '1px solid var(--ink-line)',
          borderLeft: '3px solid var(--brass)',
        }}
      >
        <ClipboardCheck className="w-5 h-5" strokeWidth={1.7} style={{ color: 'var(--brass)', flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', color: 'var(--bone)', fontSize: 13.5, fontWeight: 600 }}>
            Checklist de unidades
          </span>
          <span style={{ display: 'block', color: 'var(--steel)', fontSize: 12, marginTop: 2 }}>
            La revision de maquinas y gabinetes se registra en Parque Motor.
          </span>
        </span>
        <ArrowRight className="w-4 h-4" strokeWidth={1.9} style={{ color: 'var(--steel)', flexShrink: 0 }} />
      </Link>

      <nav className="faena-tabs">
        <button
          type="button"
          className={cn('faena-tab', active === 'incidencias' && 'faena-tab--active')}
          onClick={() => setActive('incidencias')}
        >
          <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span>Mis incidencias</span>
          {openIncidents > 0 && (
            <span className="faena-tab-count mono">{openIncidents}</span>
          )}
        </button>
        <button
          type="button"
          className={cn('faena-tab', active === 'solicitudes' && 'faena-tab--active')}
          onClick={() => setActive('solicitudes')}
        >
          <FileText className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span>Mis solicitudes</span>
          {openRequests > 0 && (
            <span className="faena-tab-count mono">{openRequests}</span>
          )}
        </button>
      </nav>

      {active === 'incidencias' && <IncidenciasTab data={data} sections={sections} />}
      {active === 'solicitudes' && <SolicitudesTab data={data} sections={sections} />}
    </>
  )
}
