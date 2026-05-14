import { Shield, Download } from 'lucide-react'
import type { PerfilData } from '@/lib/perfil/get-perfil-data'
import { GRADE_LABEL } from '@/lib/cgbvp/grades'
import { getInitials } from '@/components/intranet/_shared'

const PROFILE_STATUS_LABEL: Record<string, string> = {
  activo: 'En actividad',
  aspirante_en_curso: 'En formación (ESBAS)',
  postulante: 'Postulante',
  reserva: 'En reserva',
  licencia: 'En licencia',
  retirado: 'Retirado',
}

function formatShortDate(iso: string | Date | null): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate().toString().padStart(2, '0')}·${months[d.getMonth()]}·${d.getFullYear()}`
}

export function PerfilHero({ data }: { data: PerfilData }) {
  const { profile } = data
  const gradeLabel = GRADE_LABEL[profile.grade as keyof typeof GRADE_LABEL] ?? profile.grade
  const statusLabel = PROFILE_STATUS_LABEL[profile.status] ?? profile.status
  const initials = getInitials(profile.fullName)

  return (
    <section className="profile-hero">
      <div className="profile-hero-bg">
        {/* Marca de agua — escudo de la UBO */}
        <Shield className="w-full h-full" strokeWidth={0.8} />
      </div>

      <div className="profile-hero-content">
        <div className="profile-avatar">
          <div className="profile-avatar-initials">{initials}</div>
        </div>

        <div className="profile-hero-text">
          <div className="profile-hero-meta">
            <span className="profile-grade-badge">{gradeLabel}</span>
            <span className="profile-meta-sep">·</span>
            <span className="profile-hero-status">
              <span className="status-dot-sm" />
              {statusLabel}
            </span>
          </div>

          <h1 className="profile-hero-name">{profile.fullName}</h1>

          <div className="profile-hero-codes">
            {profile.codigoCgbvp && (
              <div className="profile-hero-code">
                <span className="profile-hero-code-label">CÓDIGO CGBVP</span>
                <span className="profile-hero-code-value mono">{profile.codigoCgbvp}</span>
              </div>
            )}
            {profile.dni && (
              <div className="profile-hero-code">
                <span className="profile-hero-code-label">DNI</span>
                <span className="profile-hero-code-value mono">{profile.dni}</span>
              </div>
            )}
            {profile.joinDate && (
              <div className="profile-hero-code">
                <span className="profile-hero-code-label">INCORPORACIÓN</span>
                <span className="profile-hero-code-value mono">
                  {formatShortDate(profile.joinDate)}
                </span>
              </div>
            )}
            {profile.esbasPromotion && (
              <div className="profile-hero-code">
                <span className="profile-hero-code-label">PROMOCIÓN</span>
                <span className="profile-hero-code-value mono">{profile.esbasPromotion}</span>
              </div>
            )}
          </div>
        </div>

        <div className="profile-hero-actions">
          <button className="profile-edit-btn" title="Descargar legajo institucional en PDF (próximamente)">
            <Download className="w-3.5 h-3.5" />
            <span>Descargar legajo</span>
          </button>
        </div>
      </div>
    </section>
  )
}
