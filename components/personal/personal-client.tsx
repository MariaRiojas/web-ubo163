'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Plus, Pencil, KeyRound, UserX, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { GRADE_LABEL, GRADE_HIERARCHY } from '@/lib/cgbvp/grades'

const GRADES: Record<string, string> = { ...GRADE_LABEL }

const GRADE_GROUPS: { label: string; options: Record<string, string> }[] = [
  {
    label: 'En formación',
    options: { postulante: GRADE_LABEL.postulante, aspirante: GRADE_LABEL.aspirante },
  },
  {
    label: 'Grados CGBVP',
    options: Object.fromEntries(
      GRADE_HIERARCHY.filter(g => g !== 'postulante' && g !== 'aspirante').map(g => [g, GRADE_LABEL[g]])
    ),
  },
]

const STATUSES: Record<string, string> = {
  activo: 'Activo', aspirante_en_curso: 'En ESBAS', postulante: 'Postulante',
  reserva: 'Reserva', licencia: 'Licencia', retirado: 'Retirado',
}

const STATUS_COLORS: Record<string, string> = {
  activo: '#22c55e', aspirante_en_curso: '#3b82f6', postulante: '#8b5cf6',
  reserva: '#f59e0b', licencia: '#f97316', retirado: '#6b7280',
}

const SECTIONS: Record<string, string> = {
  jefatura: 'Jefatura', maquinas: 'Máquinas', instruccion: 'Instrucción',
  administracion: 'Administración', imagen: 'Imagen',
  prehospitalaria: 'Prehospitalaria', servicios_generales: 'Servicios Generales',
}

const PAGE_SIZE = 15

interface Profile {
  profileId: string; firstName: string; lastName: string; fullName: string
  dni: string; email: string; grade: string; status: string; gender: string
  phone: string; birthDate: string; address: string; codigoCgbvp: string
  sectionKey: string; joinDate: string
}

