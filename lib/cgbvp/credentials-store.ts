/**
 * Abstracción para el almacenamiento de credenciales del intranet CGBVP.
 *
 * Ambientes:
 *   - AWS (producción):      AWS Secrets Manager cifrado con KMS
 *   - Desarrollo local:      Archivo cifrado con AES-256-GCM bajo .local-secrets/
 *
 * Las credenciales NUNCA se guardan en la base de datos ni en variables
 * de entorno. La tabla cgbvp_sync_config solo contiene un puntero
 * (secretRef) al secreto real.
 *
 * Quién puede llamar cada función:
 *   - saveCgbvpCredentials, deleteCgbvpCredentials: endpoints de configuración,
 *     con permiso 'company.manage' validado previamente
 *   - getCgbvpCredentials: solo el proceso del scraper (verifica via IAM en AWS)
 */
import {
  SecretsManagerClient,
  CreateSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
} from '@aws-sdk/client-secrets-manager'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export interface CgbvpCredentials {
  username: string
  password: string
}

/**
 * Determina si estamos en un entorno donde podemos usar AWS Secrets Manager.
 * Cuando no hay AWS configurado, recurrimos a un fallback local cifrado.
 */
function isAwsEnvironment(): boolean {
  return (
    !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
    !!process.env.AWS_EXECUTION_ENV ||
    process.env.CGBVP_STORE === 'aws'
  )
}

function secretName(companyId: string): string {
  const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev'
  return `ubo${companyId}/${env}/cgbvp-credentials`
}

// ═══════════════════════════════════════════════════════════════════
// API PÚBLICA
// ═══════════════════════════════════════════════════════════════════

export interface SaveResult {
  /** Referencia al secret para guardar en cgbvp_sync_config.secretRef */
  secretRef: string
}

/**
 * Guarda las credenciales. Si ya existían, las actualiza (overwrite).
 * Devuelve el secretRef para persistir en la tabla de configuración.
 */
export async function saveCgbvpCredentials(
  companyId: string,
  credentials: CgbvpCredentials,
): Promise<SaveResult> {
  if (isAwsEnvironment()) {
    return saveToAws(companyId, credentials)
  }
  return saveToLocalFile(companyId, credentials)
}

/**
 * Obtiene las credenciales desencriptadas. Solo debería llamarse desde
 * el proceso del scraper (Fargate task o ejecución manual con tsx).
 */
export async function getCgbvpCredentials(
  companyId: string,
): Promise<CgbvpCredentials | null> {
  if (isAwsEnvironment()) {
    return getFromAws(companyId)
  }
  return getFromLocalFile(companyId)
}

/**
 * Elimina las credenciales. No falla si no existían.
 */
export async function deleteCgbvpCredentials(companyId: string): Promise<void> {
  if (isAwsEnvironment()) {
    return deleteFromAws(companyId)
  }
  return deleteFromLocalFile(companyId)
}

/**
 * Indica si existen credenciales guardadas sin descifrarlas.
 * Útil para la UI de estado.
 */
export async function cgbvpCredentialsExist(companyId: string): Promise<boolean> {
  if (isAwsEnvironment()) {
    return existsInAws(companyId)
  }
  return existsInLocalFile(companyId)
}

/**
 * Genera una versión enmascarada del usuario para mostrar en UI.
 * Ejemplo: A23118 -> A2****18
 */
export function maskUsername(username: string): string {
  if (!username) return ''
  if (username.length <= 4) return '*'.repeat(username.length)
  const visibleStart = Math.max(2, Math.floor(username.length * 0.25))
  const visibleEnd = Math.max(2, Math.floor(username.length * 0.25))
  const start = username.slice(0, visibleStart)
  const end = username.slice(-visibleEnd)
  const middle = '*'.repeat(Math.max(3, username.length - visibleStart - visibleEnd))
  return `${start}${middle}${end}`
}

// ═══════════════════════════════════════════════════════════════════
// BACKEND AWS
// ═══════════════════════════════════════════════════════════════════

let _smClient: SecretsManagerClient | null = null
function smClient(): SecretsManagerClient {
  if (!_smClient) {
    _smClient = new SecretsManagerClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
    })
  }
  return _smClient
}

async function saveToAws(
  companyId: string,
  credentials: CgbvpCredentials,
): Promise<SaveResult> {
  const client = smClient()
  const name = secretName(companyId)
  const secretString = JSON.stringify(credentials)

  // Intentamos describir; si existe, actualizamos; si no, creamos
  try {
    await client.send(new DescribeSecretCommand({ SecretId: name }))
    // Existe → actualizar
    await client.send(
      new PutSecretValueCommand({
        SecretId: name,
        SecretString: secretString,
      }),
    )
  } catch (err: any) {
    if (err.name === 'ResourceNotFoundException') {
      // No existe → crear
      await client.send(
        new CreateSecretCommand({
          Name: name,
          Description: `Credenciales del intranet CGBVP para Compañía ${companyId}`,
          SecretString: secretString,
        }),
      )
    } else {
      throw err
    }
  }

  return { secretRef: `aws:${name}` }
}

