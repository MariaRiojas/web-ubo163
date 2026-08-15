"use client"

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Upload, Trash2, FileText, Search,
  ExternalLink, Loader2, Pencil, X, Check,
} from 'lucide-react'

const CATEGORIES = [
  { value: 'reglamentos',       label: 'Reglamentos' },
  { value: 'manuales',          label: 'Manuales' },
  { value: 'procedimientos',    label: 'Procedimientos' },
  { value: 'normativa_externa', label: 'Normativa externa' },
  { value: 'fichas_tecnicas',   label: 'Fichas técnicas' },
  { value: 'general',           label: 'General' },
]

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.label])
)

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatMime(mime: string | null): string {
  if (!mime) return 'ARCHIVO'
  if (mime.includes('pdf')) return 'PDF'
  if (mime.includes('word')) return 'DOCX'
  if (mime.includes('excel') || mime.includes('sheet')) return 'XLSX'
  if (mime.includes('powerpoint') || mime.includes('presentation')) return 'PPTX'
  return mime.split('/')[1]?.toUpperCase() ?? 'ARCHIVO'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

type LibraryDoc = {
  docId: string
  title: string
  description?: string | null
  category: string
  fileKey: string
  fileName: string
  fileSizeBytes?: number | null
  mimeType?: string | null
  uploadedAt: string
}

type UploadStep = 'idle' | 'presigning' | 'uploading' | 'saving' | 'done'

export function InstruccionBibliotecaClient({
  initialDocs,
  canManage,
}: {
  initialDocs: LibraryDoc[]
  canManage: boolean
}) {
  const [docs, setDocs]         = useState<LibraryDoc[]>(initialDocs)
  const [search, setSearch]     = useState('')
  const [filterCat, setFilterCat] = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', category: 'general' })
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Inline edit state
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editForm, setEditForm]     = useState({ title: '', description: '', category: 'general' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError]   = useState<string | null>(null)

  // Opening state per doc
  const [openingId, setOpeningId] = useState<string | null>(null)

  const filtered = docs.filter(d => {
    if (filterCat !== 'todos' && d.category !== filterCat) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return d.title?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q)
    }
    return true
  })

  // Count per category for chips
  const catCounts = docs.reduce<Record<string, number>>((acc, d) => {
    acc[d.category] = (acc[d.category] ?? 0) + 1
    return acc
  }, {})

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !form.title || !form.category) return
    setUploadError(null)

    // Use client-generated UUID so S3 key prefix matches the docId saved in DB
    const docId = crypto.randomUUID()

    try {
      setUploadStep('presigning')
      const presignRes = await fetch('/api/storage/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'library',
          filename: file.name,
          contentType: file.type,
          resourceId: docId,
          sizeBytes: file.size,
        }),
      })
      if (!presignRes.ok) {
        const err = await presignRes.json()
        setUploadError(err.error ?? 'Error al generar URL de subida')
        setUploadStep('idle')
        return
      }
      const { presignedUrl, key } = await presignRes.json()

      setUploadStep('uploading')
      const s3Res = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!s3Res.ok) {
        setUploadError('Error al subir el archivo a S3')
        setUploadStep('idle')
        return
      }

      setUploadStep('saving')
      const saveRes = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId,
          title: form.title,
          description: form.description || null,
          category: form.category,
          fileKey: key,
          fileName: file.name,
          fileSizeBytes: file.size,
          mimeType: file.type,
        }),
      })
      if (!saveRes.ok) {
        const err = await saveRes.json()
        setUploadError(err.error ?? 'Error al guardar el documento')
        setUploadStep('idle')
        return
      }

      const newDoc: LibraryDoc = {
        docId,
        title: form.title,
        description: form.description || null,
        category: form.category,
        fileKey: key,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      }
      setDocs(prev => [newDoc, ...prev])
      setForm({ title: '', description: '', category: 'general' })
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setUploadStep('done')
      setTimeout(() => { setUploadStep('idle'); setShowForm(false) }, 800)
    } catch {
      setUploadError('Error inesperado. Intenta nuevamente.')
      setUploadStep('idle')
    }
  }

  async function handleDelete(docId: string, title: string) {
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/library/${docId}`, { method: 'DELETE' })
    if (res.ok) {
      setDocs(prev => prev.filter(d => d.docId !== docId))
    }
  }

  async function handleOpen(docId: string) {
    if (openingId) return
    setOpeningId(docId)
    try {
      const res = await fetch(`/api/library/${docId}`)
      if (!res.ok) return
      const { url } = await res.json()
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setOpeningId(null)
    }
  }

  function startEdit(doc: LibraryDoc) {
    setEditingId(doc.docId)
    setEditForm({ title: doc.title, description: doc.description ?? '', category: doc.category })
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  async function saveEdit(docId: string) {
    if (!editForm.title || !editForm.category) return
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/library/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          category: editForm.category,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setEditError(err.error ?? 'Error al guardar')
        return
      }
      setDocs(prev => prev.map(d =>
        d.docId === docId
          ? { ...d, title: editForm.title, description: editForm.description || null, category: editForm.category }
          : d
      ))
      setEditingId(null)
    } finally {
      setEditSaving(false)
    }
  }

  const uploading = uploadStep !== 'idle' && uploadStep !== 'done'

  const uploadLabel: Record<UploadStep, string> = {
    idle: 'Subir',
    presigning: 'Preparando…',
    uploading: 'Subiendo archivo…',
    saving: 'Guardando…',
    done: '¡Listo!',
  }

  const field: React.CSSProperties = {
    width: '100%', padding: '8px 12px', fontSize: 13,
    background: 'var(--ink-black)', border: '1px solid var(--ink-line)',
    color: 'var(--bone)', borderRadius: 2, boxSizing: 'border-box',
  }

  const inlineField: React.CSSProperties = {
    ...field, padding: '5px 8px', fontSize: 12,
  }

  return (
    <div>
      {/* Header */}
      <header style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <Link href="/areas/instruccion" className="btn btn--ghost btn--sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
            Volver a Instrucción
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--graphite)', textTransform: 'uppercase', marginBottom: 4 }}>
              INSTRUCCIÓN · BIBLIOTECA
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, color: 'var(--bone)', letterSpacing: '-0.015em' }}>
              Biblioteca institucional
            </h1>
            <p style={{ color: 'var(--steel)', fontSize: 13, marginTop: 4 }}>
              {docs.length} documento{docs.length !== 1 ? 's' : ''} — reglamentos, manuales, procedimientos y más
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => { setShowForm(v => !v); setUploadError(null) }}
              className="btn btn--primary btn--sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Upload className="w-3.5 h-3.5" strokeWidth={2} />
              {showForm ? 'Cancelar' : 'Subir documento'}
            </button>
          )}
        </div>
      </header>

      {/* Formulario de subida */}
      {showForm && canManage && (
        <form onSubmit={handleUpload} style={{
          background: 'var(--ink-deep)', border: '1px solid var(--ink-line)',
          borderRadius: 4, padding: 20, marginBottom: 24,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--brass)', textTransform: 'uppercase', marginBottom: 16 }}>
            NUEVO DOCUMENTO
          </div>

          {uploadError && (
            <div style={{
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 3, padding: '8px 12px', marginBottom: 14,
              color: 'var(--red-163)', fontSize: 12,
            }}>
              {uploadError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>TÍTULO *</label>
              <input style={field} value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required placeholder="Ej. Reglamento Interno 2024" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>CATEGORÍA *</label>
              <select style={field} value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>DESCRIPCIÓN</label>
            <input style={field} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descripción breve (opcional)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>
              ARCHIVO * (PDF, DOCX, XLSX, PPTX · máx 20 MB)
            </label>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              onChange={e => setFile(e.target.files?.[0] ?? null)} required
              style={{ ...field, padding: '6px 12px', cursor: 'pointer' }} />
          </div>

          {/* Progress bar */}
          {uploading && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ height: 2, background: 'var(--ink-line)', borderRadius: 1, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: 'var(--brass)',
                  borderRadius: 1,
                  width: uploadStep === 'presigning' ? '20%' : uploadStep === 'uploading' ? '65%' : '90%',
                  transition: 'width 400ms ease',
                }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="submit" disabled={uploading || uploadStep === 'done'}
              className="btn btn--primary btn--sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 140, justifyContent: 'center' }}>
              {uploading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {uploadLabel[uploadStep]}</>
                : uploadStep === 'done'
                  ? <><Check className="w-3.5 h-3.5" /> {uploadLabel.done}</>
                  : <><Upload className="w-3.5 h-3.5" /> Subir</>
              }
            </button>
            {!uploading && uploadStep !== 'done' && (
              <button type="button" onClick={() => { setShowForm(false); setUploadError(null) }}
                className="btn btn--ghost btn--sm">
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterCat('todos')}
            className={`cap-filter-chip${filterCat === 'todos' ? ' cap-filter-chip--active' : ''}`}
            style={{ fontSize: 11 }}
          >
            Todos
            <span style={{ marginLeft: 5, opacity: 0.6 }}>{docs.length}</span>
          </button>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setFilterCat(c.value)}
              className={`cap-filter-chip${filterCat === c.value ? ' cap-filter-chip--active' : ''}`}
              style={{ fontSize: 11 }}>
              {c.label}
              {catCounts[c.value] != null && (
                <span style={{ marginLeft: 5, opacity: 0.6 }}>{catCounts[c.value]}</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--graphite)' }} />
          <input type="text" placeholder="Buscar…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '7px 12px', fontSize: 13, background: 'var(--ink-black)', border: '1px solid var(--ink-line)', color: 'var(--bone)', borderRadius: 2, minWidth: 200, width: 200 }} />
        </div>
      </div>

      {/* Lista de documentos */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 0',
          color: 'var(--steel)', fontSize: 13,
          border: '1px dashed var(--ink-line)', borderRadius: 4,
        }}>
          <FileText style={{ width: 32, height: 32, margin: '0 auto 12px', opacity: 0.3 }} strokeWidth={1.3} />
          <div>{docs.length === 0 ? 'Aún no hay documentos en la biblioteca.' : 'Sin resultados para la búsqueda.'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map(doc => (
            <div key={doc.docId}>
              {editingId === doc.docId ? (
                /* ── Fila de edición inline ── */
                <div style={{
                  background: 'var(--ink-deep)', border: '1px solid var(--brass-deep)',
                  borderRadius: 3, padding: '12px 16px',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <input style={inlineField} value={editForm.title}
                      onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Título" />
                    <select style={inlineField} value={editForm.category}
                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <input style={{ ...inlineField, marginBottom: 8 }} value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Descripción (opcional)" />
                  {editError && (
                    <div style={{ color: 'var(--red-163)', fontSize: 11, marginBottom: 8 }}>{editError}</div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => saveEdit(doc.docId)} disabled={editSaving}
                      className="btn btn--primary btn--sm"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                      {editSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Guardar
                    </button>
                    <button onClick={cancelEdit} className="btn btn--ghost btn--sm" style={{ fontSize: 11 }}>
                      <X className="w-3 h-3" style={{ marginRight: 3 }} />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Fila normal ── */
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: 'var(--ink-deep)', border: '1px solid var(--ink-line)',
                  borderRadius: 3, padding: '12px 16px',
                  transition: 'border-color 120ms',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 3,
                    background: 'rgba(196,160,98,0.08)', border: '1px solid var(--brass-deep)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <FileText className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--brass)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--brass)', textTransform: 'uppercase' }}>
                        {CATEGORY_LABEL[doc.category] ?? doc.category}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)' }}>
                        {formatMime(doc.mimeType ?? null)}{doc.fileSizeBytes ? ` · ${formatSize(doc.fileSizeBytes ?? null)}` : ''}
                      </span>
                    </div>
                    <div style={{ color: 'var(--bone)', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.title}
                    </div>
                    {doc.description && (
                      <div style={{ color: 'var(--steel)', fontSize: 12, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.description}
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', flexShrink: 0 }}>
                    {formatDate(doc.uploadedAt)}
                  </div>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => handleOpen(doc.docId)} title="Abrir / descargar"
                      disabled={openingId === doc.docId}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--bone)', borderRadius: 3 }}>
                      {openingId === doc.docId
                        ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} />
                        : <ExternalLink className="w-4 h-4" strokeWidth={1.8} />
                      }
                    </button>
                    {canManage && (
                      <>
                        <button onClick={() => startEdit(doc)} title="Editar metadatos"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--steel)', borderRadius: 3 }}>
                          <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                        </button>
                        <button onClick={() => handleDelete(doc.docId, doc.title)} title="Eliminar"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--red-163)', borderRadius: 3 }}>
                          <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
