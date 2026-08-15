"use client"

import { useState, useMemo } from 'react'
import { FileText, ChevronRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LibraryCardData } from '@/lib/capacitacion/get-capacitacion-data'

const LIBRARY_CATEGORY_LABELS: Record<string, string> = {
  reglamentos: 'Reglamentos',
  manuales: 'Manuales',
  procedimientos: 'Procedimientos',
  normativa_externa: 'Normativa externa',
  fichas_tecnicas: 'Fichas técnicas',
  general: 'General',
}

const LIBRARY_CATEGORY_UPPER: Record<string, string> = {
  reglamentos: 'REGLAMENTOS',
  manuales: 'MANUALES',
  procedimientos: 'PROCEDIMIENTOS',
  normativa_externa: 'NORMATIVA EXTERNA',
  fichas_tecnicas: 'FICHAS TÉCNICAS',
  general: 'GENERAL',
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatMimeType(mime: string | null): string {
  if (!mime) return 'PDF'
  if (mime.includes('pdf')) return 'PDF'
  if (mime.includes('word')) return 'DOCX'
  if (mime.includes('excel') || mime.includes('sheet')) return 'XLSX'
  return mime.split('/')[1]?.toUpperCase() ?? 'ARCHIVO'
}

function formatUploadMonth(d: Date): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return `${meses[d.getMonth()]} ${d.getFullYear()}`
}

export function BibliotecaClient({ library }: { library: LibraryCardData[] }) {
  const [activeCategory, setActiveCategory] = useState<string>('todos')
  const [search, setSearch] = useState('')

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const doc of library) set.add(doc.category)
    return Array.from(set)
  }, [library])

  const filtered = useMemo(() => {
    return library.filter((doc) => {
      if (activeCategory !== 'todos' && doc.category !== activeCategory) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          doc.title.toLowerCase().includes(q) ||
          (doc.description?.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
  }, [library, activeCategory, search])

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, LibraryCardData[]>()
    for (const doc of filtered) {
      const list = groups.get(doc.category) ?? []
      list.push(doc)
      groups.set(doc.category, list)
    }
    return groups
  }, [filtered])

  return (
    <>
      {/* Filtros */}
      <div className="biblioteca-header">
        <div className="cap-section-filter">
          <button
            className={cn('cap-filter-chip', activeCategory === 'todos' && 'cap-filter-chip--active')}
            onClick={() => setActiveCategory('todos')}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={cn('cap-filter-chip', activeCategory === cat && 'cap-filter-chip--active')}
              onClick={() => setActiveCategory(cat)}
            >
              {LIBRARY_CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--graphite)' }} />
          <input
            type="text"
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '7px 12px',
              fontSize: 12,
              background: 'var(--ink-black)',
              border: '1px solid var(--ink-line)',
              color: 'var(--bone)',
              borderRadius: 2,
              minWidth: 200,
            }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="guardia-empty">
          {search
            ? `Sin resultados para "${search}"`
            : 'No hay documentos en esta categoría para su nivel de acceso.'}
        </div>
      ) : activeCategory === 'todos' ? (
        // Vista agrupada por categoría
        Array.from(groupedByCategory.entries()).map(([cat, docs]) => (
          <section key={cat} className="cap-section" style={{ marginBottom: 40 }}>
            <div className="cap-section-header">
              <h2 className="cap-section-title" style={{ fontSize: 16 }}>
                {LIBRARY_CATEGORY_LABELS[cat] ?? cat}
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--graphite)',
                    fontWeight: 500,
                    marginLeft: 8,
                  }}
                >
                  {docs.length}
                </span>
              </h2>
            </div>
            <div className="cap-library-grid">
              {docs.map((doc) => <LibraryItemFull key={doc.id} doc={doc} />)}
            </div>
          </section>
        ))
      ) : (
        <div className="cap-library-grid">
          {filtered.map((doc) => <LibraryItemFull key={doc.id} doc={doc} />)}
        </div>
      )}
    </>
  )
}

function LibraryItemFull({ doc }: { doc: LibraryCardData }) {
  const sizeStr = formatFileSize(doc.fileSizeBytes)
  const mimeStr = formatMimeType(doc.mimeType)

  async function handleOpen(e: React.MouseEvent) {
    e.preventDefault()
    const res = await fetch(`/api/library/${doc.id}`)
    if (!res.ok) return
    const { url } = await res.json()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <a
      href="#"
      onClick={handleOpen}
      className="cap-library-item"
    >
      <div className="cap-library-icon">
        <FileText className="w-5 h-5" strokeWidth={1.5} />
      </div>
      <div>
        <div className="cap-library-category mono">
          {LIBRARY_CATEGORY_UPPER[doc.category] ?? doc.category.toUpperCase()}
        </div>
        <div className="cap-library-title">{doc.title}</div>
        {doc.description && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--steel)',
              marginTop: 4,
              marginBottom: 6,
              lineHeight: 1.4,
            }}
          >
            {doc.description}
          </div>
        )}
        <div className="cap-library-meta">
          {mimeStr}
          {sizeStr && ` · ${sizeStr}`}
          {` · ${formatUploadMonth(new Date(doc.uploadedAt))}`}
        </div>
      </div>
      <div className="cap-library-action">
        <ChevronRight className="w-4 h-4" strokeWidth={1.8} />
      </div>
    </a>
  )
}
