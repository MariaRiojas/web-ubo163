"use client"

import { AlertTriangle, CheckCircle, Clock, Pill, Stethoscope, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PrehospitalariaExtraData, MedicalItem } from '@/lib/areas/get-prehospitalaria-data'

export function PrehospitalariaPanel({ extra }: { extra: PrehospitalariaExtraData }) {
  const { medicalItems, stats } = extra

  const expired = medicalItems.filter((i) => i.expiryStatus === 'expired')
  const expiringSoon = medicalItems.filter((i) => i.expiryStatus === 'soon')
  const maintenanceIssues = medicalItems.filter(
    (i) => i.maintenanceStatus === 'overdue' || i.maintenanceStatus === 'due',
  )
  const certDue = medicalItems.filter((i) => {
    if (!i.nextCertificationDate) return false
    const d = new Date(i.nextCertificationDate)
    const in30 = new Date()
    in30.setDate(in30.getDate() + 30)
    return d <= in30
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* KPIs summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <MiniKpi label="EQUIPOS MÉDICOS" value={stats.equipos} icon={Stethoscope} />
        <MiniKpi label="MEDICAMENTOS" value={stats.medicamentos} icon={Pill} />
        <MiniKpi label="INSUMOS" value={stats.insumos} icon={Package} />
        <MiniKpi
          label="VENCIDOS"
          value={stats.expiredCount}
          icon={AlertTriangle}
          variant={stats.expiredCount > 0 ? 'alert' : 'ok'}
        />
        <MiniKpi
          label="POR VENCER"
          value={stats.expiringSoonCount}
          icon={Clock}
          variant={stats.expiringSoonCount > 0 ? 'warn' : 'ok'}
        />
        <MiniKpi
          label="MANT. VENCIDO"
          value={stats.maintenanceOverdueCount}
          icon={AlertTriangle}
          variant={stats.maintenanceOverdueCount > 0 ? 'alert' : 'ok'}
        />
      </div>

      {/* Alertas críticas primero */}
      {expired.length > 0 && (
        <AlertSection
          title={`${expired.length} ítem${expired.length === 1 ? '' : 's'} VENCIDO${expired.length === 1 ? '' : 'S'}`}
          items={expired}
          color="var(--red-glow)"
          borderColor="var(--red-163)"
          bg="rgba(220, 38, 38, 0.06)"
          iconColor="var(--red-glow)"
        />
      )}

      {expiringSoon.length > 0 && (
        <AlertSection
          title={`${expiringSoon.length} ítem${expiringSoon.length === 1 ? '' : 's'} por vencer (≤30 días)`}
          items={expiringSoon}
          color="var(--flame)"
          borderColor="rgba(245, 158, 11, 0.4)"
          bg="rgba(245, 158, 11, 0.05)"
          iconColor="var(--flame)"
        />
      )}

      {maintenanceIssues.length > 0 && (
        <section>
          <SectionTitle
            icon={<Clock className="w-4 h-4" strokeWidth={1.6} style={{ color: 'var(--flame)' }} />}
            title="Equipos con mantenimiento pendiente"
          />
          <div className="area-inventory-table-wrapper">
            <table className="area-inventory-table">
              <thead>
                <tr>
                  <th>NOMBRE</th>
                  <th>CÓDIGO</th>
                  <th>UBICACIÓN</th>
                  <th>PRÓX. MANT.</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceIssues.map((item) => (
                  <MedicalTableRow key={item.id} item={item} dateField="maintenance" />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {certDue.length > 0 && (
        <section>
          <SectionTitle
            icon={<CheckCircle className="w-4 h-4" strokeWidth={1.6} style={{ color: 'var(--brass)' }} />}
            title="Equipos con certificación próxima (≤30 días)"
          />
          <div className="area-inventory-table-wrapper">
            <table className="area-inventory-table">
              <thead>
                <tr>
                  <th>NOMBRE</th>
                  <th>CÓDIGO</th>
                  <th>UBICACIÓN</th>
                  <th>PRÓX. CERTIFICACIÓN</th>
                  <th>CONDICIÓN</th>
                </tr>
              </thead>
              <tbody>
                {certDue.map((item) => (
                  <MedicalTableRow key={item.id} item={item} dateField="certification" />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Inventario completo */}
      {medicalItems.length > 0 && expired.length === 0 && expiringSoon.length === 0
        && maintenanceIssues.length === 0 && certDue.length === 0 && (
        <div className="guardia-empty" style={{ color: 'var(--emerald-glow)' }}>
          <CheckCircle className="w-5 h-5" strokeWidth={1.6} style={{ display: 'inline', marginRight: 8 }} />
          Sin alertas activas. {stats.total} ítem{stats.total === 1 ? '' : 's'} en condiciones normales.
        </div>
      )}

      {medicalItems.length === 0 && (
        <div className="guardia-empty">
          Aún no hay inventario médico registrado para esta sección.
          Usa el módulo de Inventario para agregar equipos, medicamentos e insumos con almacén <strong>sanidad</strong>.
        </div>
      )}

      {/* Inventario completo (colapsado como tabla) */}
      {medicalItems.length > 0 && (
        <section>
          <SectionTitle
            icon={<Package className="w-4 h-4" strokeWidth={1.6} style={{ color: 'var(--steel)' }} />}
            title={`Inventario completo (${medicalItems.length} ítems)`}
          />
          <div className="area-inventory-table-wrapper">
            <table className="area-inventory-table">
              <thead>
                <tr>
                  <th>NOMBRE</th>
                  <th>TIPO</th>
                  <th>CANT.</th>
                  <th>LOTE</th>
                  <th>VENCIMIENTO</th>
                  <th>CONDICIÓN</th>
                </tr>
              </thead>
              <tbody>
                {medicalItems.map((item) => (
                  <FullInventoryRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  )
}

// ─── Sub-componentes ───

function MiniKpi({
  label, value, icon: Icon, variant,
}: {
  label: string
  value: number
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  variant?: 'ok' | 'warn' | 'alert'
}) {
  const cls = variant === 'alert' && value > 0
    ? 'area-kpi area-kpi--alert'
    : variant === 'warn' && value > 0
      ? 'area-kpi area-kpi--warn'
      : 'area-kpi'
  return (
    <div className={cls}>
      <div className="area-kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon className="w-3 h-3" strokeWidth={1.8} />
        {label}
      </div>
      <div className="area-kpi-value mono">{value}</div>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h3
      className="faena-section-title"
      style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}
    >
      {icon}
      {title}
    </h3>
  )
}

function AlertSection({
  title, items, color, borderColor, bg, iconColor,
}: {
  title: string
  items: MedicalItem[]
  color: string
  borderColor: string
  bg: string
  iconColor: string
}) {
  return (
    <section>
      <SectionTitle
        icon={<AlertTriangle className="w-4 h-4" strokeWidth={1.6} style={{ color: iconColor }} />}
        title={title}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: bg,
              border: `1px solid ${borderColor}`,
              borderRadius: 2,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bone)', marginBottom: 2 }}>
                {item.name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                {formatCatLabel(item.category)}
                {item.lote && ` · Lote: ${item.lote}`}
                {item.ubicacionInterna && ` · ${item.ubicacionInterna}`}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--brass)' }}>
              {item.codigoCbp ?? '—'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)' }}>
              Cant: {item.quantity} {item.unitMeasure ?? ''}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color }}>
              {item.expirationDate ? formatDate(new Date(item.expirationDate)) : '—'}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function MedicalTableRow({ item, dateField }: { item: MedicalItem; dateField: 'maintenance' | 'certification' }) {
  const dateStr = dateField === 'maintenance' ? item.nextMaintenanceDate : item.nextCertificationDate
  const isOverdue = dateStr ? new Date(dateStr) < new Date() : false
  return (
    <tr>
      <td style={{ fontWeight: 600, color: 'var(--bone)' }}>
        {item.name}
        {item.brand && (
          <div style={{ fontSize: 10, color: 'var(--graphite)', marginTop: 2 }}>
            {[item.brand, item.model].filter(Boolean).join(' · ')}
          </div>
        )}
      </td>
      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--brass)', fontSize: 11 }}>
        {item.codigoCbp ?? '—'}
      </td>
      <td style={{ fontSize: 11, color: 'var(--steel)' }}>
        {item.ubicacionInterna ?? item.almacenReferencia ?? '—'}
      </td>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isOverdue ? 'var(--red-glow)' : 'var(--flame)', fontWeight: 600 }}>
        {dateStr ? formatDate(new Date(dateStr)) : '—'}
        {isOverdue && ' · VENCIDO'}
      </td>
      <td>
        <span className={`area-inventory-condicion area-inventory-condicion--${item.condition}`}>
          {formatCond(item.condition)}
        </span>
      </td>
    </tr>
  )
}

function FullInventoryRow({ item }: { item: MedicalItem }) {
  const expiryColor = item.expiryStatus === 'expired' ? 'var(--red-glow)'
    : item.expiryStatus === 'soon' ? 'var(--flame)'
    : 'var(--steel)'
  return (
    <tr>
      <td style={{ fontWeight: 600, color: 'var(--bone)' }}>
        {item.name}
        {(item.brand || item.model) && (
          <div style={{ fontSize: 10, color: 'var(--graphite)', marginTop: 2 }}>
            {[item.brand, item.model].filter(Boolean).join(' · ')}
          </div>
        )}
      </td>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {formatCatLabel(item.category)}
      </td>
      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--bone)' }}>
        {item.quantity} {item.unitMeasure ?? ''}
      </td>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)' }}>
        {item.lote ?? '—'}
      </td>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: expiryColor, fontWeight: item.expiryStatus !== 'ok' && item.expiryStatus !== 'none' ? 600 : 400 }}>
        {item.expirationDate ? formatDate(new Date(item.expirationDate)) : '—'}
        {item.expiryStatus === 'expired' && ' · VENCIDO'}
        {item.expiryStatus === 'soon' && ' · PRÓXIMO'}
      </td>
      <td>
        <span className={`area-inventory-condicion area-inventory-condicion--${item.condition}`}>
          {formatCond(item.condition)}
        </span>
      </td>
    </tr>
  )
}

// ─── Utilidades ───

function formatDate(d: Date): string {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate().toString().padStart(2, '0')}·${meses[d.getMonth()]}·${d.getFullYear()}`
}

function formatCond(c: string): string {
  const map: Record<string, string> = {
    operativo: 'Operativo',
    mantenimiento: 'Mantenimiento',
    baja: 'Baja',
    pendiente_revision: 'Revisión',
  }
  return map[c] ?? c
}

function formatCatLabel(cat: string): string {
  const map: Record<string, string> = {
    medico: 'Equipo médico',
    medicamento: 'Medicamento',
    insumo_medico: 'Insumo médico',
  }
  return map[cat] ?? cat
}
