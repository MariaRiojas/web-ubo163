"use client"

import type { ElementType } from "react"
import { SafeHtml } from "@/components/ui/safe-html"
import { useSiteContent } from "./site-content-provider"

/**
 * Renderiza un bloque de contenido editable del landing.
 *
 * - Si el área de Imagen editó la key, muestra ese HTML (sanitizado vía SafeHtml,
 *   render SSR-safe de dos pasadas para evitar mismatches de hidratación).
 * - Si no, muestra el `fallback` (texto/markup por defecto del landing).
 *
 * El estilo lo pone el elemento padre del landing; esto solo reemplaza el contenido.
 */
export function SiteText({
  contentKey,
  fallback,
  as = "span",
  className,
}: {
  contentKey: string
  fallback: React.ReactNode
  as?: ElementType
  className?: string
}) {
  const stored = useSiteContent(contentKey)
  const Tag: ElementType = as

  if (stored === undefined) {
    return <Tag className={className}>{fallback}</Tag>
  }

  return <SafeHtml html={stored} as={as} className={className} />
}
