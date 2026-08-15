"use client"

import { useEffect, useState, type CSSProperties, type ElementType } from 'react'
import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'

const HTML_TAG_RE = /<[a-z][\s\S]*>/i

export type SafeHtmlConfig = {
  ALLOWED_TAGS: string[]
  ALLOWED_ATTR: string[]
}

/** Config para texto enriquecido simple (anuncios): negrita, listas, un nivel de heading, links. */
export const RICH_TEXT_SANITIZE_CONFIG: SafeHtmlConfig = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
}

/** Config para contenido de lecciones (capacitación): además headings, citas, código, tablas e imágenes. */
export const LESSON_SANITIZE_CONFIG: SafeHtmlConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li',
    'h2', 'h3', 'h4', 'blockquote', 'a', 'img', 'code', 'pre', 'span',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title'],
}

let linkHookInstalled = false
function ensureSafeLinkHook() {
  if (linkHookInstalled) return
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
  linkHookInstalled = true
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Texto plano legado: se envuelve en <p> preservando saltos de línea. */
function legacyPlainTextToHtml(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map((line) => `<p>${line.length ? escapeHtml(line) : '&nbsp;'}</p>`)
    .join('')
}

/**
 * Calcula el HTML saneado (DOMPurify) de un contenido crudo que puede ser HTML
 * (autor de confianza parcial: anuncios, lecciones) o texto plano legado.
 */
export function computeSafeHtml(raw: string, config: SafeHtmlConfig = RICH_TEXT_SANITIZE_CONFIG): string {
  ensureSafeLinkHook()
  const source = HTML_TAG_RE.test(raw) ? raw : legacyPlainTextToHtml(raw)
  return DOMPurify.sanitize(source, config)
}

/** Longitud del texto visible de un HTML/texto (sin markup), útil para truncar tarjetas. */
export function getVisibleTextLength(content: string): number {
  const raw = content ?? ''
  const withoutTags = raw.replace(/<[^>]*>/g, '')
  return withoutTags.replace(/&nbsp;/gi, ' ').trim().length
}

/**
 * Renderiza HTML de origen no totalmente confiable (contenido autorado por
 * usuarios con permisos elevados: anuncios, lecciones de capacitación) de
 * forma segura con DOMPurify.
 *
 * DOMPurify solo sanea en el navegador (en el servidor `window` no existe y la
 * librería devuelve el HTML sin tocar). Para evitar mandar HTML sin sanear en el
 * primer render del servidor, el saneo se calcula en un `useEffect` (que nunca
 * corre en el servidor) y el render inicial (servidor + primer pintado del
 * cliente, que deben coincidir para no romper la hidratación) muestra el texto
 * plano — nunca el HTML crudo.
 */
export function SafeHtml({
  html,
  className,
  style,
  as,
  config = RICH_TEXT_SANITIZE_CONFIG,
}: {
  html: string | null | undefined
  className?: string
  style?: CSSProperties
  as?: ElementType
  config?: SafeHtmlConfig
}) {
  const raw = html ?? ''
  const [safe, setSafe] = useState<string | null>(null)
  const Tag: ElementType = as ?? 'div'

  useEffect(() => {
    setSafe(computeSafeHtml(raw, config))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw])

  if (safe === null) {
    return (
      <Tag className={className} style={style}>
        {raw}
      </Tag>
    )
  }

  return (
    <Tag
      className={className}
      style={style}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
