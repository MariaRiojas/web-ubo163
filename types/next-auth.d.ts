import type { Permission } from '@/lib/auth/permissions'

// Extiende los tipos de NextAuth para incluir los campos personalizados
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      profileId: string
      grade: string
      status: string
      permissions: Permission[]
    }
  }

  interface User {
    profileId: string
    grade: string
    status: string
    permissions: Permission[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    profileId: string
    grade: string
    status: string
    permissions: Permission[]
  }
}
