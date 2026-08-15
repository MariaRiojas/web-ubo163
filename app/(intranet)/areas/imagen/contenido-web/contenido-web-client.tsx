'use client'

import { useState, useMemo, useRef, useTransition } from 'react'
import { Save, Check, RotateCcw, Globe, Pencil, ExternalLink, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { AnuncioRichEditor } from '@/components/anuncios/anuncio-rich-editor'
import { saveSiteBlock } from '@/lib/site-content/actions'
import type { EditableBlock } from '@/lib/db/schema/site-content'

type BlockRow = EditableBlock & { currentHtml: string; edited: boolean }

// Ruta pública de cada página, para el botón "Ver página".
const PAGE_PATH: Record<string, string> = {
  'Inicio': '/', 'Nosotros': '/nosotros', 'Servicios': '/servicios',
  'Equipo': '/equipo', 'Admisión': '/admision', 'Contacto': '/contacto',
  'Cronograma': '/cronograma',
}

// Nombres legibles para cada sección (segundo segmento del key).
const SECTION_LABELS: Record<string, string> = {
  hero: 'Encabezado', mision: 'Misión', serv: 'Servicios', servicios: 'Servicios',
  cta: 'Llamado a la acción', contacto: 'Contacto', historia: 'Historia',
  proposito: 'Propósito', mvv: 'Misión · Visión · Valores', cifras: 'Cifras',
  info: 'Información', social: 'Redes sociales', form: 'Formulario',
  mando: 'Cadena de mando', cobertura: 'Cobertura', efectivos: 'Efectivos',
  equipo: 'Equipo', datos: 'Datos', sent: 'Confirmación de envío',
  intro: 'Introducción', banner: 'Banner', motto: 'Lema', footer: 'Pie',
}

function sectionOf(key: string): string {
  const parts = key.split('.')
  return parts.length > 1 ? parts[1] : 'general'
}
function sectionLabel(slug: string): string {
  return SECTION_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')
}
const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

export function ContenidoWebClient({ blocks, canManage }: { blocks: BlockRow[]; canManage: boolean }) {
  const pages = useMemo(() => {
    const map = new Map<string, BlockRow[]>()
    for (const b of blocks) {
      if (!map.has(b.page)) map.set(b.page, [])
      map.get(b.page)!.push(b)
    }
    return [...map.entries()]
  }, [blocks])

  const [active, setActive] = useState(pages[0]?.[0] ?? '')
  const [query, setQuery] = useState('')
  const [onlyEdited, setOnlyEdited] = useState(false)
  const scrollBox = useRef<HTMLDivElement>(null)

  const activeRows = pages.find(([p]) => p === active)?.[1] ?? []
  const activePath = PAGE_PATH[active]

  // Filtro por búsqueda + "solo editados"
  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => activeRows.filter(b => {
    if (onlyEdited && !b.edited) return false
    if (!q) return true
    return b.label.toLowerCase().includes(q) || stripHtml(b.currentHtml).toLowerCase().includes(q) || stripHtml(b.defaultHtml).toLowerCase().includes(q)
  }), [activeRows, q, onlyEdited])

  // Agrupar por sección conservando el orden de aparición.
  const groups = useMemo(() => {
    const map = new Map<string, BlockRow[]>()
    for (const b of filtered) {
      const s = sectionOf(b.key)
      if (!map.has(s)) map.set(s, [])
      map.get(s)!.push(b)
    }
    return [...map.entries()]
  }, [filtered])

  const editedCountPage = activeRows.filter(r => r.edited).length

  const jumpTo = (slug: string) => {
    document.getElementById(`sec-${slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const changePage = (p: string) => { setActive(p); setQuery(''); setOnlyEdited(false); scrollBox.current?.scrollTo({ top: 0 }) }

  return (
    <div>
      <header className="area-hero" style={{ marginBottom: 20 }}>
        <div className="area-hero-seal"><Globe className="w-6 h-6" strokeWidth={1.6} /></div>
        <div className="area-hero-body">
          <div className="area-hero-ref">ÁREA DE IMAGEN · SITIO WEB PÚBLICO</div>
          <h1 className="area-hero-title">Contenido Web</h1>
          <p className="area-hero-desc">
            Edita el sitio público página por página. Busca el texto, ubícalo por sección y publícalo;
            se refleja al instante en el landing.
          </p>
        </div>
      </header>

      {!canManage && (
        <div className="guardia-empty" style={{ marginBottom: 16 }}>
          Tienes acceso de solo lectura. Para editar el contenido necesitas el permiso de gestión de imagen.
        </div>
      )}

      {/* Pestañas por página */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--ink-line)', marginBottom: 16 }}>
        {pages.map(([page, rows]) => {
          const isActive = page === active
          const editedCount = rows.filter(r => r.edited).length
          return (
            <button key={page} type="button" onClick={() => changePage(page)}
              style={{
                position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.02em',
                color: isActive ? 'var(--bone)' : 'var(--steel)',
                borderBottom: isActive ? '2px solid var(--red-163)' : '2px solid transparent', marginBottom: -1,
              }}>
              {page}
              <span style={{ marginLeft: 7, fontSize: 10, color: isActive ? 'var(--brass)' : 'var(--graphite)' }}>{rows.length}</span>
              {editedCount > 0 && <span title={`${editedCount} editado(s)`} style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald-glow)', marginLeft: 6, verticalAlign: 'middle' }} />}
            </button>
          )
        })}
      </div>

      {/* Barra de herramientas: búsqueda + filtros + ver página */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search className="w-4 h-4" strokeWidth={1.8} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--graphite)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Buscar texto en ${active}…`}
            style={{ width: '100%', padding: '9px 30px 9px 32px', fontSize: 13, background: 'var(--ink-black)', border: '1px solid var(--ink-line)', color: 'var(--bone)', borderRadius: 2, fontFamily: 'var(--font-mono)' }} />
          {query && <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--graphite)', cursor: 'pointer' }}><X className="w-3.5 h-3.5" /></button>}
        </div>
        <button onClick={() => setOnlyEdited(v => !v)} className="btn btn--ghost btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: onlyEdited ? 'var(--emerald-glow)' : undefined, color: onlyEdited ? 'var(--emerald-glow)' : undefined }}>
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--emerald-glow)' }} /> Solo editados{editedCountPage > 0 ? ` (${editedCountPage})` : ''}
        </button>
        {activePath && (
          <a href={activePath} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
            <ExternalLink className="w-3 h-3" strokeWidth={1.8} /> Ver página
          </a>
        )}
      </div>

      {/* Chips de secciones (salto rápido) */}
      {!q && !onlyEdited && groups.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {groups.map(([slug, rows]) => {
            const edited = rows.filter(r => r.edited).length
            return (
              <button key={slug} onClick={() => jumpTo(slug)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', color: 'var(--steel)', borderRadius: 999, padding: '5px 11px', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>
                {sectionLabel(slug)}
                <span style={{ color: 'var(--graphite)', fontSize: 10 }}>{rows.length}</span>
                {edited > 0 && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald-glow)' }} />}
              </button>
            )
          })}
        </div>
      )}

      {/* Secciones */}
      <div ref={scrollBox}>
        {groups.length === 0
          ? <div className="guardia-empty">{q || onlyEdited ? 'Ningún bloque coincide con el filtro.' : 'Esta página aún no tiene bloques editables.'}</div>
          : groups.map(([slug, rows]) => (
            <section key={slug} id={`sec-${slug}`} style={{ marginBottom: 22, scrollMarginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brass)', margin: 0 }}>{sectionLabel(slug)}</h3>
                <span style={{ height: 1, flex: 1, background: 'var(--ink-line)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>{rows.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rows.map(b => <BlockEditor key={b.key} block={b} canManage={canManage} />)}
              </div>
            </section>
          ))}
      </div>
    </div>
  )
}

function BlockEditor({ block, canManage }: { block: BlockRow; canManage: boolean }) {
  const [value, setValue] = useState(block.currentHtml)
  const [saved, setSaved] = useState(block.edited)
  const [pending, startTransition] = useTransition()

  const dirty = value !== block.currentHtml

  const save = () => {
    startTransition(async () => {
      const res = await saveSiteBlock({ contentKey: block.key, html: value })
      if (!res.ok) { toast.error(res.error); return }
      setSaved(true)
      block.currentHtml = value
      block.edited = true
      toast.success(`«${block.label}» actualizado`)
    })
  }

  const reset = () => setValue(block.defaultHtml)

  return (
    <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', borderRadius: 3, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} style={{ color: 'var(--brass)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: 'var(--bone)', fontWeight: 600 }}>{block.label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)', border: '1px solid var(--ink-line)', borderRadius: 2, padding: '1px 5px' }}>{block.kind === 'rich' ? 'texto enriquecido' : 'una línea'}</span>
        {saved && !dirty && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--emerald-glow)', marginLeft: 'auto' }}>
            <Check className="w-3 h-3" strokeWidth={2} /> PUBLICADO
          </span>
        )}
        {dirty && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--flame)', marginLeft: 'auto' }}>· sin publicar</span>}
      </div>
      {block.hint && <p style={{ fontSize: 11, color: 'var(--graphite)', marginBottom: 8 }}>{block.hint}</p>}

      {block.kind === 'text' ? (
        <input
          value={value.replace(/<[^>]+>/g, '')}
          onChange={e => setValue(e.target.value)}
          disabled={!canManage}
          style={{ width: '100%', padding: '9px 12px', fontSize: 13, background: 'var(--ink-black)', border: '1px solid var(--ink-line)', color: 'var(--bone)', borderRadius: 2 }}
        />
      ) : (
        <AnuncioRichEditor value={value} onChange={setValue} placeholder="Escribe el contenido…" />
      )}

      {canManage && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <button type="button" className="btn btn--primary btn--sm" disabled={pending || !dirty} onClick={save}>
            <Save className="w-3.5 h-3.5" strokeWidth={1.8} />
            {pending ? 'Guardando…' : 'Publicar cambios'}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={reset} disabled={pending} title="Restaurar texto por defecto">
            <RotateCcw className="w-3 h-3" strokeWidth={1.8} /> Por defecto
          </button>
        </div>
      )}
    </div>
  )
}
