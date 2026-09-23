'use server'

/**
 * Autogestión de la cuenta del efectivo:
 *   1. Primer ingreso — cambia la clave temporal que le entregó su jefe y
 *      registra su correo personal (único canal de recuperación que existe).
 *   2. Recuperación — código de 6 dígitos enviado a ese correo personal.
 *
 * El código de recuperación se guarda hasheado en el propio registro de
 * `users` (con vencimiento y contador de intentos), así no hace falta una
 * tabla nueva ni permisos IAM adicionales.
 */
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand, QueryCommand, UpdateCommand, now } from '@/lib/db/dynamodb'
import { sendMail } from '@/lib/email/send'
import { companyConfig } from '@/company.config'

type Result = { ok: true } | { ok: false; error: string }

const MIN_PASS = 8
const TOKEN_MIN = 30          // vigencia del código de recuperación
const MAX_INTENTOS = 5        // intentos por código antes de invalidarlo
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function validarPassword(p: string): string | null {
  if (!p || p.length < MIN_PASS) return `La contraseña debe tener al menos ${MIN_PASS} caracteres`
  if (!/[a-zA-Z]/.test(p) || !/[0-9]/.test(p)) return 'La contraseña debe combinar letras y números'
  return null
}

/** Busca un efectivo por código CGBVP o DNI (mismo criterio que el login). */
async function buscarPerfil(identificador: string) {
  const plano = (identificador ?? '').trim()
  if (!plano) return null
  const [byCodigo, byDni] = await Promise.all([
    ddb.send(new QueryCommand({
      TableName: TABLE.profiles, IndexName: 'codigoCgbvp-index',
      KeyConditionExpression: 'codigoCgbvp = :v',
      ExpressionAttributeValues: { ':v': plano.toUpperCase() }, Limit: 1,
    })),
    ddb.send(new QueryCommand({
      TableName: TABLE.profiles, IndexName: 'dni-index',
      KeyConditionExpression: 'dni = :v',
      ExpressionAttributeValues: { ':v': plano }, Limit: 1,
    })),
  ])
  return (byCodigo.Items?.[0] ?? byDni.Items?.[0]) as any ?? null
}

/** Oculta el correo para confirmarlo sin exponerlo: jo****@gmail.com */
function enmascarar(email: string): string {
  const [u, d] = email.split('@')
  if (!d) return '***'
  const vis = u.slice(0, 2)
  return `${vis}${'*'.repeat(Math.max(3, u.length - 2))}@${d}`
}

/* ────────────────────────────────────────────────────────────────────────
 * 1 · Primer ingreso
 * ────────────────────────────────────────────────────────────────────── */

export async function completarPrimerIngreso(input: {
  password: string
  confirmacion: string
  personalEmail: string
  phone?: string
}): Promise<Result> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: 'No autenticado' }
  const profileId = (session.user as any).profileId as string
  if (!profileId) return { ok: false, error: 'Perfil no encontrado' }

  const err = validarPassword(input.password)
  if (err) return { ok: false, error: err }
  if (input.password !== input.confirmacion) return { ok: false, error: 'Las contraseñas no coinciden' }

  const personalEmail = (input.personalEmail ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(personalEmail))
    return { ok: false, error: 'Ingresa un correo personal válido: es el único modo de recuperar tu cuenta' }

  const { Item: profile } = await ddb.send(new GetCommand({
    TableName: TABLE.profiles, Key: { profileId },
    ProjectionExpression: 'profileId, userId, fullName',
  }))
  if (!profile) return { ok: false, error: 'Perfil no encontrado' }
  const userId = (profile as any).userId
  if (!userId) return { ok: false, error: 'La cuenta no tiene acceso configurado' }

  const phone = (input.phone ?? '').trim()

  await ddb.send(new UpdateCommand({
    TableName: TABLE.users,
    Key: { userId },
    UpdateExpression: 'SET passwordHash = :ph, mustChangePassword = :f, updatedAt = :ts REMOVE resetTokenHash, resetTokenExp, resetIntentos',
    ExpressionAttributeValues: { ':ph': await bcrypt.hash(input.password, 12), ':f': false, ':ts': now() },
  }))

  await ddb.send(new UpdateCommand({
    TableName: TABLE.profiles,
    Key: { profileId },
    UpdateExpression: phone
      ? 'SET personalEmail = :e, phone = :p, updatedAt = :ts'
      : 'SET personalEmail = :e, updatedAt = :ts',
    ExpressionAttributeValues: phone
      ? { ':e': personalEmail, ':p': phone, ':ts': now() }
      : { ':e': personalEmail, ':ts': now() },
  }))

  // Aviso de cortesía: si falla el correo, el ingreso igual quedó completo.
  try {
    await sendMail({
      to: personalEmail,
      subject: `${companyConfig.shortName ?? 'Compañía 163'} — Tu cuenta quedó activada`,
      html: `<p>Hola ${(profile as any).fullName}:</p>
             <p>Tu cuenta del sistema interno quedó activada y este correo quedó registrado
             para recuperar tu acceso si olvidás la contraseña.</p>
             <p>Si no fuiste vos, avisá a la jefatura de inmediato.</p>`,
      text: 'Tu cuenta del sistema interno quedó activada.',
    })
  } catch { /* el correo es secundario */ }

  return { ok: true }
}

