import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { profiles } from './profiles'

/**
 * Tabla de autenticación — credenciales de acceso al sistema.
 * Separada de `profiles` para que los datos de usuario de NextAuth
 * no mezclen con los datos institucionales del bombero.
 *
 * `id` coincide con `profiles.userId` (FK lógica).
 */
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  /** Email de acceso (puede ser distinto al email institucional) */
  email: text('email').unique(),
  /** Hash bcrypt de la contraseña — NUNCA almacenar en texto plano */
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
