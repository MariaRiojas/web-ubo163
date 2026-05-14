"use client"

import { useState, useEffect, useCallback } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Columns, Check } from "lucide-react"
import { COLUMN_PRESETS, EXCEL_COLUMNS } from "@/lib/inventory/constants"

interface ColumnSelectorProps {
  /** Clave del almacén del usuario — usada para guardar preferencias en localStorage */
  storageKey?: string
  /** Columnas visibles actualmente (keys como en EXCEL_COLUMNS) */
  value: string[]
  onChange: (columns: string[]) => void
}

export function ColumnSelector({ storageKey = "inventory", value, onChange }: ColumnSelectorProps) {
  const [open, setOpen] = useState(false)

  // Persistir elección del usuario
  useEffect(() => {
    if (value.length > 0) {
      try {
        localStorage.setItem(`columns:${storageKey}`, JSON.stringify(value))
      } catch {}
    }
  }, [value, storageKey])

  const applyPreset = useCallback(
    (presetName: string) => {
      const preset = COLUMN_PRESETS[presetName]
      if (preset) {
        // Los presets usan camelCase pero nuestras columnas usan snake_case en EXCEL_COLUMNS
        // Mapear: si el preset está en camelCase, buscamos la key equivalente.
        const mapped = preset
          .map((camel) => camelToSnake(camel))
          .filter((k) => EXCEL_COLUMNS.some((c) => c.key === k))
        onChange(mapped.length > 0 ? mapped : preset)
      }
    },
    [onChange]
  )

  const toggleColumn = useCallback(
    (key: string) => {
      if (value.includes(key)) {
        onChange(value.filter((k) => k !== key))
      } else {
        onChange([...value, key])
      }
    },
    [value, onChange]
  )

  const selectAll = () => onChange(EXCEL_COLUMNS.map((c) => c.key))
  const selectNone = () => onChange([])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns className="w-4 h-4" />
          Columnas ({value.length}/{EXCEL_COLUMNS.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <p className="text-xs font-medium text-muted-foreground mb-2">Presets</p>
          <div className="grid grid-cols-2 gap-1">
            {Object.keys(COLUMN_PRESETS).map((name) => (
              <Button
                key={name}
                size="sm"
                variant="ghost"
                className="justify-start h-8 text-xs"
                onClick={() => applyPreset(name)}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>

        <div className="p-3 flex items-center gap-2 border-b">
          <Button size="sm" variant="ghost" onClick={selectAll} className="h-7 text-xs">
            Todas
          </Button>
          <Button size="sm" variant="ghost" onClick={selectNone} className="h-7 text-xs">
            Ninguna
          </Button>
        </div>

        <ScrollArea className="h-72">
          <div className="p-2">
            {EXCEL_COLUMNS.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
              >
                <Checkbox
                  checked={value.includes(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                />
                <span className="flex-1">{col.header}</span>
                {col.required && <span className="text-xs text-destructive">*</span>}
              </label>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

/** Convierte camelCase (presets) a snake_case (EXCEL_COLUMNS keys) */
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase())
}

/** Hook para gestionar selección de columnas con persistencia en localStorage */
export function useColumnSelection(storageKey = "inventory", defaultPreset = "Todo") {
  const [columns, setColumns] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return getPresetSnakeCase(defaultPreset)
    }
    try {
      const saved = localStorage.getItem(`columns:${storageKey}`)
      if (saved) return JSON.parse(saved) as string[]
    } catch {}
    return getPresetSnakeCase(defaultPreset)
  })

  return [columns, setColumns] as const
}

function getPresetSnakeCase(presetName: string): string[] {
  const preset = COLUMN_PRESETS[presetName] ?? COLUMN_PRESETS.Todo
  return preset
    .map((camel) => camel.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase()))
    .filter((k) => EXCEL_COLUMNS.some((c) => c.key === k))
}
