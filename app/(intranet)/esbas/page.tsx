import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { EsbasClient } from "./esbas-client"
import { GraduationCap } from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"
import { LESSONS, SPECIALTIES, getAvailableLessons, getUnlockedSpecialties, calculateProgress } from "@/data/esbas-courses"

// Mock del progreso del usuario — en producción: await db.query.esbasProgress.findMany({ where: eq(esbasProgress.profileId, profile.id) })
const MOCK_COMPLETED_LESSONS = [1, 2, 3, 4, 5]
const MOCK_IN_PROGRESS_LESSON = 6

// Mock de aspirantes para la vista de Instrucción — en producción: query DB
const MOCK_STUDENTS = [
  { id: 'a1', name: 'Aspirante González Pérez', dni: '70000013', completedLessons: [1, 2, 3, 4, 5], inProgress: 6 },
  { id: 'a2', name: 'Aspirante Mamani Torres', dni: '70000014', completedLessons: [1, 2, 3], inProgress: 4 },
  { id: 'a3', name: 'Aspirante Ríos Castillo', dni: '70000015', completedLessons: [1], inProgress: 2 },
]

export default async function EsbasPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canManage  = permissions.includes('esbas.manage')
  const canInstruct = permissions.includes('esbas.instruct')
  const grade      = session.user.grade ?? 'aspirante'
  const userName   = session.user.name ?? ''

  const completedIds = MOCK_COMPLETED_LESSONS
  const progress = calculateProgress(completedIds)
  const availableLessons = getAvailableLessons(completedIds)
  const unlockedSpecialties = getUnlockedSpecialties(completedIds)

  return (
    <div>
      <PageHeader
        icon={GraduationCap}
        title="ESBAS — Escuela de Bomberos"
        description="Malla curricular y progreso de capacitación · NDR Malla Curricular CGBVP"
        normativeRef="NDR Malla Curricular"
      />
      <EsbasClient
        lessons={LESSONS}
        specialties={SPECIALTIES}
        completedIds={completedIds}
        inProgressId={MOCK_IN_PROGRESS_LESSON}
        availableLessons={availableLessons}
        unlockedSpecialties={unlockedSpecialties}
        progress={progress}
        canManage={canManage}
        canInstruct={canInstruct}
        grade={grade}
        userName={userName}
        students={canManage || canInstruct ? MOCK_STUDENTS : []}
      />
    </div>
  )
}
