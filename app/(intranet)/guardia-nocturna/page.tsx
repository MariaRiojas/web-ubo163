import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { GuardiaNocturnaClient } from "./guardia-client"
import { Moon } from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"
import { companyConfig } from "@/company.config"

// Datos de ejemplo — en producción: await getAllBeds() + getShiftsByDateRange()
type BedStatus = 'disponible' | 'ocupada' | 'mantenimiento'
const MOCK_BEDS = Array.from({ length: companyConfig.guardia.totalCamas }, (_, i) => ({
  id: `bed-${i + 1}`,
  number: i + 1,
  sector: i < 4 ? 'Sector A' : i < 8 ? 'Sector B' : 'Sector C',
  status: (i === 5 ? 'mantenimiento' : 'disponible') as BedStatus,
  notes: i === 5 ? 'En revisión por humedad' : null,
}))

// Turnos de ejemplo para la semana actual
const today = new Date()
const MOCK_SHIFTS = [
  { id: 's1', bedId: 'bed-1', date: today.toISOString().split('T')[0], profileName: 'Capitán Herrera Vargas', status: 'confirmada' },
  { id: 's2', bedId: 'bed-2', date: today.toISOString().split('T')[0], profileName: 'Teniente Soto Palacios', status: 'confirmada' },
  { id: 's3', bedId: 'bed-5', date: today.toISOString().split('T')[0], profileName: 'Seccionario Cárdenas López', status: 'reservada' },
  { id: 's4', bedId: 'bed-8', date: today.toISOString().split('T')[0], profileName: 'Seccionaria Díaz Tello', status: 'reservada' },
]

export default async function GuardiaNocturnaPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canManage = permissions.includes('guards.manage') || permissions.includes('guards.approve')
  const canReserve = permissions.includes('guards.reserve')
  const currentUserName = session.user.name ?? ''

  return (
    <div>
      <PageHeader
        icon={Moon}
        title="Guardia Nocturna"
        description={`Horario ${companyConfig.guardia.horarioInicio}h – ${companyConfig.guardia.horarioFin}h · ${companyConfig.guardia.totalCamas} camas disponibles`}
      />
      <GuardiaNocturnaClient
        beds={MOCK_BEDS}
        shifts={MOCK_SHIFTS}
        canManage={canManage}
        canReserve={canReserve}
        currentUserName={currentUserName}
      />
    </div>
  )
}