/* ────────────────────────────────────────────────────────────────────────
 * 2 · Recuperación de cuenta
 * ────────────────────────────────────────────────────────────────────── */

/**
 * Envía un código al correo personal registrado. Responde siempre igual,
 * exista o no la cuenta, para no revelar quién está dado de alta.
 */
export async function solicitarRecuperacion(identificador: string): Promise<
  { ok: true; hint: string | null }
> {
  const profile = await buscarPerfil(identificador)
  const personalEmail = profile?.personalEmail as string | undefined
  if (!profile || !profile.userId || !personalEmail) return { ok: true, hint: null }

  const codigo = String(Math.floor(100000 + Math.random() * 900000))
  const exp = new Date(Date.now() + TOKEN_MIN * 60_000).toISOString()

  await ddb.send(new UpdateCommand({
    TableName: TABLE.users,
    Key: { userId: profile.userId },
    UpdateExpression: 'SET resetTokenHash = :h, resetTokenExp = :e, resetIntentos = :z, updatedAt = :ts',
    ExpressionAttributeValues: {
      ':h': await bcrypt.hash(codigo, 10), ':e': exp, ':z': 0, ':ts': now(),
    },
  }))

  try {
    await sendMail({
      to: personalEmail,
      subject: `${companyConfig.shortName ?? 'Compañía 163'} — Código para recuperar tu cuenta`,
      html: `<p>Hola ${profile.fullName}:</p>
             <p>Tu código para recuperar el acceso es:</p>
             <p style="font-size:26px;letter-spacing:5px;font-weight:bold">${codigo}</p>
             <p>Vence en ${TOKEN_MIN} minutos. Si no lo pediste vos, ignorá este mensaje
             y avisá a la jefatura.</p>`,
      text: `Código para recuperar tu cuenta: ${codigo} (vence en ${TOKEN_MIN} minutos)`,
    })
  } catch {
    return { ok: true, hint: null }
  }

  return { ok: true, hint: enmascarar(personalEmail) }
}

export async function confirmarRecuperacion(input: {
  identificador: string
  codigo: string
  password: string
  confirmacion: string
}): Promise<Result> {
  const err = validarPassword(input.password)
  if (err) return { ok: false, error: err }
  if (input.password !== input.confirmacion) return { ok: false, error: 'Las contraseñas no coinciden' }

  const profile = await buscarPerfil(input.identificador)
  if (!profile?.userId) return { ok: false, error: 'Código inválido o vencido' }

  const { Item: user } = await ddb.send(new GetCommand({ TableName: TABLE.users, Key: { userId: profile.userId } }))
  const hash = (user as any)?.resetTokenHash as string | undefined
  const exp = (user as any)?.resetTokenExp as string | undefined
  const intentos = ((user as any)?.resetIntentos as number | undefined) ?? 0

  if (!hash || !exp || new Date(exp).getTime() < Date.now())
    return { ok: false, error: 'Código inválido o vencido' }
  if (intentos >= MAX_INTENTOS)
    return { ok: false, error: 'Demasiados intentos. Pedí un código nuevo.' }

  const valido = await bcrypt.compare((input.codigo ?? '').trim(), hash)
  if (!valido) {
    await ddb.send(new UpdateCommand({
      TableName: TABLE.users, Key: { userId: profile.userId },
      UpdateExpression: 'SET resetIntentos = :i, updatedAt = :ts',
      ExpressionAttributeValues: { ':i': intentos + 1, ':ts': now() },
    }))
    return { ok: false, error: 'Código inválido o vencido' }
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE.users,
    Key: { userId: profile.userId },
    UpdateExpression: 'SET passwordHash = :ph, mustChangePassword = :f, updatedAt = :ts REMOVE resetTokenHash, resetTokenExp, resetIntentos',
    ExpressionAttributeValues: { ':ph': await bcrypt.hash(input.password, 12), ':f': false, ':ts': now() },
  }))

  return { ok: true }
}