export function PersonalPanel({ canEdit }: { canEdit: boolean }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [editProfile, setEditProfile] = useState<Profile | null>(null)
  const [tempPassword, setTempPassword] = useState('')

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterStatus) params.set('status', filterStatus)
      if (filterSection) params.set('section', filterSection)
      if (filterGrade) params.set('grade', filterGrade)
      const res = await fetch(`/api/personnel?${params}`)
      const data = await res.json()
      setProfiles(data.items || [])
    } catch { setProfiles([]) }
    setLoading(false)
  }, [search, filterStatus, filterSection, filterGrade])

  useEffect(() => { fetchProfiles() }, [fetchProfiles])
  useEffect(() => { setPage(0) }, [search, filterStatus, filterSection, filterGrade])

  const paged = useMemo(() => {
    const start = page * PAGE_SIZE
    return profiles.slice(start, start + PAGE_SIZE)
  }, [profiles, page])

  const totalPages = Math.ceil(profiles.length / PAGE_SIZE)

  const handleResetPassword = async (id: string) => {
    if (!confirm('¿Resetear contraseña de este efectivo?')) return
    const res = await fetch(`/api/personnel/${id}/reset-password`, { method: 'POST' })
    const data = await res.json()
    if (data.tempPassword) setTempPassword(data.tempPassword)
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('¿Marcar como retirado?')) return
    await fetch(`/api/personnel/${id}`, { method: 'DELETE' })
    fetchProfiles()
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar permanentemente a "${name}"? Esta acción no se puede deshacer.`)) return
    await fetch(`/api/personnel/${id}?permanent=true`, { method: 'DELETE' })
    fetchProfiles()
  }

  return (
    <div style={{ padding: '1.5rem 0' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-line)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', border: '1px solid var(--ink-line)', background: 'var(--bone)', color: 'var(--ink-deep)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">Todo estado</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterSection} onChange={e => setFilterSection(e.target.value)} style={selectStyle}>
          <option value="">Toda sección</option>
          {Object.entries(SECTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} style={selectStyle}>
          <option value="">Todo grado</option>
          {Object.entries(GRADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {canEdit && (
          <button onClick={() => setShowCreate(true)} style={btnPrimary}>
            <Plus size={14} /> Nuevo efectivo
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--ink-line)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: 'var(--ink-surface)', color: 'var(--bone)' }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>Grado</th>
              <th style={thStyle}>DNI</th>
              <th style={thStyle}>Sección</th>
              <th style={thStyle}>Estado</th>
              {canEdit && <th style={thStyle}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--steel)' }}>Cargando...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--steel)' }}>Sin resultados</td></tr>
            ) : paged.map((p, i) => (
              <tr key={p.profileId} style={{ borderBottom: '1px solid var(--ink-line)', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                <td style={tdStyle}>{page * PAGE_SIZE + i + 1}</td>
                <td style={tdStyle}>{p.fullName}</td>
                <td style={tdStyle}>{GRADES[p.grade] || p.grade}</td>
                <td style={tdStyle}>{p.dni}</td>
                <td style={tdStyle}>{SECTIONS[p.sectionKey] || '—'}</td>
                <td style={tdStyle}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', fontSize: '0.7rem', border: `1px solid ${STATUS_COLORS[p.status] || '#999'}`, color: STATUS_COLORS[p.status] || '#999' }}>
                    {STATUSES[p.status] || p.status}
                  </span>
                </td>
                {canEdit && (
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <button onClick={() => setEditProfile(p)} style={btnIcon} title="Editar"><Pencil size={14} /></button>
                    <button onClick={() => handleResetPassword(p.profileId)} style={btnIcon} title="Reset contraseña"><KeyRound size={14} /></button>
                    <button onClick={() => handleDeactivate(p.profileId)} style={{ ...btnIcon, color: 'var(--red-163)' }} title="Marcar retirado"><UserX size={14} /></button>
                    <button onClick={() => handleDelete(p.profileId, p.fullName)} style={{ ...btnIcon, color: 'var(--red-163)', opacity: 0.7 }} title="Eliminar permanentemente"><Trash2 size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--steel)' }}>
          <span>{profiles.length} efectivos</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={btnPage}><ChevronLeft size={14} /></button>
            <span>{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={btnPage}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* Temp password display */}
      {tempPassword && <PasswordModal password={tempPassword} onClose={() => setTempPassword('')} />}

      {/* Create modal */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchProfiles() }} />}

      {/* Edit modal */}
      {editProfile && <EditModal profile={editProfile} onClose={() => setEditProfile(null)} onSaved={() => { setEditProfile(null); fetchProfiles() }} />}
    </div>
  )
}

// ─── Password Modal ───
function PasswordModal({ password, onClose }: { password: string; onClose: () => void }) {
  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1rem', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>Contraseña temporal</h3>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', padding: '1rem', background: 'var(--ink-surface)', color: 'var(--bone)', textAlign: 'center', userSelect: 'all' }}>
          {password}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--steel)', marginTop: '0.5rem' }}>Copie esta contraseña. No se mostrará de nuevo.</p>
        <button onClick={onClose} style={{ ...btnPrimary, marginTop: '1rem', width: '100%' }}>Cerrar</button>
      </div>
    </div>
  )
}

// ─── Create Modal ───
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', dni: '', email: '', grade: 'aspirante', gender: 'masculino', phone: '', birthDate: '', address: '', codigoCgbvp: '', sectionKey: '', status: 'activo' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setSaving(true); setError('')
    const res = await fetch('/api/personnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (data.success) onCreated()
    else setError(data.error || 'Error al crear')
    setSaving(false)
  }

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1rem', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>Nuevo efectivo</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Nombres" value={form.firstName} onChange={v => setForm(f => ({ ...f, firstName: v }))} />
          <Field label="Apellidos" value={form.lastName} onChange={v => setForm(f => ({ ...f, lastName: v }))} />
          <Field label="DNI" value={form.dni} onChange={v => setForm(f => ({ ...f, dni: v }))} />
          <Field label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
          <SelectField label="Grado" value={form.grade} onChange={v => setForm(f => ({ ...f, grade: v }))} groups={GRADE_GROUPS} />
          <SelectField label="Género" value={form.gender} onChange={v => setForm(f => ({ ...f, gender: v }))} options={{ masculino: 'Masculino', femenino: 'Femenino' }} placeholder="Seleccionar" />
          <Field label="Teléfono" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
          <Field label="Fecha nac." value={form.birthDate} onChange={v => setForm(f => ({ ...f, birthDate: v }))} type="date" />
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Dirección" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
          </div>
          <Field label="Código CGBVP" value={form.codigoCgbvp} onChange={v => setForm(f => ({ ...f, codigoCgbvp: v }))} />
          <SelectField label="Sección" value={form.sectionKey} onChange={v => setForm(f => ({ ...f, sectionKey: v }))} options={SECTIONS} placeholder="Sin asignar" />
          <SelectField label="Estado" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={STATUSES} />
        </div>
        {error && <p style={{ color: 'var(--red-163)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{error}</p>}
        <p style={{ fontSize: '0.7rem', color: 'var(--steel)', marginTop: '0.75rem' }}>Contraseña por defecto: Bomberos2024!</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={btnPrimary}>{saving ? 'Guardando...' : 'Crear efectivo'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Modal ───
function EditModal({ profile, onClose, onSaved }: { profile: Profile; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(() => {
    // Parse fullName into firstName/lastName if they're empty
    let fn = profile.firstName || ''
    let ln = profile.lastName || ''
    if (!fn && !ln && profile.fullName) {
      const parts = profile.fullName.split(',')
      if (parts.length >= 2) {
        ln = parts[0].trim()
        fn = parts[1].trim()
      } else {
        fn = profile.fullName
      }
    }
    return {
      firstName: fn,
      lastName: ln,
      dni: profile.dni || '',
      email: profile.email || '',
      grade: profile.grade || '',
      gender: profile.gender || '',
      phone: profile.phone || '',
      birthDate: profile.birthDate || '',
      address: profile.address || '',
      codigoCgbvp: profile.codigoCgbvp || '',
      sectionKey: profile.sectionKey || '',
      status: profile.status || 'activo',
    }
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setSaving(true); setError('')
    const res = await fetch(`/api/personnel/${profile.profileId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (data.success) onSaved()
    else setError(data.error || 'Error al guardar')
    setSaving(false)
  }

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1rem', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>Editar: {profile.fullName}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Nombres" value={form.firstName} onChange={v => setForm(f => ({ ...f, firstName: v }))} />
          <Field label="Apellidos" value={form.lastName} onChange={v => setForm(f => ({ ...f, lastName: v }))} />
          <Field label="DNI" value={form.dni} onChange={v => setForm(f => ({ ...f, dni: v }))} />
          <Field label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
          <SelectField label="Grado" value={form.grade} onChange={v => setForm(f => ({ ...f, grade: v }))} groups={GRADE_GROUPS} />
          <SelectField label="Género" value={form.gender} onChange={v => setForm(f => ({ ...f, gender: v }))} options={{ masculino: 'Masculino', femenino: 'Femenino' }} placeholder="Seleccionar" />
          <Field label="Teléfono" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
          <Field label="Fecha nac." value={form.birthDate} onChange={v => setForm(f => ({ ...f, birthDate: v }))} type="date" />
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Dirección" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
          </div>
          <Field label="Código CGBVP" value={form.codigoCgbvp} onChange={v => setForm(f => ({ ...f, codigoCgbvp: v }))} />
          <SelectField label="Sección" value={form.sectionKey} onChange={v => setForm(f => ({ ...f, sectionKey: v }))} options={SECTIONS} placeholder="Sin asignar" />
          <SelectField label="Estado" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={STATUSES} />
        </div>
        {error && <p style={{ color: 'var(--red-163)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={btnPrimary}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Shared field components ───
function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--steel)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle} />
    </div>
  )
}

