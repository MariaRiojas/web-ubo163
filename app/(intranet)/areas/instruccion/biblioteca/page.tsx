import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ddb, TABLE, ScanCommand } from '@/lib/db/dynamodb'
import { InstruccionBibliotecaClient } from '@/components/areas/instruccion-biblioteca-client'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function InstruccionBibliotecaPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!permissions.includes('area.instruction.manage') && !permissions.includes('area.instruction.view')) {
    redirect('/dashboard')
  }

  const res = await ddb.send(new ScanCommand({ TableName: TABLE.libraryDocuments }))
  const docs = ((res.Items ?? []) as any[]).sort((a, b) =>
    (b.uploadedAt ?? '').localeCompare(a.uploadedAt ?? '')
  )

  const canManage = permissions.includes('area.instruction.manage')

  return (
    <div className="max-w-[1400px]">
      <InstruccionBibliotecaClient
        initialDocs={docs}
        canManage={canManage}
      />
    </div>
  )
}
