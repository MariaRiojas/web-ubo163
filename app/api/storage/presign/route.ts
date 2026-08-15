import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { getUploadPresignedUrl, avatarKey, incidentAttachmentKey, inventoryDocKey, libraryDocKey, courseMaterialKey } from "@/lib/storage/s3"
import type { Permission } from "@/lib/auth/permissions"

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Sin video/* — videos se referencian como URLs de YouTube/Vimeo (sin costo de S3 egress)
]

const MAX_SIZE_MB = 20

const schema = z.object({
  category: z.enum(["avatar", "incident", "inventory", "library", "course-material"]),
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1),
  resourceId: z.string().min(1),
  /** ID secundario (ej. lessonId para course-material) */
  resourceId2: z.string().optional(),
  sizeBytes: z.number().positive(),
})

export async function POST(request: Request) {
  // Verificar sesión
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

  const { category, filename, contentType, resourceId, resourceId2, sizeBytes } = parsed.data

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: `Tipo de archivo no permitido` },
      { status: 400 }
    )
  }

  if (sizeBytes > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `Archivo demasiado grande (máx ${MAX_SIZE_MB} MB)` }, { status: 400 })
  }

  const permissions = (session.user.permissions ?? []) as Permission[]
  const ext = filename.split(".").pop()?.toLowerCase() ?? "bin"
  let key: string

  switch (category) {
    case "avatar":
      if (resourceId !== session.user.profileId) {
        return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
      }
      key = avatarKey(resourceId, ext)
      break
    case "incident":
      key = incidentAttachmentKey(resourceId, `${Date.now()}_${filename}`)
      break
    case "inventory":
      key = inventoryDocKey(resourceId, `${Date.now()}_${filename}`)
      break
    case "library":
      if (!permissions.includes("area.instruction.manage")) {
        return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
      }
      key = libraryDocKey(resourceId, `${Date.now()}_${filename}`)
      break
    case "course-material":
      if (!permissions.includes("area.instruction.manage")) {
        return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
      }
      key = courseMaterialKey(resourceId, resourceId2 ?? "general", `${Date.now()}_${filename}`)
      break
    default:
      return NextResponse.json({ error: "Categoría inválida" }, { status: 400 })
  }

  try {
    const presignedUrl = await getUploadPresignedUrl(key, contentType)
    return NextResponse.json({ presignedUrl, key })
  } catch (err) {
    console.error("[presign] Error generando URL:", err)
    return NextResponse.json({ error: "No se pudo generar la URL de subida" }, { status: 500 })
  }
}
