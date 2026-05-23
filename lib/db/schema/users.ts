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
}

export type NewUser = Omit<User, 'createdAt' | 'updatedAt'>
