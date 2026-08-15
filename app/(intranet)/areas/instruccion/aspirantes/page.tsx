import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Permission } from '@/lib/auth/permissions'
import { AspirantesClient } from '@/components/aspirantes/aspirantes-client'

export const dynamic = 'force-dynamic'

export default async function AspirantesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const permissions = session.user.permissions as Permission[]
  if (!permissions.includes('area.instruction.view')) redirect('/areas/instruccion')

  const canManage = permissions.includes('area.instruction.manage') || permissions.includes('area.instruction.view')

  return <AspirantesClient canManage={canManage} />
}
