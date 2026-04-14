import { z } from 'zod'

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'El usuario es requerido')
    .max(100),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(100),
})

export type LoginInput = z.infer<typeof loginSchema>
