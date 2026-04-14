/**
 * Configuración Edge-compatible de NextAuth.
 *
 * SÓLO para uso en middleware.ts — NO importa pg, bcrypt, ni providers.
 * El middleware sólo necesita leer el JWT para saber si la sesión existe.
 *
 * La autenticación real (Credentials + DB) ocurre en lib/auth/index.ts,
 * que sólo se ejecuta en el runtime de Node.js (API routes, Server Components).
 */
import NextAuth from 'next-auth'
import type { Permission } from './permissions'

export const { auth } = NextAuth({
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  // Sin providers — el middleware sólo verifica el token existente
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.profileId  = (user as any).profileId
        token.grade      = (user as any).grade
        token.status     = (user as any).status
        token.permissions = (user as any).permissions
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.profileId   = token.profileId  as string
        session.user.grade       = token.grade       as string
        session.user.status      = token.status      as string
        session.user.permissions = token.permissions as Permission[]
      }
      return session
    },
  },
})
