"use client"

import { cn } from '@/lib/utils'
import { SafeHtml, RICH_TEXT_SANITIZE_CONFIG, getVisibleTextLength } from '@/components/ui/safe-html'

/** Longitud del texto visible de un anuncio (sin markup), para decidir si se colapsa en la tarjeta. */
export function getAnuncioTextLength(content: string): number {
  return getVisibleTextLength(content)
}

/**
 * Renderiza el contenido de un anuncio como HTML saneado (DOMPurify), vía el
 * renderer compartido `SafeHtml` (ver `components/ui/safe-html.tsx` para el
 * detalle del saneo SSR-safe en dos pasadas).
 */
export function AnuncioContent({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  return (
    <SafeHtml
      html={content}
      className={cn('anuncio-rich', className)}
      config={RICH_TEXT_SANITIZE_CONFIG}
    />
  )
}
