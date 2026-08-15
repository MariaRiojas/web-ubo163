import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ddb, TABLE, GetCommand } from '@/lib/db/dynamodb'
import { getParqueMotorList, esEfectivoActivo } from '@/lib/parque-motor/get-data'
import { ParqueMotorListClient } from '@/components/parque-motor/list-client'

export const dynamic = 'force-dynamic'

export default async function ParqueMotorPage() {
  const session = await auth()
  if (!session?.user?.profileId) redirect('/login')

  const { Item: profile } = await ddb.send(new GetCommand({
    TableName: TABLE.profiles, Key: { profileId: session.user.profileId },
  }))
  const canFill = !!profile && esEfectivoActivo(profile.grade as string, profile.status as string)

  const { machines, date } = await getParqueMotorList()

  return (
    <div className="max-w-[1100px]">
      <ParqueMotorListClient machines={machines} date={date} canFill={canFill} />
    </div>
  )
}
