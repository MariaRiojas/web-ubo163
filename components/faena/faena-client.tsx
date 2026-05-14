"use client"

import { useState } from 'react'
import {
  ClipboardCheck, AlertTriangle, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FaenaData } from '@/lib/faena/get-faena-data'
import { InspeccionesTab } from './tabs/inspecciones-tab'
import { IncidenciasTab } from './tabs/incidencias-tab'
import { SolicitudesTab } from './tabs/solicitudes-tab'

type TabKey = 'inspecciones' | 'incidencias' | 'solicitudes'

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
  const [active, setActive] = useState<TabKey>('inspecciones')

  const pendingInspections = data.summary.pending
  const openIncidents = data.myIncidents.filter(
    (i) => i.status === 'pendiente' || i.status === 'en_proceso',
  ).length
  const openRequests = data.myRequests.filter(
    (r) => ['pendiente', 'aprobada', 'en_proceso'].includes(r.status),
  ).length

  return (
    <>
      <nav className="faena-tabs">
        <button
          type="button"
          className={cn('faena-tab', active === 'inspecciones' && 'faena-tab--active')}
          onClick={() => setActive('inspecciones')}
        >
          <ClipboardCheck className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span>Inspecciones</span>
          {pendingInspections > 0 && (
            <span className="faena-tab-count mono">{pendingInspections} pendiente{pendingInspections === 1 ? '' : 's'}</span>
          )}
        </button>
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

      {active === 'inspecciones' && <InspeccionesTab data={data} />}
      {active === 'incidencias' && <IncidenciasTab data={data} sections={sections} />}
      {active === 'solicitudes' && <SolicitudesTab data={data} sections={sections} />}
    </>
  )
}
