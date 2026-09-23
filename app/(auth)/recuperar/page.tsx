import { RecuperarClient } from '@/components/auth/recuperar-client'

export const dynamic = 'force-dynamic'

/** Recuperación de cuenta por código enviado al correo personal registrado. */
export default function RecuperarPage() {
  return <RecuperarClient />
}
