import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/intranet/page-header"
import { HorasClient } from "./horas-client"
import { Clock } from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"

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

// Datos de ejemplo — en producción: await getServiceHoursSummary(profileId, quarter)
const today = new Date()
const MOCK_MY_HOURS = {
  trimestre: `T${Math.ceil((today.getMonth() + 1) / 3)} ${today.getFullYear()}`,
  totalHoras: 87.5,
  guardias: 4,
  porTipo: {
    guardia_nocturna: 48,
    emergencia: 16,
    instruccion: 12,
    administrativo: 6,
    mantenimiento: 4,
    evento_institucional: 1.5,
    comision: 0,
  },
}

const MOCK_RECENT_HOURS = [
  { id: 'h1', date: '2026-04-10', type: 'guardia_nocturna', hours: 12, description: 'Guardia nocturna — Cama 3', verified: true },
  { id: 'h2', date: '2026-04-08', type: 'emergencia', hours: 3, description: 'Emergencia vehicular Av. Principal', verified: true },
  { id: 'h3', date: '2026-04-05', type: 'instruccion', hours: 4, description: 'Taller de rescate vertical', verified: true },
  { id: 'h4', date: '2026-04-03', type: 'guardia_nocturna', hours: 12, description: 'Guardia nocturna — Cama 7', verified: true },
  { id: 'h5', date: '2026-04-01', type: 'administrativo', hours: 2, description: 'Reunión de sección mensual', verified: false },
  { id: 'h6', date: '2026-03-28', type: 'emergencia', hours: 2, description: 'Incendio forestal zona norte', verified: true },
  { id: 'h7', date: '2026-03-22', type: 'guardia_nocturna', hours: 12, description: 'Guardia nocturna — Cama 1', verified: true },
]

// Resumen de equipo — visible para jefes
const MOCK_TEAM_SUMMARY = [
  { name: 'Capitán Herrera Vargas',    grade: 'capitan',     hours: 72, guardias: 3, requiredHours: 60, requiredGuardias: 2 },
  { name: 'Seccionario Cárdenas López', grade: 'seccionario', hours: 87, guardias: 4, requiredHours: 120, requiredGuardias: 6 },
  { name: 'Seccionario Mendoza Quiroz', grade: 'seccionario', hours: 54, guardias: 2, requiredHours: 120, requiredGuardias: 6 },
  { name: 'Seccionaria Quispe Huanca', grade: 'seccionario', hours: 32, guardias: 1, requiredHours: 120, requiredGuardias: 6 },
  { name: 'Teniente Soto Palacios',    grade: 'teniente',    hours: 91, guardias: 4, requiredHours: 80, requiredGuardias: 3 },
  { name: 'Teniente Flores Medina',    grade: 'teniente',    hours: 45, guardias: 2, requiredHours: 80, requiredGuardias: 3 },
  { name: 'Subteniente Ruiz Palomino', grade: 'subteniente', hours: 110, guardias: 5, requiredHours: 100, requiredGuardias: 4 },
]

// Horas pendientes de verificación — visible para jefes con hours.verify
const MOCK_PENDING_VERIFICATION = [
  { id: 'pv1', profileName: 'Seccionario Cárdenas López', date: '2026-04-09', type: 'instruccion', hours: 4, description: 'Práctica de cuerdas nivel 1', submittedAt: '2026-04-09T20:00:00Z' },
  { id: 'pv2', profileName: 'Seccionaria Quispe Huanca',  date: '2026-04-08', type: 'administrativo', hours: 2, description: 'Inventario de almacén', submittedAt: '2026-04-08T18:30:00Z' },
  { id: 'pv3', profileName: 'Teniente Flores Medina',     date: '2026-04-07', type: 'evento_institucional', hours: 3, description: 'Visita escolar Cía. 163', submittedAt: '2026-04-07T16:00:00Z' },
]

export default async function HorasPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const permissions = session.user.permissions as Permission[]
  const canViewAll   = permissions.includes('hours.view_all')
  const canVerify    = permissions.includes('hours.verify')
  const canManage    = permissions.includes('hours.manage')
  const grade        = session.user.grade ?? 'seccionario'
  const currentUserName = session.user.name ?? ''

  const requisitos = NDR_REQUISITOS[grade] ?? NDR_REQUISITOS.seccionario

  return (
    <div>
      <PageHeader
        icon={Clock}
        title="Horas de Servicio"
        description="Registro, verificación y seguimiento de horas conforme NDR Ascensos CGBVP"
      />
      <HorasClient
        myHours={MOCK_MY_HOURS}
        recentHours={MOCK_RECENT_HOURS}
        teamSummary={canViewAll ? MOCK_TEAM_SUMMARY : []}
        pendingVerification={canVerify ? MOCK_PENDING_VERIFICATION : []}
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
