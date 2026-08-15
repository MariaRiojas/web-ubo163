import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ddb, TABLE, GetCommand } from '@/lib/db/dynamodb'
import { getMaquinaInspeccion, esEfectivoActivo } from '@/lib/parque-motor/get-data'
import { ChecklistMaquinaClient } from '@/components/parque-motor/checklist-client'

export const dynamic = 'force-dynamic'

export default async function MaquinaChecklistPage({ params }: { params: Promise<{ ref: string }> }) {
  const session = await auth()
  if (!session?.user?.profileId) redirect('/login')

  const { ref } = await params
  const maquinaRef = decodeURIComponent(ref)

  const { Item: profile } = await ddb.send(new GetCommand({
    TableName: TABLE.profiles, Key: { profileId: session.user.profileId },
  }))
  const canFill = !!profile && esEfectivoActivo(profile.grade as string, profile.status as string)

  const data = await getMaquinaInspeccion(maquinaRef)

  return (
    <div className="max-w-[1000px]">
      <ChecklistMaquinaClient data={data} canFill={canFill} />
    </div>
  )
}
