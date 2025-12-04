"use client"

import { AreaTemplate } from "@/components/area-template"
import { ImageIcon } from "lucide-react"

export default function ImagenPage() {
  return (
    <AreaTemplate
      areaName="Área de Imagen"
      areaKey="imagen"
      icon={ImageIcon}
      description="Gestión de comunicaciones e imagen institucional"
      stats={{
        personal: 5,
        tareas: 4
      }}
    />
  )
}
