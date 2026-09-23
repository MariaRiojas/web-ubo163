/**
 * Tabla DynamoDB: {PREFIX}-users
 * PK: userId (String)
 * GSI: email-index (email → userId)
 */
export interface User {
  userId: string       // PK — coincide con profiles.userId
  email?: string       // GSI: email-index
  passwordHash: string // bcrypt hash
  createdAt: string    // ISO 8601
  updatedAt: string    // ISO 8601

  /** Clave temporal entregada por el jefe: fuerza el flujo de primer ingreso. */
  mustChangePassword?: boolean
  /** Recuperación por correo personal: hash del código enviado + vencimiento ISO. */
  resetTokenHash?: string
  resetTokenExp?: string
  /** Momento del último ingreso exitoso (auditoría de adopción). */
  lastLoginAt?: string
}

export type NewUser = Omit<User, 'createdAt' | 'updatedAt'>
