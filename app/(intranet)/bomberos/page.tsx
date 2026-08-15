import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getBomberosListData } from "@/lib/bomberos/get-bomberos-data"
import { GRADE_ABBR } from "@/lib/cgbvp/grades"
import { BomberosClient } from "./bomberos-client"

export const dynamic = 'force-dynamic'

export default async function BomberosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const perms = session.user.permissions as string[]
  if (!perms?.includes("company.view_all") && !perms?.includes("personnel.view_all"))
    redirect("/dashboard")

  const params = await searchParams
  // Default: previous month
  let mes: number | undefined
  let anio: number | undefined
  if (params.mes) {
    const [y, m] = params.mes.split("-").map(Number)
    mes = m
    anio = y
  }

  const data = await getBomberosListData(mes, anio)

  return (
    <BomberosClient
      bomberos={data.bomberos}
      mes={data.mes}
      anio={data.anio}
      totalActivos={data.totalActivos}
      totalEnTurno={data.totalEnTurno}
      totalHoras={data.totalHoras}
      totalEmergencias={data.totalEmergencias}
      gradesOptions={data.gradesOptions}
      gradeLabels={GRADE_ABBR}
      trimestreLabel={data.trimestreLabel}
      trimestreNumero={data.trimestreNumero}
      cumplenNdr={data.cumplenNdr}
      faltanNdr={data.faltanNdr}
      asistieron={data.asistieron}
      porcentajeAsistencia={data.porcentajeAsistencia}
    />
  )
}
