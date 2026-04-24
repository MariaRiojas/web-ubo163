import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { emergencies, emergencyTypes } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import { PartesClient } from "./partes-client"

export default async function PartesEmergenciaPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const data = await db.query.emergencies.findMany({
    orderBy: [desc(emergencies.fechaDespacho)],
    with: {
      tipoEmergencia: true,
      alMando: { columns: { id: true, apellidos: true, nombres: true } },
      vehiculos: true,
      dotacion: true,
    },
  })

  const tipos = await db.selectDistinct({ descripcion: emergencyTypes.descripcion }).from(emergencyTypes)
  const distritos = await db.selectDistinct({ distrito: emergencies.distrito }).from(emergencies)

  return (
    <PartesClient
      partes={data}
      tiposOptions={tipos.map((t) => t.descripcion).filter(Boolean) as string[]}
      distritosOptions={distritos.map((d) => d.distrito).filter(Boolean) as string[]}
    />
  )
}
