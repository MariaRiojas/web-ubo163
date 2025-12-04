"use client"

import { AreaTemplate } from "@/components/area-template"
import { Truck } from "lucide-react"

export default function OperacionesPage() {
  return (
    <AreaTemplate
      areaName="Área de Operaciones"
      areaKey="operaciones"
      icon={Truck}
      description="Gestión de operaciones y emergencias"
      stats={{
        personal: 12,
        tareas: 8
      }}
    />
  )
}
