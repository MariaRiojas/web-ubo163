"use client"

import { useState } from 'react'
import { Shield, Phone, User, AlertTriangle, Pencil, Info } from 'lucide-react'
import type { PerfilData } from '@/lib/perfil/get-perfil-data'
import { GRADE_LABEL } from '@/lib/cgbvp/grades'
import { formatLongDate, calcAge, GENDER_LABEL } from '../format'
import { companyConfig } from '@/company.config'

const PROFILE_STATUS_LABEL: Record<string, string> = {
  activo: 'En actividad',
  aspirante_en_curso: 'En formación',
  postulante: 'Postulante',
  reserva: 'En reserva',
  licencia: 'En licencia',
  retirado: 'Retirado',
}

export function DatosPersonalesTab({ data }: { data: PerfilData }) {
  const { profile } = data
  const gradeLabel = GRADE_LABEL[profile.grade as keyof typeof GRADE_LABEL] ?? profile.grade
  const [editingContact, setEditingContact] = useState(false)
  const [editingEmergency, setEditingEmergency] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contactForm, setContactForm] = useState({ phone: profile.phone ?? '', address: profile.address ?? '', personalEmail: profile.personalEmail ?? '' })
  const [emergencyForm, setEmergencyForm] = useState({ emergencyContactName: profile.emergencyContactName ?? '', emergencyContactPhone: profile.emergencyContactPhone ?? '', emergencyContactRelation: profile.emergencyContactRelation ?? '' })

  async function saveContact() {
    setSaving(true)
    await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contactForm) })
    setSaving(false); setEditingContact(false); window.location.reload()
  }
  async function saveEmergency() {
    setSaving(true)
    await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(emergencyForm) })
    setSaving(false); setEditingEmergency(false); window.location.reload()
  }
  const statusLabel = PROFILE_STATUS_LABEL[profile.status] ?? profile.status
  const age = calcAge(profile.birthDate)
  const specialties = (profile.specialties ?? []).filter(Boolean).join(', ')

  return (
    <div className="profile-grid">
      {/* ─── Datos institucionales (solo lectura) ─── */}
      <div className="profile-card">
        <div className="profile-card-bracket profile-card-bracket--tl" />
        <div className="profile-card-bracket profile-card-bracket--tr" />
        <div className="profile-card-bracket profile-card-bracket--bl" />
        <div className="profile-card-bracket profile-card-bracket--br" />

        <div className="profile-card-header">
          <Shield className="w-[18px] h-[18px]" strokeWidth={1.6} />
          <h3>Datos institucionales</h3>
          <span className="profile-card-badge">solo lectura</span>
        </div>

        <div className="profile-field-grid">
          <div className="profile-field">
            <span className="profile-field-label">GRADO</span>
            <span className="profile-field-value">{gradeLabel}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">COMPAÑÍA</span>
            <span className="profile-field-value">
              UBO {companyConfig.id} — {companyConfig.location.district}
            </span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">SITUACIÓN</span>
            <span className={`profile-field-value ${profile.status === 'activo' ? 'profile-field-value--ok' : ''}`}>
              {statusLabel}
            </span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">FECHA DE INCORPORACIÓN</span>
            <span className="profile-field-value mono">{formatLongDate(profile.joinDate)}</span>
          </div>
          {profile.esbasPromotion && (
            <div className="profile-field">
              <span className="profile-field-label">ESCUELA (ESBAS)</span>
              <span className="profile-field-value mono">{profile.esbasPromotion}</span>
            </div>
          )}
          {specialties && (
            <div className="profile-field">
              <span className="profile-field-label">ESPECIALIDADES</span>
              <span className="profile-field-value">{specialties}</span>
            </div>
          )}
        </div>

        <div className="profile-card-note">
          <Info className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.8} />
          <span>
            Estos datos provienen del CGBVP. Para modificarlos, contacte al área de Administración.
          </span>
        </div>
      </div>

      {/* ─── Contacto personal ─── */}
      <div className="profile-card">
        <div className="profile-card-header">
          <Phone className="w-[18px] h-[18px]" strokeWidth={1.6} />
          <h3>Contacto personal</h3>
          <button className="profile-edit-btn" type="button" onClick={() => setEditingContact(!editingContact)}>
            <Pencil className="w-3 h-3" />
            <span>{editingContact ? 'Cancelar' : 'Editar'}</span>
          </button>
        </div>

        {editingContact ? (
          <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label style={{ fontSize: 10, color: 'var(--graphite)', display: 'block', marginBottom: 4 }}>TELÉFONO</label><input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} style={{ width: '100%', height: 32, background: 'var(--ink-surface)', border: '1px solid var(--ink-line)', color: 'var(--bone)', padding: '0 10px', fontSize: 13 }} /></div>
            <div><label style={{ fontSize: 10, color: 'var(--graphite)', display: 'block', marginBottom: 4 }}>DIRECCIÓN</label><input value={contactForm.address} onChange={e => setContactForm(f => ({ ...f, address: e.target.value }))} style={{ width: '100%', height: 32, background: 'var(--ink-surface)', border: '1px solid var(--ink-line)', color: 'var(--bone)', padding: '0 10px', fontSize: 13 }} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button onClick={saveContact} disabled={saving} style={{ height: 30, padding: '0 14px', background: 'var(--red-163)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer' }}>{saving ? 'Guardando...' : 'Guardar'}</button></div>
          </div>
        ) : (
        <div className="profile-field-grid">
          <div className="profile-field">
            <span className="profile-field-label">CORREO</span>
            <span className="profile-field-value">{profile.email ?? '—'}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">TELÉFONO</span>
            <span className="profile-field-value mono">{profile.phone ?? '—'}</span>
          </div>
          {/* La dirección aún no está en el schema; cuando se agregue, reemplazar aquí */}
          <div className="profile-field profile-field--full">
            <span className="profile-field-label">DIRECCIÓN</span>
            <span className="profile-field-value">{profile.address ?? 'Sin registrar'}</span>
          </div>
        </div>
        )}
      </div>

      {/* ─── Información personal ─── */}
      <div className="profile-card">
        <div className="profile-card-header">
          <User className="w-[18px] h-[18px]" strokeWidth={1.6} />
          <h3>Información personal</h3>
        </div>

        <div className="profile-field-grid">
          <div className="profile-field">
            <span className="profile-field-label">FECHA DE NACIMIENTO</span>
            <span className="profile-field-value mono">{formatLongDate(profile.birthDate)}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">EDAD</span>
            <span className="profile-field-value">{age != null ? `${age} años` : '—'}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">GÉNERO</span>
            <span className="profile-field-value">
              {profile.gender ? (GENDER_LABEL[profile.gender] ?? profile.gender) : '—'}
            </span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">TIPO DE SANGRE</span>
            {profile.bloodType ? (
              <span className="profile-field-value profile-field-value--blood mono">
                {profile.bloodType}
              </span>
            ) : (
              <span className="profile-field-value">—</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Contacto de emergencia ─── */}
      <div className="profile-card profile-card--critical">
        <div className="profile-card-header">
          <AlertTriangle
            className="w-[18px] h-[18px]"
            strokeWidth={1.6}
            style={{ color: 'var(--red-glow)' }}
          />
          <h3>Contacto de emergencia</h3>
          <button className="profile-edit-btn" type="button" onClick={() => setEditingEmergency(!editingEmergency)}>
            <Pencil className="w-3 h-3" />
            <span>{editingEmergency ? 'Cancelar' : 'Editar'}</span>
          </button>
        </div>

        {editingEmergency ? (
          <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label style={{ fontSize: 10, color: 'var(--graphite)', display: 'block', marginBottom: 4 }}>NOMBRE</label><input value={emergencyForm.emergencyContactName} onChange={e => setEmergencyForm(f => ({ ...f, emergencyContactName: e.target.value }))} style={{ width: '100%', height: 32, background: 'var(--ink-surface)', border: '1px solid var(--ink-line)', color: 'var(--bone)', padding: '0 10px', fontSize: 13 }} /></div>
            <div><label style={{ fontSize: 10, color: 'var(--graphite)', display: 'block', marginBottom: 4 }}>TELÉFONO</label><input value={emergencyForm.emergencyContactPhone} onChange={e => setEmergencyForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} style={{ width: '100%', height: 32, background: 'var(--ink-surface)', border: '1px solid var(--ink-line)', color: 'var(--bone)', padding: '0 10px', fontSize: 13 }} /></div>
            <div><label style={{ fontSize: 10, color: 'var(--graphite)', display: 'block', marginBottom: 4 }}>RELACIÓN</label><input value={emergencyForm.emergencyContactRelation} onChange={e => setEmergencyForm(f => ({ ...f, emergencyContactRelation: e.target.value }))} placeholder="Ej: Esposa, Padre, Hermano" style={{ width: '100%', height: 32, background: 'var(--ink-surface)', border: '1px solid var(--ink-line)', color: 'var(--bone)', padding: '0 10px', fontSize: 13 }} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button onClick={saveEmergency} disabled={saving} style={{ height: 30, padding: '0 14px', background: 'var(--red-163)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer' }}>{saving ? 'Guardando...' : 'Guardar'}</button></div>
          </div>
        ) : (
        <div className="profile-field-grid">
          <div className="profile-field">
            <span className="profile-field-label">NOMBRE</span>
            <span className="profile-field-value">{profile.emergencyContactName ?? '—'}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">TELÉFONO</span>
            <span className="profile-field-value mono">{profile.emergencyContactPhone ?? '—'}</span>
          </div>
        </div>
        )}

        {!profile.emergencyContactName && (
          <div className="profile-card-note">
            <Info className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.8} />
            <span>
              Se recomienda registrar un contacto de emergencia con al menos un teléfono vigente.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
