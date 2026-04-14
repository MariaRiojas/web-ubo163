import { auth } from '@/lib/auth/edge'
import { NextResponse } from 'next/server'

// Rutas que requieren autenticación (intranet)
const PROTECTED_PREFIXES = [
  '/dashboard', '/secciones', '/guardia-nocturna', '/horas',
  '/incidencias', '/personal', '/inventario', '/contenido',
  '/comunicados', '/esbas', '/perfil', '/reportes',
  '/configuracion', '/jefatura',
]

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user
  const pathname = nextUrl.pathname

  // Redirige a login si intenta acceder a intranet sin sesión
  if (isProtectedRoute(pathname) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // Redirige al dashboard si ya está logueado e intenta entrar al login
  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Excluye archivos estáticos y rutas de API de auth
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|placeholder.svg).*)',
  ],
}
