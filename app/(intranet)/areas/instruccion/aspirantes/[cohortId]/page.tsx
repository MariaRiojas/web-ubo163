import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Permission } from '@/lib/auth/permissions'
import { CohortDetailClient } from '@/components/aspirantes/cohort-detail-client'

export const dynamic = 'force-dynamic'

export default async function CohortDetailPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const permissions = session.user.permissions as Permission[]
  if (!permissions.includes('area.instruction.view')) redirect('/areas/instruccion')

  const { cohortId } = await params
  const canManage = permissions.includes('area.instruction.manage') || permissions.includes('area.instruction.view')

  return <CohortDetailClient cohortId={cohortId} canManage={canManage} />
}
