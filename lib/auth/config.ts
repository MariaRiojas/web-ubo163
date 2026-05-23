import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { ddb, TABLE, GetCommand, QueryCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { User } from '@/lib/db/schema/users'
import type { Profile } from '@/lib/db/schema/profiles'
import type { SectionRole } from '@/lib/db/schema/section-roles'
import type { Section } from '@/lib/db/schema/sections'
import { resolvePermissions } from './permissions'
import { loginSchema } from '@/lib/validations/auth'

/** Busca un perfil por email o DNI via GSIs en paralelo */
async function findProfileByCredential(username: string): Promise<Profile | null> {
  const [byEmail, byDni] = await Promise.all([
    ddb.send(new QueryCommand({
      TableName: TABLE.profiles,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :v',
      ExpressionAttributeValues: { ':v': username },
      Limit: 1,
    })),
    ddb.send(new QueryCommand({
      TableName: TABLE.profiles,
      IndexName: 'dni-index',
      KeyConditionExpression: 'dni = :v',
      ExpressionAttributeValues: { ':v': username },
      Limit: 1,
    })),
  ])

  const item = byEmail.Items?.[0] ?? byDni.Items?.[0]
  return (item as Profile | undefined) ?? null
}

/** Carga roles de sección del perfil y enriquece cada uno con su Section */
async function loadRolesWithSections(profileId: string): Promise<(SectionRole & { section?: Section | null })[]> {
  const rolesRes = await ddb.send(new QueryCommand({
    TableName: TABLE.sectionRoles,
    KeyConditionExpression: 'profileId = :pid',
    ExpressionAttributeValues: { ':pid': profileId },
  }))

  const roles = (rolesRes.Items ?? []) as SectionRole[]
  if (roles.length === 0) return []

  // Cargar todas las secciones en un solo BatchGet
  const uniqueSectionIds = [...new Set(roles.map((r) => r.sectionId))]
  const batchRes = await ddb.send(new BatchGetCommand({
    RequestItems: {
      [TABLE.sections]: {
        Keys: uniqueSectionIds.map((id) => ({ sectionId: id })),
      },
    },
  }))

  const sectionMap = new Map<string, Section>()
  for (const item of batchRes.Responses?.[TABLE.sections] ?? []) {
    const s = item as Section
    sectionMap.set(s.sectionId, s)
  }

  return roles.map((r) => ({ ...r, section: sectionMap.get(r.sectionId) ?? null }))
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
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

        const profile = await findProfileByCredential(username)
        if (!profile) {
          console.log('[AUTH] Perfil no encontrado:', username)
          return null
        }
        if (!profile.userId) {
          console.log('[AUTH] Perfil sin userId vinculado:', profile.email)
          return null
        }

        const userRes = await ddb.send(new GetCommand({
          TableName: TABLE.users,
          Key: { userId: profile.userId },
        }))
        const user = userRes.Item as User | undefined
        if (!user) {
          console.log('[AUTH] Usuario no encontrado para userId:', profile.userId)
          return null
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) {
          console.log('[AUTH] Contraseña incorrecta:', username)
          return null
        }

        const roles = await loadRolesWithSections(profile.profileId)
        const permissions = resolvePermissions(profile, roles)

        return {
          id: profile.profileId,
          name: profile.fullName,
          email: profile.email ?? undefined,
          profileId: profile.profileId,
          grade: profile.grade,
          status: profile.status,
          permissions,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.profileId = (user as any).profileId
        token.grade    = (user as any).grade
        token.status   = (user as any).status
        token.permissions = (user as any).permissions
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.profileId   = token.profileId as string
        session.user.grade       = token.grade as string
        session.user.status      = token.status as string
        session.user.permissions = token.permissions as import('./permissions').Permission[]
      }
      return session
    },
  },
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}
