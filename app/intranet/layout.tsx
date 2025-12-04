import type React from "react"

export default function IntranetLayout({ children }: { children: React.ReactNode }) {
  // Layout simple - la navegación se maneja dentro de cada página usando IntranetNav
  return <>{children}</>
}

