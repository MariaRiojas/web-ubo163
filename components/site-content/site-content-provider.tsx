"use client"

import { createContext, useContext } from "react"

const SiteContentContext = createContext<Record<string, string>>({})

/** Provee el mapa de contenido editable a todo el landing (hidratado en el layout). */
export function SiteContentProvider({
  value,
  children,
}: {
  value: Record<string, string>
  children: React.ReactNode
}) {
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>
}

/** Devuelve el HTML guardado para una key, o undefined si no fue editada. */
export function useSiteContent(key: string): string | undefined {
  return useContext(SiteContentContext)[key]
}
