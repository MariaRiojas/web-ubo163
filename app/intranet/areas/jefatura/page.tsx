"use client"

import { AreaTemplate } from "@/components/area-template"
import { Shield } from "lucide-react"

export default function JefaturaPage() {
  return (
    <AreaTemplate
      areaName="Jefatura"
      areaKey="jefatura"
      icon={Shield}
      description="Gestión de jefatura y coordinación general"
      stats={{
        personal: 3,
        tareas: 10
      }}
    />
  )
}
