import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { getUploadPresignedUrl, avatarKey, incidentAttachmentKey, inventoryDocKey } from "@/lib/storage/s3"

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]

const MAX_SIZE_MB = 10

const schema = z.object({
  /** Categoría del archivo — determina la carpeta de destino en S3 */
  category: z.enum(["avatar", "incident", "inventory"]),
  /** Nombre original del archivo (para extensión) */
  filename: z.string().min(1).max(200),
  /** MIME type del archivo */
  contentType: z.string().min(1),
  /** ID del recurso al que pertenece el archivo */
  resourceId: z.string().min(1),
  /** Tamaño en bytes (validación del lado del servidor) */
  sizeBytes: z.number().positive().max(MAX_SIZE_MB * 1024 * 1024),
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

  const { category, filename, contentType, resourceId, sizeBytes } = parsed.data

  // Validar tipo MIME
  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: `Tipo de archivo no permitido. Permitidos: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 }
    )
  }

  // Extraer extensión del filename
  const ext = filename.split(".").pop()?.toLowerCase() ?? "bin"

  // Construir key según categoría
  let key: string
  switch (category) {
    case "avatar":
      // Solo el propio usuario puede subir su avatar
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
  }

  try {
    const presignedUrl = await getUploadPresignedUrl(key, contentType)
    const publicUrl = `${process.env.S3_PUBLIC_URL}/${key}`

    return NextResponse.json({
      presignedUrl,
      key,
      publicUrl,
    })
  } catch (err) {
    console.error("[presign] Error generando URL:", err)
    return NextResponse.json(
      { error: "No se pudo generar la URL de subida" },
      { status: 500 }
    )
  }
}