async function getFromAws(companyId: string): Promise<CgbvpCredentials | null> {
  const client = smClient()
  const name = secretName(companyId)
  try {
    const resp = await client.send(new GetSecretValueCommand({ SecretId: name }))
    if (!resp.SecretString) return null
    const parsed = JSON.parse(resp.SecretString) as CgbvpCredentials
    if (!parsed.username || !parsed.password) return null
    return parsed
  } catch (err: any) {
    if (err.name === 'ResourceNotFoundException') return null
    throw err
  }
}

async function deleteFromAws(companyId: string): Promise<void> {
  const client = smClient()
  const name = secretName(companyId)
  try {
    await client.send(
      new DeleteSecretCommand({
        SecretId: name,
        ForceDeleteWithoutRecovery: true,
      }),
    )
  } catch (err: any) {
    if (err.name === 'ResourceNotFoundException') return
    throw err
  }
}

async function existsInAws(companyId: string): Promise<boolean> {
  const client = smClient()
  const name = secretName(companyId)
  try {
    await client.send(new DescribeSecretCommand({ SecretId: name }))
    return true
  } catch (err: any) {
    if (err.name === 'ResourceNotFoundException') return false
    throw err
  }
}

// ═══════════════════════════════════════════════════════════════════
// BACKEND LOCAL (desarrollo)
//
// Usa AES-256-GCM con una clave derivada de AUTH_SECRET. Los archivos
// viven en .local-secrets/ (ignorado por git) para que no se filtren.
// ═══════════════════════════════════════════════════════════════════

const LOCAL_DIR = '.local-secrets'
const ALGO = 'aes-256-gcm'

function localKey(): Buffer {
  const authSecret = process.env.AUTH_SECRET
  if (!authSecret || authSecret.length < 32) {
    throw new Error(
      'AUTH_SECRET debe estar definido con al menos 32 caracteres en .env.local para usar el almacenamiento local de credenciales.',
    )
  }
  return crypto.createHash('sha256').update(authSecret).digest()
}

async function ensureLocalDir(): Promise<string> {
  const dir = path.resolve(process.cwd(), LOCAL_DIR)
  await fs.mkdir(dir, { recursive: true })
  // Aseguramos que .gitignore no permita que el secreto se suba
  const gitignorePath = path.join(dir, '.gitignore')
  try {
    await fs.access(gitignorePath)
  } catch {
    await fs.writeFile(gitignorePath, '*\n!.gitignore\n', 'utf-8')
  }
  return dir
}

function localFilePath(dir: string, companyId: string): string {
  return path.join(dir, `cgbvp-${companyId}.enc`)
}

async function saveToLocalFile(
  companyId: string,
  credentials: CgbvpCredentials,
): Promise<SaveResult> {
  const dir = await ensureLocalDir()
  const key = localKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const plaintext = Buffer.from(JSON.stringify(credentials), 'utf-8')
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Formato en disco: iv (12) + authTag (16) + ciphertext
  const payload = Buffer.concat([iv, authTag, encrypted])
  const file = localFilePath(dir, companyId)
  await fs.writeFile(file, payload)

  return { secretRef: `local:${companyId}` }
}

async function getFromLocalFile(
  companyId: string,
): Promise<CgbvpCredentials | null> {
  const dir = await ensureLocalDir()
  const file = localFilePath(dir, companyId)
  try {
    const payload = await fs.readFile(file)
    const iv = payload.subarray(0, 12)
    const authTag = payload.subarray(12, 28)
    const encrypted = payload.subarray(28)

    const key = localKey()
    const decipher = crypto.createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(authTag)
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()])
    const parsed = JSON.parse(plaintext.toString('utf-8')) as CgbvpCredentials
    if (!parsed.username || !parsed.password) return null
    return parsed
  } catch (err: any) {
    if (err.code === 'ENOENT') return null
    throw err
  }
}

async function deleteFromLocalFile(companyId: string): Promise<void> {
  const dir = await ensureLocalDir()
  const file = localFilePath(dir, companyId)
  try {
    await fs.unlink(file)
  } catch (err: any) {
    if (err.code === 'ENOENT') return
    throw err
  }
}

async function existsInLocalFile(companyId: string): Promise<boolean> {
  const dir = await ensureLocalDir()
  const file = localFilePath(dir, companyId)
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}
