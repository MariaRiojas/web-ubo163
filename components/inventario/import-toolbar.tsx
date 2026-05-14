"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Upload } from "lucide-react"
import { toast } from "sonner"
import { ImportInventoryModal } from "./import-modal"

interface ImportToolbarProps {
  canManage: boolean
  /** Tipo de almacén del contexto actual (filtro activo). Si se pasa, el template va contextualizado. */
  contextAlmacen?: string
  /** Callback al terminar import exitoso (refrescar tabla) */
  onImported?: (count: number) => void
}

export function ImportToolbar({ canManage, contextAlmacen, onImported }: ImportToolbarProps) {
  const [importOpen, setImportOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  if (!canManage) return null

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const url = contextAlmacen
        ? `/api/inventory/template?almacen=${encodeURIComponent(contextAlmacen)}`
        : "/api/inventory/template"
      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "No se pudo descargar la plantilla")
        return
      }
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = extractFilename(res.headers.get("content-disposition"))
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
      toast.success("Plantilla descargada")
    } catch (err: any) {
      toast.error(err?.message ?? "Error al descargar")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          {downloading ? "Generando..." : "Descargar plantilla"}
        </Button>
        <Button
          size="sm"
          onClick={() => setImportOpen(true)}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Importar desde Excel
        </Button>
      </div>

      <ImportInventoryModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={(n) => {
          onImported?.(n)
          setImportOpen(false)
        }}
      />
    </>
  )
}

function extractFilename(contentDisposition: string | null): string {
  if (!contentDisposition) return "plantilla-inventario.xlsx"
  const match = /filename="([^"]+)"/.exec(contentDisposition)
  return match?.[1] ?? "plantilla-inventario.xlsx"
}
