import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PrimerIngresoClient } from '@/components/auth/primer-ingreso-client'

export const dynamic = 'force-dynamic'

/** Primer ingreso: obligatorio mientras la cuenta tenga la clave temporal. */
export default async function PrimerIngresoPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Si ya definió su clave, no tiene nada que hacer acá.
  if ((session.user as any).mustChangePassword !== true) redirect('/dashboard')

  const full = (session.user.name ?? '').trim()
  // "VEGA MENDOZA, José Leandro" → "José"
  const nombre = full.includes(',')
    ? full.split(',')[1].trim().split(/\s+/)[0]
    : full.split(/\s+/)[0] || 'bombero'

  return <PrimerIngresoClient nombre={nombre} />
}
