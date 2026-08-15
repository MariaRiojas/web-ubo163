import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { HorasClient } from "./horas-client"
import { Clock } from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"
import { getHorasData } from "@/lib/horas/get-horas-data"

// NDR Ascensos — requisitos mínimos por grado (Norma de Ascensos CGBVP)
const NDR_REQUISITOS: Record<string, { horasTrimestrales: number; guardiasTrimestrales: number; label: string }> = {
  aspirante:          { horasTrimestrales: 150, guardiasTrimestrales: 9, label: 'Aspirante → Seccionario' },
  seccionario:        { horasTrimestrales: 120, guardiasTrimestrales: 6, label: 'Seccionario → Subteniente' },
  subteniente:        { horasTrimestrales: 100, guardiasTrimestrales: 4, label: 'Subteniente → Teniente' },
  teniente:           { horasTrimestrales: 80,  guardiasTrimestrales: 3, label: 'Teniente → Capitán' },
  capitan:            { horasTrimestrales: 60,  guardiasTrimestrales: 2, label: 'Capitán → Ten. Brigadier' },
  teniente_brigadier: { horasTrimestrales: 60,  guardiasTrimestrales: 2, label: 'Ten. Brigadier → Brigadier' },
  brigadier:          { horasTrimestrales: 40,  guardiasTrimestrales: 1, label: 'Brigadier → Brig. Mayor' },
  brigadier_mayor:    { horasTrimestrales: 40,  guardiasTrimestrales: 1, label: 'Brig. Mayor → Brig. General' },
}

export default async function HorasPage() {
  const session = await auth()
  if (!session?.user?.profileId) redirect("/login")

  const permissions = (session.user.permissions as Permission[]) ?? []
  const canViewAll   = permissions.includes('hours.view_all')
  const canVerify    = permissions.includes('hours.verify')
  const canManage    = permissions.includes('hours.manage')
  const grade        = session.user.grade ?? 'seccionario'
  const currentUserName = session.user.name ?? ''

  const requisitos = NDR_REQUISITOS[grade] ?? NDR_REQUISITOS.seccionario

  const { myHours, recentHours, teamSummary, pendingVerification } = await getHorasData(
    session.user.profileId,
    { canViewAll, canVerify },
  )

  const teamSummaryWithRequisitos = teamSummary.map(m => {
    const req = NDR_REQUISITOS[m.grade] ?? NDR_REQUISITOS.seccionario
    return {
      name: m.name,
      grade: m.grade,
      hours: m.hours,
      guardias: m.guardias,
      requiredHours: req.horasTrimestrales,
      requiredGuardias: req.guardiasTrimestrales,
    }
  })

  return (
    <div>
      <PageHeader
        icon={Clock}
        title="Horas de Servicio"
        description="Registro, verificación y seguimiento de horas conforme NDR Ascensos CGBVP"
      />
      <HorasClient
        myHours={myHours}
        recentHours={recentHours}
        teamSummary={canViewAll ? teamSummaryWithRequisitos : []}
        pendingVerification={canVerify ? pendingVerification : []}
        requisitos={requisitos}
        grade={grade}
        currentUserName={currentUserName}
        canVerify={canVerify}
        canManage={canManage}
        canViewAll={canViewAll}
      />
    </div>
  )
}
