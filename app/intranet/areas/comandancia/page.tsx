"use client"

import { AreaTemplate } from "@/components/area-template"
import { Shield } from "lucide-react"

export default function ComandanciaPage() {
  return (
    <AreaTemplate
      areaName="Comandancia"
      areaKey="comandancia"
      icon={Shield}
      description="Gestión de comandancia y dirección general"
      stats={{
        personal: 1,
        tareas: 5
      }}
    />
  )
}
