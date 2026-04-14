import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { profiles, sectionRoles } from '@/lib/db/schema'
import { resolvePermissions } from './permissions'
import { loginSchema } from '@/lib/validations/auth'

export const authConfig: NextAuthConfig = {
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

        // En producción: verificar hash de password con bcrypt
        // Por ahora buscamos el usuario directamente por userId + validación
        // TODO: agregar campo password_hash a profiles o tabla users separada
        // Para el seed inicial usamos un check simple que se reemplazará
        const isValid = await verifyPassword(password, profile.userId)
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
        session.user.permissions = token.permissions as string[]
      }
      return session
    },
  },
}

// Verificación de contraseña (stub — reemplazar con bcrypt en producción)
async function verifyPassword(
  password: string,
  userId: string
): Promise<boolean> {
  // TODO: implementar con bcrypt.compare()
  // import bcrypt from 'bcryptjs'
  // const hash = await getUserPasswordHash(userId)
  // return bcrypt.compare(password, hash)
  return password.length >= 6 // Temporal para desarrollo
}
