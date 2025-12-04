"use client"

import { AreaTemplate } from "@/components/area-template"
import { Wrench } from "lucide-react"

export default function ServiciosPage() {
  return (
    <AreaTemplate
      areaName="Área de Servicios"
      areaKey="servicios"
      icon={Wrench}
      description="Gestión de servicios generales y mantenimiento"
      stats={{
        personal: 8,
        documentos: 95,
        presupuesto: 72,
        tareas: 15
      }}
    />
  )
}
