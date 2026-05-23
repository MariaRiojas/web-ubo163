import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { ddb, TABLE, GetCommand, UpdateCommand, now } from "@/lib/db/dynamodb"
import type { Profile } from "@/lib/db/schema/profiles"
import type { User } from "@/lib/db/schema/users"

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

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
  const profileId = session.user.profileId as string

  const profileRes = await ddb.send(new GetCommand({
    TableName: TABLE.profiles,
    Key: { profileId },
  }))
  const profile = profileRes.Item as Profile | undefined

  if (!profile?.userId) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
  }

  const userRes = await ddb.send(new GetCommand({
    TableName: TABLE.users,
    Key: { userId: profile.userId },
  }))
  const user = userRes.Item as User | undefined

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!isValid) {
    return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 })
  }

  const isSame = await bcrypt.compare(newPassword, user.passwordHash)
  if (isSame) {
    return NextResponse.json(
      { error: "La nueva contraseña debe ser diferente a la actual" },
      { status: 400 }
    )
  }

  const newHash = await bcrypt.hash(newPassword, 12)

  await ddb.send(new UpdateCommand({
    TableName: TABLE.users,
    Key: { userId: profile.userId },
    UpdateExpression: "SET passwordHash = :h, updatedAt = :t",
    ExpressionAttributeValues: { ":h": newHash, ":t": now() },
  }))

  return NextResponse.json({ success: true })
}
