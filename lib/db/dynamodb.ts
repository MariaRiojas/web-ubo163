import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  BatchGetCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb'

// ─────────────────────────────────────────────────────────────────────────
// Cliente DynamoDB
//
// En Lambda: usa las credenciales del IAM role de la función automáticamente.
// En dev local: usa las credenciales del perfil AWS configurado
//   (AWS_PROFILE=manbuild o variable de entorno AWS_PROFILE).
// ─────────────────────────────────────────────────────────────────────────

const rawClient = new DynamoDBClient({
  region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
  // Para dev local con DynamoDB Local, descomentar:
  // endpoint: process.env.DYNAMODB_ENDPOINT,
})

export const ddb = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: {
    removeUndefinedValues: true,  // evita errores al escribir campos undefined
    convertEmptyValues: false,    // strings vacíos se guardan como tal, no null
    convertClassInstanceToMap: false,
  },
  unmarshallOptions: {
    wrapNumbers: false, // números como JS number, no como NumberValue
  },
})

// Re-exportar comandos para que los queries no tengan que importar de @aws-sdk
export {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  BatchGetCommand,
  BatchWriteCommand,
}

// ─────────────────────────────────────────────────────────────────────────
// Nombres de tablas
//
// TABLE_PREFIX se inyecta por variable de entorno en producción.
// Valor por defecto = 'ubo163-dev' para desarrollo local.
// ─────────────────────────────────────────────────────────────────────────

const PREFIX = process.env.TABLE_PREFIX ?? 'ubo163-dev'

export const TABLE = {
  users:                  `${PREFIX}-users`,
  profiles:               `${PREFIX}-profiles`,
  sectionRoles:           `${PREFIX}-section-roles`,
  sections:               `${PREFIX}-sections`,
  guardReservations:      `${PREFIX}-guard-reservations`,
  guardDormitories:       `${PREFIX}-guard-dormitories`,
  guardBunks:             `${PREFIX}-guard-bunks`,
  guardBeds:              `${PREFIX}-guard-beds`,
  incidents:              `${PREFIX}-incidents`,
  requests:               `${PREFIX}-requests`,
  internalRequests:       `${PREFIX}-internal-requests`,
  serviceHours:           `${PREFIX}-service-hours`,
  inventory:              `${PREFIX}-inventory`,
  inventoryAttachments:   `${PREFIX}-inventory-attachments`,
  machines:               `${PREFIX}-machines`,
  machineCompartments:    `${PREFIX}-machine-compartments`,
  machineChecklists:      `${PREFIX}-machine-checklists`,
  trainingCourses:        `${PREFIX}-training-courses`,
  trainingProgress:       `${PREFIX}-training-progress`,
  trainingCertificates:   `${PREFIX}-training-certificates`,
  emergencies:            `${PREFIX}-emergencies`,
  emergencyCrew:          `${PREFIX}-emergency-crew`,
  cgbvpAttendance:        `${PREFIX}-cgbvp-attendance`,
  cgbvpSync:              `${PREFIX}-cgbvp-sync`,
  cgbvpStatus:            `${PREFIX}-cgbvp-status`,
  announcements:          `${PREFIX}-announcements`,
  contentCalendar:        `${PREFIX}-content-calendar`,
  ics:                    `${PREFIX}-ics`,
} as const

export type TableName = (typeof TABLE)[keyof typeof TABLE]

// ─────────────────────────────────────────────────────────────────────────
// Helpers de paginación y query
// ─────────────────────────────────────────────────────────────────────────

/** Ejecuta un QueryCommand y devuelve todos los items (itera NextToken automáticamente) */
export async function queryAll<T = Record<string, unknown>>(
  params: Parameters<typeof ddb.send<QueryCommand>>[0] extends QueryCommand
    ? ConstructorParameters<typeof QueryCommand>[0]
    : never,
  limit?: number
): Promise<T[]> {
  const items: T[] = []
  let lastKey: Record<string, unknown> | undefined

  do {
    const cmd = new QueryCommand({ ...params, ExclusiveStartKey: lastKey })
    const res = await ddb.send(cmd)
    if (res.Items) items.push(...(res.Items as T[]))
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
    if (limit && items.length >= limit) break
  } while (lastKey)

  return items
}

/** Genera un ID único compatible con UUID v4 (sin depender de crypto.randomUUID en Edge) */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback compatible con Node.js < 19 y Edge runtime antiguo
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Timestamp ISO 8601 actual */
export const now = (): string => new Date().toISOString()
