/**
 * Abstracción de correo electrónico.
 *
 * - En Lambda (producción): API de SES v2 usando el rol de ejecución. No hace
 *   falta usuario SMTP ni credenciales guardadas; solo que el remitente
 *   (MAIL_FROM) sea una identidad verificada en SES.
 * - En desarrollo: SMTP con nodemailer (Mailpit en localhost:1025).
 *
 * Variables: MAIL_FROM (remitente verificado) · EMAIL_TRANSPORT ('ses'|'smtp')
 * para forzar uno · SMTP_HOST/PORT/SECURE/USER/PASS para el modo SMTP.
 */

import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2"

// ── Elección de transporte ────────────────────────────────────────

/** En Lambda no hay SMTP configurado: se usa la API de SES. */
function transporte(): "ses" | "smtp" {
  const forzado = process.env.EMAIL_TRANSPORT
  if (forzado === "ses" || forzado === "smtp") return forzado
  return process.env.AWS_LAMBDA_FUNCTION_NAME ? "ses" : "smtp"
}

let _ses: SESv2Client | null = null
function sesClient(): SESv2Client {
  if (!_ses) _ses = new SESv2Client({ region: process.env.SES_REGION ?? process.env.AWS_REGION ?? "us-east-1" })
  return _ses
}

// ── Singleton del transporter SMTP (solo desarrollo) ──────────────

let _transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (_transporter) return _transporter

  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST ?? "localhost",
    port:   parseInt(process.env.SMTP_PORT ?? "1025", 10),
    secure: process.env.SMTP_SECURE === "true",
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS ?? "",
          },
        }
      : {}),
  })

  return _transporter
}

// ── Tipos ─────────────────────────────────────────────────────────

export interface SendMailOptions {
  to: string | string[]
  subject: string
  /** Cuerpo HTML del email */
  html: string
  /** Texto plano alternativo (accesibilidad, clientes sin HTML) */
  text?: string
  from?: string
}

// ── Función principal ─────────────────────────────────────────────

/**
 * Envía un correo electrónico.
 *
 * @example
 * await sendMail({
 *   to: "bombero@ejemplo.pe",
 *   subject: "Bienvenido al sistema",
 *   html: "<p>Tu cuenta fue creada.</p>",
 * })
 */
export async function sendMail(options: SendMailOptions): Promise<void> {
  const from = options.from
    ?? process.env.MAIL_FROM
    ?? process.env.SMTP_FROM
    ?? "Compania 163 <no-reply@localhost>"
  const to = Array.isArray(options.to) ? options.to : [options.to]

  if (transporte() === "ses") {
    await sesClient().send(new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: to },
      Content: {
        Simple: {
          Subject: { Data: options.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: options.html, Charset: "UTF-8" },
            ...(options.text ? { Text: { Data: options.text, Charset: "UTF-8" } } : {}),
          },
        },
      },
    }))
    return
  }

  await getTransporter().sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })
}

// ── Templates reutilizables ───────────────────────────────────────

/** Envía notificación de cuenta creada con contraseña temporal */
export async function sendWelcomeEmail(params: {
  to: string
  name: string
  tempPassword: string
  loginUrl: string
}): Promise<void> {
  await sendMail({
    to: params.to,
    subject: "Bienvenido al sistema CUARTEL-CRM",
    html: `
      <h2>Bienvenido, ${params.name}</h2>
      <p>Tu cuenta en el sistema ha sido creada.</p>
      <p><strong>Contraseña temporal:</strong> <code>${params.tempPassword}</code></p>
      <p>Ingresa a <a href="${params.loginUrl}">${params.loginUrl}</a> y cámbiala inmediatamente.</p>
      <hr>
      <p style="color:#888;font-size:12px">Si no solicitaste esta cuenta, ignora este mensaje.</p>
    `,
    text: `Bienvenido, ${params.name}. Tu contraseña temporal es: ${params.tempPassword}. Inicia sesión en ${params.loginUrl}`,
  })
}

/** Envía notificación de contraseña cambiada */
export async function sendPasswordChangedEmail(params: {
  to: string
  name: string
}): Promise<void> {
  await sendMail({
    to: params.to,
    subject: "Tu contraseña fue cambiada",
    html: `
      <h2>Hola, ${params.name}</h2>
      <p>Tu contraseña fue actualizada exitosamente.</p>
      <p>Si no realizaste este cambio, comunícalo a la jefatura de tu compañía inmediatamente.</p>
    `,
    text: `Tu contraseña fue cambiada. Si no lo hiciste tú, contacta a la jefatura.`,
  })
}

/** Envía aviso de guardia nocturna asignada */
export async function sendGuardShiftNotification(params: {
  to: string
  name: string
  date: string
  shift: string
}): Promise<void> {
  await sendMail({
    to: params.to,
    subject: `Guardia Nocturna asignada — ${params.date}`,
    html: `
      <h2>Guardia Nocturna asignada</h2>
      <p>Hola <strong>${params.name}</strong>,</p>
      <p>Se te ha asignado una guardia nocturna:</p>
      <ul>
        <li><strong>Fecha:</strong> ${params.date}</li>
        <li><strong>Turno:</strong> ${params.shift}</li>
      </ul>
      <p>Recuerda presentarte con uniforme reglamentario.</p>
    `,
    text: `Guardia Nocturna asignada: ${params.date} — Turno ${params.shift}.`,
  })
}
