import type React from 'react'

// Layout mínimo para páginas de autenticación (sin nav/footer)
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
