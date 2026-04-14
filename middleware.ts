import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user

  const isIntranetRoute = nextUrl.pathname.startsWith('/intranet') &&
    nextUrl.pathname !== '/intranet'  // /intranet es el login

  // Redirige a login si intenta acceder a la intranet sin sesión
  if (isIntranetRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/intranet', nextUrl))
  }

  // Redirige al dashboard si ya está logueado e intenta entrar al login
  if (nextUrl.pathname === '/intranet' && isLoggedIn) {
    return NextResponse.redirect(new URL('/intranet/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Protege todas las rutas de intranet excepto archivos estáticos y API
    '/intranet/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|placeholder.svg).*)',
  ],
}
