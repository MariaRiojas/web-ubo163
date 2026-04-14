/**
 * Abstracción de almacenamiento S3-compatible.
 *
 * - Desarrollo: MinIO (docker compose up -d minio)
 * - Producción: AWS S3, Cloudflare R2, Backblaze B2, etc.
 *
 * Configurar en .env.local:
 *   S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY,
 *   S3_BUCKET, S3_REGION, S3_PUBLIC_URL
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// ── Singleton del cliente ─────────────────────────────────────────

function createS3Client(): S3Client {
  const endpoint = process.env.S3_ENDPOINT
  const region   = process.env.S3_REGION ?? "us-east-1"

  return new S3Client({
    region,
    ...(endpoint
      ? {
          endpoint,
          forcePathStyle: true, // necesario para MinIO y R2
        }
      : {}),
    credentials: {
      accessKeyId:     process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
  })
}

// Singleton — reutilizar cliente entre requests en Node.js
const s3 = createS3Client()
const BUCKET = process.env.S3_BUCKET ?? "cuartel-media"
const PUBLIC_URL = process.env.S3_PUBLIC_URL ?? ""

// ── Tipos ─────────────────────────────────────────────────────────

export interface UploadResult {
  key: string
  /** URL pública (sólo si el bucket es público) */
  url: string
}

// ── Operaciones ───────────────────────────────────────────────────

/**
 * Sube un archivo al bucket.
 *
 * @param key  Ruta dentro del bucket, p.ej. "avatars/abc123.jpg"
 * @param body Buffer, Uint8Array o ReadableStream del archivo
 * @param contentType  MIME type del archivo
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | ReadableStream,
  contentType: string
): Promise<UploadResult> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )

  return {
    key,
    url: `${PUBLIC_URL}/${key}`,
  }
}

/**
 * Genera una URL prefirmada para subir un archivo directamente
 * desde el cliente (sin pasar por el servidor).
 * Válida por 15 minutos.
 *
 * @param key  Ruta dentro del bucket
 * @param contentType  MIME type del archivo
 */
export async function getUploadPresignedUrl(
  key: string,
  contentType: string,
  expiresIn = 900 // 15 minutos
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(s3, command, { expiresIn })
}

/**
 * Genera una URL prefirmada para descargar un archivo privado.
 * Válida por 1 hora por defecto.
 */
export async function getDownloadPresignedUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(s3, command, { expiresIn })
}

/**
 * Elimina un archivo del bucket.
 */
export async function deleteFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

/**
 * Convierte una URL pública de vuelta a su key de S3.
 * Útil para eliminar archivos a partir de una URL almacenada en BD.
 */
export function urlToKey(url: string): string {
  return url.replace(`${PUBLIC_URL}/`, "")
}

// ── Helpers de organización de keys ──────────────────────────────

/** Genera una key para avatares de perfil */
export function avatarKey(profileId: string, ext: string): string {
  return `avatars/${profileId}.${ext}`
}

/** Genera una key para adjuntos de incidencias */
export function incidentAttachmentKey(
  incidentId: string,
  filename: string
): string {
  return `incidents/${incidentId}/${filename}`
}

/** Genera una key para documentos de inventario */
export function inventoryDocKey(itemId: string, filename: string): string {
  return `inventory/${itemId}/${filename}`
}
