"use client"

import {
  Shield, HardHat, Radio, Box, Flame, Hand, ShieldAlert, Package,
  AlertTriangle,
} from 'lucide-react'
import type { PerfilData } from '@/lib/perfil/get-perfil-data'
import type { ComponentType, SVGProps } from 'react'

// Mapa subcategoría → icono del mockup
const SUBCAT_ICON: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  capote_estructural: Flame,
  pantalon_estructural: Shield,
  casco_estructural: HardHat,
  guantes_estructurales: Hand,
  botas_estructurales: ShieldAlert,
  radio_portatil: Radio,
  casillero: Box,
  linterna: Flame,
}

function formatMonthYear(iso: string | Date | null): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${meses[d.getMonth()]} ${d.getFullYear()}`
}

function humanSubcat(subcat: string | null): string {
  if (!subcat) return 'Equipo'
  return subcat
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function EquiposTab({ data }: { data: PerfilData }) {
  const { equipment, equipmentCount, equipmentNearReplacement } = data
  const sixMonths = new Date()
  sixMonths.setMonth(sixMonths.getMonth() + 6)

  return (
    <>
      <div className="equipment-header">
        <div className="equipment-header-stats">
          <div className="eq-stat">
            <strong className="mono">{equipmentCount}</strong> equipos asignados
          </div>
          {equipmentNearReplacement > 0 && (
            <>
              <span className="equipment-sep">·</span>
              <div className="eq-stat">
                <strong className="text-brass mono">{equipmentNearReplacement}</strong>
                {' '}próxim{equipmentNearReplacement === 1 ? 'o' : 'os'} a renovación
              </div>
            </>
          )}
        </div>
        <button className="profile-edit-btn" type="button" title="Disponible en una próxima entrega">
          <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span>Reportar daño o pérdida</span>
        </button>
      </div>

      {equipment.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Package className="w-12 h-12" strokeWidth={1.2} />
          </div>
          <h3 className="empty-state-title">Sin equipos asignados</h3>
          <p className="empty-state-text">
            Los equipos de protección personal (EPP) y otros equipos asignados aparecerán aquí una
            vez que el área de Administración o Servicios Generales los registre en el inventario.
          </p>
        </div>
      ) : (
        <div className="equipment-grid">
          {equipment.map((eq) => {
            const Icon = SUBCAT_ICON[eq.subcategory ?? ''] ?? Box
            const endOfLife = eq.endOfLifeDate ? new Date(eq.endOfLifeDate) : null
            const isNearReplacement = endOfLife && endOfLife < sixMonths
            const cardClass = isNearReplacement ? 'equipment-card equipment-card--warn' : 'equipment-card'
            const statusClass = isNearReplacement
              ? 'equipment-card-status equipment-card-status--warn'
              : 'equipment-card-status equipment-card-status--ok'
            const statusText = isNearReplacement
              ? 'Próxima reposición'
              : eq.condition === 'operativo' ? 'Operativo' : eq.condition

            return (
              <div key={eq.id} className={cardClass}>
                <div className="equipment-card-photo">
                  <Icon
                    className="w-8 h-8"
                    strokeWidth={1.3}
                    style={{ color: isNearReplacement ? 'var(--flame)' : 'var(--brass)' }}
                  />
                </div>
                <div className="equipment-card-body">
                  <div className="equipment-card-subcat">{humanSubcat(eq.subcategory)}</div>
                  <div className="equipment-card-name">
                    {[eq.brand, eq.model].filter(Boolean).join(' · ') || eq.name}
                  </div>

                  <div className="equipment-card-meta">
                    {eq.codigoCbp && (
                      <div className="eq-meta-row">
                        <span className="eq-meta-label">CBP</span>
                        <span className="eq-meta-value mono">{eq.codigoCbp}</span>
                      </div>
                    )}
                    {eq.numeroSerie && !eq.codigoCbp && (
                      <div className="eq-meta-row">
                        <span className="eq-meta-label">SERIE</span>
                        <span className="eq-meta-value mono">{eq.numeroSerie}</span>
                      </div>
                    )}
                    {eq.ubicacionInterna && (
                      <div className="eq-meta-row">
                        <span className="eq-meta-label">UBICACIÓN</span>
                        <span className="eq-meta-value">{eq.ubicacionInterna}</span>
                      </div>
                    )}
                    {endOfLife && (
                      <div className="eq-meta-row">
                        <span className="eq-meta-label">VIDA ÚTIL</span>
                        <span className={`eq-meta-value ${isNearReplacement ? 'eq-meta-value--warn' : ''}`}>
                          hasta {formatMonthYear(endOfLife)}
                          {isNearReplacement && ' · reponer'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={statusClass}>
                    <span className="status-dot-sm" />
                    {statusText}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
