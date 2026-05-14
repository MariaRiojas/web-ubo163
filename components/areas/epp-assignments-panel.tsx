"use client"

import { AlertTriangle, Shirt, User } from 'lucide-react'
import type { EppAssignment } from '@/lib/areas/get-servicios-generales-data'

export function EppAssignmentsPanel({
  assignments,
  totalAssigned,
  nearReplacement,
}: {
  assignments: EppAssignment[]
  totalAssigned: number
  nearReplacement: number
}) {
  return (
    <div>
      {/* Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <SummaryCard
          label="TOTAL EPP ASIGNADO"
          value={totalAssigned}
          sub="ítems activos"
        />
        <SummaryCard
          label="EFECTIVOS EQUIPADOS"
          value={assignments.length}
          sub="con al menos 1 EPP"
        />
        <SummaryCard
          label="PRÓXIMA REPOSICIÓN"
          value={nearReplacement}
          sub="vencen en ≤6 meses"
          variant={nearReplacement > 0 ? 'warn' : undefined}
        />
      </div>

      {assignments.length === 0 ? (
        <div className="guardia-empty">
          Aún no hay EPP asignado al personal. Use el módulo de Inventario para asignar items
          con categoría EPP a cada efectivo.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 12,
          }}
        >
          {assignments.map((a) => (
            <EppCard key={a.profileId} assignment={a} />
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label, value, sub, variant,
}: {
  label: string
  value: number
  sub: string
  variant?: 'warn' | 'alert'
}) {
  return (
    <div
      className={`area-kpi ${variant === 'warn' ? 'area-kpi--warn' : variant === 'alert' ? 'area-kpi--alert' : ''}`}
    >
      <div className="area-kpi-label">{label}</div>
      <div className="area-kpi-value mono">{value}</div>
      <div className="area-kpi-sub">{sub}</div>
    </div>
  )
}

function EppCard({ assignment }: { assignment: EppAssignment }) {
  const initials = getInitials(assignment.profileName)
  const name = shortName(assignment.profileName)
  const now = new Date()
  const sixMonths = new Date()
  sixMonths.setMonth(now.getMonth() + 6)

  return (
    <div
      style={{
        background: 'var(--ink-deep)',
        border: '1px solid var(--ink-line)',
        borderRadius: 2,
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
          paddingBottom: 12,
          borderBottom: '1px solid var(--ink-line-soft)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--red-glow)',
            border: '1px solid var(--red-163)',
            background: 'rgba(220, 38, 38, 0.08)',
            borderRadius: 2,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bone)', marginBottom: 2 }}>
            {name}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--graphite)',
              letterSpacing: '0.04em',
            }}
          >
            {assignment.profileCodigoCgbvp ?? '—'}
          </div>
        </div>
        <div
          style={{
            padding: '4px 8px',
            background: 'rgba(196, 160, 98, 0.08)',
            border: '1px solid var(--brass-deep)',
            borderRadius: 2,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--brass)',
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          {assignment.eppCount} EPP
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {assignment.itemsSample.map((it, idx) => {
          const expired = it.endOfLifeDate ? new Date(it.endOfLifeDate) <= now : false
          const near = it.endOfLifeDate ? (new Date(it.endOfLifeDate) > now && new Date(it.endOfLifeDate) <= sixMonths) : false
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                background: 'var(--ink-black)',
                border: '1px solid var(--ink-line)',
                borderRadius: 2,
                fontSize: 11,
              }}
            >
              <span style={{ color: 'var(--bone)' }}>{it.name}</span>
              {it.endOfLifeDate && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: expired ? 'var(--red-glow)' : near ? 'var(--flame)' : 'var(--steel)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {(expired || near) && <AlertTriangle className="w-3 h-3" strokeWidth={1.8} />}
                  {formatMonthYear(new Date(it.endOfLifeDate))}
                </span>
              )}
            </div>
          )
        })}
        {assignment.eppCount > assignment.itemsSample.length && (
          <div
            style={{
              fontSize: 10,
              color: 'var(--graphite)',
              fontFamily: 'var(--font-mono)',
              paddingLeft: 10,
            }}
          >
            + {assignment.eppCount - assignment.itemsSample.length} más
          </div>
        )}
      </div>
    </div>
  )
}

function getInitials(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length >= 2) {
    const ap = parts[0].trim().split(/\s+/)[0]?.[0] ?? ''
    const nm = parts[1].trim().split(/\s+/)[0]?.[0] ?? ''
    return `${nm}${ap}`.toUpperCase()
  }
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function shortName(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) return fullName
  const apellidos = parts[0].trim().split(/\s+/)[0]
  const nombre = parts[1].trim().split(/\s+/)[0]
  return `${nombre} ${apellidos}`
}

function formatMonthYear(d: Date): string {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${meses[d.getMonth()]} ${d.getFullYear()}`
}
