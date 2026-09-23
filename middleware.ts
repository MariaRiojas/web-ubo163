import { auth } from '@/lib/auth/edge'
import { NextResponse } from 'next/server'

// Rutas que requieren autenticación (intranet)
const PROTECTED_PREFIXES = [
  '/dashboard', '/mi-compania', '/secciones', '/guardia-nocturna', '/horas',
  '/incidencias', '/personal', '/inventario', '/contenido',
  '/comunicados', '/esbas', '/perfil', '/reportes',
  '/configuracion', '/jefatura',
  '/operatividad', '/estadisticas', '/partes-emergencia',
  '/bomberos', '/asistencias', '/analisis',
  '/areas', '/faena', '/capacitacion', '/biblioteca', '/anuncios', '/actividades',
  '/auditoria',
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
  const mustChangePassword = (session?.user as any)?.mustChangePassword === true

  // Redirige a login si intenta acceder a intranet sin sesión
  if (isProtectedRoute(pathname) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // Primer ingreso: con clave temporal no se puede usar el resto del sistema
  // hasta definir una clave propia y registrar el correo personal.
  if (isLoggedIn && mustChangePassword && pathname !== '/primer-ingreso') {
    return NextResponse.redirect(new URL('/primer-ingreso', nextUrl))
  }
  if (pathname === '/primer-ingreso' && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // Redirige al dashboard si ya está logueado e intenta entrar al login
  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL(mustChangePassword ? '/primer-ingreso' : '/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Excluye archivos estáticos y rutas de API de auth
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|placeholder.svg).*)',
  ],
}
