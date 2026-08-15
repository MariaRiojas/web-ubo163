import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ddb, TABLE, ScanCommand } from '@/lib/db/dynamodb'
import { getProgresoData } from '@/lib/areas/get-progreso-data'
import { getEvaluacionesData } from '@/lib/areas/get-evaluaciones-data'
import { FormacionWorkspace, type FormacionTab } from '@/components/areas/instruccion-formacion-workspace'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

const VALID_TABS: FormacionTab[] = ['cursos', 'progreso', 'evaluaciones']

export default async function InstruccionFormacionPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!permissions.includes('area.instruction.manage') && !permissions.includes('area.instruction.view')) {
    redirect('/dashboard')
  }

  const { tab } = await searchParams
  const initialTab: FormacionTab = VALID_TABS.includes(tab as FormacionTab) ? (tab as FormacionTab) : 'cursos'

  const [coursesRes, progreso, evaluaciones] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: TABLE.trainingCourses })),
    getProgresoData(),
    getEvaluacionesData(),
  ])
  const courses = ((coursesRes.Items ?? []) as any[]).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

  return (
    <div className="max-w-[1400px]">
      <FormacionWorkspace
        initialTab={initialTab}
        courses={courses}
        progreso={progreso}
        evaluaciones={evaluaciones}
        canManageCursos={permissions.includes('area.instruction.manage')}
        canManageProgreso={permissions.includes('training.manage')}
        canGrade={permissions.includes('training.manage')}
      />
    </div>
  )
}
