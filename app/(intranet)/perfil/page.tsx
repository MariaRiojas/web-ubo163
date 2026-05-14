import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPerfilData } from '@/lib/perfil/get-perfil-data'
import { PerfilHero } from '@/components/perfil/perfil-hero'
import { PerfilTabs } from '@/components/perfil/perfil-tabs'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
  const session = await auth()
  if (!session?.user?.profileId) redirect('/login')

  const data = await getPerfilData(session.user.profileId)

  return (
    <div className="max-w-[1400px]">
      <PerfilHero data={data} />
      <PerfilTabs data={data} />
    </div>
  )
}
