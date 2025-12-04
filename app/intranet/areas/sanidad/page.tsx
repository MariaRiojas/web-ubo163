"use client"

import { AreaTemplate } from "@/components/area-template"
import { HeartPulse } from "lucide-react"

export default function SanidadPage() {
  return (
    <AreaTemplate
      areaName="Área de Sanidad"
      areaKey="sanidad"
      icon={HeartPulse}
      description="Gestión de salud y primeros auxilios"
      stats={{
        personal: 10,
        tareas: 6
      }}
    />
  )
}
