import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users, profiles } from "@/lib/db/schema"

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
})

export async function POST(request: Request) {
  // Verificar sesión
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // Parsear body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
      { status: 422 }
    )
  }

  const { currentPassword, newPassword } = parsed.data

  // Obtener el userId desde el perfil
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.user.profileId as string),
  })

  if (!profile?.userId) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
  }

  // Obtener el hash actual
  const user = await db.query.users.findFirst({
    where: eq(users.id, profile.userId),
  })

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  // Verificar contraseña actual
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!isValid) {
    return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 })
  }

  // Evitar reutilizar la misma contraseña
  const isSame = await bcrypt.compare(newPassword, user.passwordHash)
  if (isSame) {
    return NextResponse.json(
      { error: "La nueva contraseña debe ser diferente a la actual" },
      { status: 400 }
    )
  }

  // Generar nuevo hash y guardar
  const newHash = await bcrypt.hash(newPassword, 12)
  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(users.id, profile.userId))

  return NextResponse.json({ success: true })
}