function SelectField({ label, value, onChange, options, groups, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  options?: Record<string, string>
  groups?: { label: string; options: Record<string, string> }[]
  placeholder?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--steel)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle}>
        {placeholder && <option value="">{placeholder}</option>}
        {groups
          ? groups.map(g => (
              <optgroup key={g.label} label={g.label}>
                {Object.entries(g.options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </optgroup>
            ))
          : Object.entries(options || {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  )
}

// ─── Styles ───
const selectStyle: React.CSSProperties = { padding: '0.5rem', border: '1px solid var(--ink-line)', background: 'var(--bone)', color: 'var(--ink-deep)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', minWidth: 120 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.4rem 0.5rem', border: '1px solid var(--ink-line)', background: 'var(--bone)', color: 'var(--ink-deep)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }
const thStyle: React.CSSProperties = { padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }
const tdStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', color: 'var(--bone)' }
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', background: 'var(--red-163)', color: '#fff', border: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }
const btnSecondary: React.CSSProperties = { padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--ink-line)', color: 'var(--ink-deep)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: 'pointer' }
const btnIcon: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--bone)' }
const btnPage: React.CSSProperties = { background: 'none', border: '1px solid var(--ink-line)', cursor: 'pointer', padding: '4px 6px', display: 'inline-flex', alignItems: 'center' }
const backdrop: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }
const modal: React.CSSProperties = { background: 'var(--bone)', border: '1px solid var(--ink-line)', padding: '1.5rem', width: '90vw', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }
