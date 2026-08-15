import { ddb, TABLE, GetCommand, PutCommand, DeleteCommand } from '@/lib/db/dynamodb'

// ─────────────────────────────────────────────────────────────────────────
// Rate limiting / lockout de intentos de login (hallazgo #4 de
// docs/AUDITORIA_SEGURIDAD.md).
//
// Almacenamiento: NINGUNA tabla del stack (ver infra/cdk/lib/stacks/
// dynamo-stack.ts) tiene habilitado un atributo TTL, y agregar TTL o una
// tabla nueva implica un cambio de CDK (fuera de alcance de este fix).
// Por eso el contador se guarda como un item más en la tabla
// `TABLE.users` (PK `userId`, string), usando un prefijo dedicado
// `ratelimit#<username>` que nunca puede colisionar con un `userId` real
// (los userId reales son UUIDs generados por `generateId()`).
//
// Como no hay TTL, el registro NO se autoelimina — en vez de eso, la
// ventana de intentos y el lockout se controlan comparando timestamps en
// el momento de la lectura (`isLockedOut` / `recordFailedAttempt`). El
// item queda "inerte" tras expirar la ventana y simplemente se
// sobrescribe en el siguiente intento; con el volumen de esta app
// (~2,749 req/mes) el costo de almacenamiento residual es despreciable.
//
// La operación de lectura+escritura no es atómica (no usamos
// ConditionExpression / ADD atómico) porque el objetivo es frenar fuerza
// bruta manual/scripted contra una app interna pequeña, no garantizar un
// contador exacto bajo alta concurrencia. Si dos requests concurrentes
// del mismo usuario compiten, en el peor caso se pierde un incremento —
// aceptable para este caso de uso.
// ─────────────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutos

interface RateLimitRecord {
  userId: string // `ratelimit#<username-normalizado>`
  attempts: number
  firstAttemptAt: number // epoch ms
  lockedUntil: number | null // epoch ms
  updatedAt: string
}

function normalize(username: string): string {
  return username.trim().toLowerCase()
}

function rateLimitKey(username: string): string {
  return `ratelimit#${normalize(username)}`
}

async function getRecord(username: string): Promise<RateLimitRecord | null> {
  const res = await ddb.send(new GetCommand({
    TableName: TABLE.users,
    Key: { userId: rateLimitKey(username) },
  }))
  return (res.Item as RateLimitRecord | undefined) ?? null
}

/**
 * Devuelve true si el usuario está actualmente bloqueado por exceso de
 * intentos fallidos. Fail-open: cualquier error de infraestructura se
 * loguea de forma genérica (sin username) y se trata como "no bloqueado"
 * para no impedir logins legítimos por una falla de DynamoDB.
 */
export async function isLockedOut(username: string): Promise<boolean> {
  try {
    const record = await getRecord(username)
    if (!record?.lockedUntil) return false
    return record.lockedUntil > Date.now()
  } catch {
    console.warn('[auth] rate-limit: fallo al leer el contador de intentos, se permite continuar')
    return false
  }
}

/**
 * Registra un intento fallido de login. Si la ventana de 15 minutos
 * expiró, reinicia el contador. Si se alcanza el máximo de intentos
 * dentro de la ventana, aplica lockout de 15 minutos.
 */
export async function recordFailedAttempt(username: string): Promise<void> {
  try {
    const now = Date.now()
    const existing = await getRecord(username)

    const windowExpired = !existing || (now - existing.firstAttemptAt) > WINDOW_MS
    const attempts = windowExpired ? 1 : existing.attempts + 1
    const firstAttemptAt = windowExpired ? now : existing.firstAttemptAt
    const lockedUntil = attempts >= MAX_ATTEMPTS ? now + LOCKOUT_MS : null

    const record: RateLimitRecord = {
      userId: rateLimitKey(username),
      attempts,
      firstAttemptAt,
      lockedUntil,
      updatedAt: new Date().toISOString(),
    }

    await ddb.send(new PutCommand({
      TableName: TABLE.users,
      Item: record,
    }))
  } catch {
    console.warn('[auth] rate-limit: fallo al registrar intento fallido, no bloquea el flujo de login')
  }
}

/** Limpia el contador de intentos tras un login exitoso. */
export async function clearAttempts(username: string): Promise<void> {
  try {
    await ddb.send(new DeleteCommand({
      TableName: TABLE.users,
      Key: { userId: rateLimitKey(username) },
    }))
  } catch {
    console.warn('[auth] rate-limit: fallo al limpiar el contador de intentos')
  }
}
