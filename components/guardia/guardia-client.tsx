"use client"

import { useState } from 'react'
import { User, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GuardiaData } from '@/lib/guardia-nocturna/get-guardia-data'
import { VistaEfectivo } from './vista-efectivo'
import { VistaJefe } from './vista-jefe'

export function GuardiaNocturnaClient({
  data,
  canManage,
}: {
  data: GuardiaData
  canManage: boolean
}) {
  const [view, setView] = useState<'efectivo' | 'jefe'>('efectivo')

  return (
    <>
      {canManage && (
        <div className="view-switcher">
          <span className="view-switcher-label">Vista:</span>
          <button
            type="button"
            className={cn('view-switch-btn', view === 'efectivo' && 'view-switch-btn--active')}
            onClick={() => setView('efectivo')}
          >
            <User className="w-3.5 h-3.5" strokeWidth={1.6} />
            Vista del efectivo
          </button>
          <button
            type="button"
            className={cn('view-switch-btn', view === 'jefe' && 'view-switch-btn--active')}
            onClick={() => setView('jefe')}
          >
            <Shield className="w-3.5 h-3.5" strokeWidth={1.6} />
            Vista del Jefe de Guardia
          </button>
        </div>
      )}

      {view === 'efectivo' && <VistaEfectivo data={data} />}
      {view === 'jefe' && canManage && <VistaJefe data={data} />}
    </>
  )
}
