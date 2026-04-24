import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users, profiles, sectionRoles } from '@/lib/db/schema'
import { resolvePermissions } from './permissions'
import { loginSchema } from '@/lib/validations/auth'

export const authConfig: NextAuthConfig = {
  trustHost: true,
  // Páginas personalizadas
  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas (una guardia nocturna)
  },

  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { username, password } = parsed.data

        // Buscar por email o DNI como username
        const profile = await db.query.profiles.findFirst({
          where: (p, { or, eq }) =>
            or(eq(p.email, username), eq(p.dni, username)),
        })

        if (!profile?.userId) return null

        // Verificar contraseña con bcrypt
        const user = await db.query.users.findFirst({
          where: eq(users.id, profile.userId),
        })
        if (!user) return null

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) return null

        // Cargar roles para calcular permisos
        const roles = await db.query.sectionRoles.findMany({
          where: eq(sectionRoles.profileId, profile.id),
          with: { section: true },
        })

        const permissions = resolvePermissions(profile, roles as any)

        return {
          id: profile.id,
          name: profile.fullName,
          email: profile.email ?? undefined,
          // Datos extra en el token JWT
          profileId: profile.id,
          grade: profile.grade,
          status: profile.status,
          permissions,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Primera vez: copiar datos del user al token
      if (user) {
        token.profileId = (user as any).profileId
        token.grade = (user as any).grade
        token.status = (user as any).status
        token.permissions = (user as any).permissions
      }
      return token
    },
    async session({ session, token }) {
      // Exponer datos del token en la sesión del cliente
      if (token) {
        session.user.profileId = token.profileId as string
        session.user.grade = token.grade as string
        session.user.status = token.status as string
        session.user.permissions = token.permissions as import('./permissions').Permission[]
      }
      return session
    },
  },
}

/**
 * Genera un hash bcrypt para una contraseña.
 * Usar en el seed o en el endpoint de cambio de contraseña.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}
