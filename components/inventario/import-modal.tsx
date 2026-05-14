"use client"

import { useState, useCallback, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Upload, Check, AlertTriangle, X, FileSpreadsheet, Download } from "lucide-react"
import { toast } from "sonner"
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CONDITIONS,
  ALMACEN_TIPOS,
  INVENTORY_UNIT_MEASURES,
  EPP_SUBCATEGORIES,
} from "@/lib/db/schema/inventory"
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  ALMACEN_TIPO_LABELS,
  UNIT_MEASURE_LABELS,
  EPP_SUBCATEGORY_LABELS,
  EXCEL_COLUMNS,
} from "@/lib/inventory/constants"
import { MACHINES } from "@/lib/cgbvp/machines"

interface ValidationIssue {
  field: string
  message: string
  level: "error" | "warning"
}

interface RowResult {
  rowIndex: number
  data: Record<string, unknown>
  valid: boolean
  issues: ValidationIssue[]
}

interface Summary {
  total: number
  valid: number
  invalid: number
  warnings: number
}

type Step = "upload" | "preview" | "committing" | "success"
type FilterMode = "all" | "errors" | "warnings" | "valid"

interface ImportInventoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (imported: number) => void
}

export function ImportInventoryModal({ open, onOpenChange, onSuccess }: ImportInventoryModalProps) {
  const [step, setStep] = useState<Step>("upload")
  const [rows, setRows] = useState<RowResult[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, valid: 0, invalid: 0, warnings: 0 })
  const [filter, setFilter] = useState<FilterMode>("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep("upload")
    setRows([])
    setSummary({ total: 0, valid: 0, invalid: 0, warnings: 0 })
    setFilter("all")
    setSearch("")
    setImportedCount(0)
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  // ─── Paso 1: subir archivo y validar ─────────────────────────
  const handleFileSelected = useCallback(async (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      toast.error("Solo se aceptan archivos .xlsx")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Archivo mayor a 10 MB")
      return
    }

    setLoading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/inventory/import?mode=validate", {
        method: "POST",
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "No se pudo leer el archivo")
        return
      }
      const payload = (await res.json()) as { rows: RowResult[]; summary: Summary }
      setRows(payload.rows)
      setSummary(payload.summary)
      setStep("preview")
      if (payload.summary.total === 0) {
        toast.warning("El archivo no tiene filas con datos")
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Error al procesar el archivo")
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Paso 2: editar fila inline ──────────────────────────────
  const updateCell = useCallback((rowIndex: number, field: string, value: unknown) => {
    setRows((prev) =>
      prev.map((r) =>
        r.rowIndex === rowIndex
          ? { ...r, data: { ...r.data, [field]: value === "" ? null : value } }
          : r
      )
    )
  }, [])

  // ─── Paso 2: revalidar tras edición ──────────────────────────
  const revalidate = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/inventory/import?mode=validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.map((r) => ({ rowIndex: r.rowIndex, data: r.data })),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Revalidación falló")
        return
      }
      const payload = (await res.json()) as { rows: RowResult[]; summary: Summary }
      setRows(payload.rows)
      setSummary(payload.summary)
      toast.success("Revalidado")
    } catch (err: any) {
      toast.error(err?.message ?? "Error al revalidar")
    } finally {
      setLoading(false)
    }
  }, [rows])

  // ─── Paso 3: commit ──────────────────────────────────────────
  const commit = useCallback(async () => {
    if (summary.invalid > 0) {
      toast.error("Corregí los errores antes de importar")
      return
    }
    setStep("committing")
    setLoading(true)
    try {
      const res = await fetch("/api/inventory/import?mode=commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.map((r) => ({ rowIndex: r.rowIndex, data: r.data })),
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        toast.error(payload.error ?? "Import falló")
        setStep("preview")
        return
      }
      setImportedCount(payload.imported ?? 0)
      setStep("success")
      onSuccess?.(payload.imported ?? 0)
    } catch (err: any) {
      toast.error(err?.message ?? "Error al importar")
      setStep("preview")
    } finally {
      setLoading(false)
    }
  }, [rows, summary.invalid, onSuccess])

  // ─── Derivados ───────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let list = rows
    if (filter === "errors") list = list.filter((r) => !r.valid)
    else if (filter === "warnings")
      list = list.filter((r) => r.issues.some((i) => i.level === "warning"))
    else if (filter === "valid")
      list = list.filter((r) => r.valid && r.issues.length === 0)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r) =>
        JSON.stringify(r.data).toLowerCase().includes(q)
      )
    }
    return list
  }, [rows, filter, search])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar inventario desde Excel
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <UploadStep
            loading={loading}
            onFileSelected={handleFileSelected}
            fileRef={fileRef}
          />
        )}

        {step === "preview" && (
          <PreviewStep
            rows={filteredRows}
            summary={summary}
            filter={filter}
            setFilter={setFilter}
            search={search}
            setSearch={setSearch}
            loading={loading}
            onUpdateCell={updateCell}
            onRevalidate={revalidate}
            onCommit={commit}
            onBack={() => setStep("upload")}
          />
        )}

        {step === "committing" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Importando {summary.valid} ítems...</p>
          </div>
        )}

        {step === "success" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold">¡Importación completada!</h3>
            <p className="text-muted-foreground">
              Se importaron <strong>{importedCount}</strong> ítems correctamente.
            </p>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Cerrar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Paso 1: Upload
// ─────────────────────────────────────────────────────────────────────

function UploadStep({
  loading,
  onFileSelected,
  fileRef,
}: {
  loading: boolean
  onFileSelected: (file: File) => void
  fileRef: React.RefObject<HTMLInputElement | null>
}) {
  const [dragging, setDragging] = useState(false)

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 py-12">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) onFileSelected(file)
        }}
        className={`w-full max-w-2xl border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Arrastrá el archivo Excel acá</h3>
        <p className="text-sm text-muted-foreground mb-4">
          o hacé click para seleccionar
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFileSelected(f)
          }}
        />
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          variant="outline"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Seleccionar archivo
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          Formato: .xlsx · Tamaño máximo: 10 MB · Máximo 500 filas por archivo
        </p>
      </div>

      <Alert className="max-w-2xl">
        <Download className="w-4 h-4" />
        <AlertDescription>
          ¿Primera vez? Descargá la plantilla desde el botón <strong>"Descargar plantilla"</strong> de la página de inventario, llená los datos y subila acá.
        </AlertDescription>
      </Alert>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Paso 2: Preview editable
// ─────────────────────────────────────────────────────────────────────

function PreviewStep({
  rows,
  summary,
  filter,
  setFilter,
  search,
  setSearch,
  loading,
  onUpdateCell,
  onRevalidate,
  onCommit,
  onBack,
}: {
  rows: RowResult[]
  summary: Summary
  filter: FilterMode
  setFilter: (f: FilterMode) => void
  search: string
  setSearch: (s: string) => void
  loading: boolean
  onUpdateCell: (rowIndex: number, field: string, value: unknown) => void
  onRevalidate: () => void
  onCommit: () => void
  onBack: () => void
}) {
  // Columnas que se muestran en preview (ordenadas por relevancia)
  const VISIBLE_COLUMNS = EXCEL_COLUMNS.slice(0, 17) // Top 17 más importantes
  const canCommit = summary.invalid === 0 && summary.total > 0

  return (
    <>
      {/* Stats + filtros */}
      <div className="px-6 py-3 border-b bg-muted/30 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Check className="w-3 h-3 text-green-600" />
            {summary.valid} válidas
          </Badge>
          {summary.invalid > 0 && (
            <Badge variant="destructive" className="gap-1">
              <X className="w-3 h-3" />
              {summary.invalid} con error
            </Badge>
          )}
          {summary.warnings > 0 && (
            <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-700">
              <AlertTriangle className="w-3 h-3" />
              {summary.warnings} advertencias
            </Badge>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-48"
          />
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las filas</SelectItem>
              <SelectItem value="errors">Solo con error</SelectItem>
              <SelectItem value="warnings">Solo advertencias</SelectItem>
              <SelectItem value="valid">Solo válidas</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={onRevalidate}
            disabled={loading}
            className="h-8"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Revalidar
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <ScrollArea className="flex-1 overflow-auto">
        <div className="min-w-max">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-16">Fila</th>
                <th className="px-3 py-2 text-left font-medium w-20">Estado</th>
                {VISIBLE_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-left font-medium whitespace-nowrap"
                  >
                    {col.header}
                    {col.required && <span className="text-destructive ml-0.5">*</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={VISIBLE_COLUMNS.length + 2} className="px-3 py-8 text-center text-muted-foreground">
                    No hay filas que coincidan con el filtro actual
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const hasErrors = row.issues.some((i) => i.level === "error")
                const hasWarnings = row.issues.some((i) => i.level === "warning")
                const errorFields = new Set(
                  row.issues.filter((i) => i.level === "error").map((i) => i.field)
                )

                return (
                  <tr
                    key={row.rowIndex}
                    className={
                      hasErrors
                        ? "bg-red-50 dark:bg-red-950/20"
                        : hasWarnings
                          ? "bg-amber-50 dark:bg-amber-950/20"
                          : ""
                    }
                  >
                    <td className="px-3 py-1.5 text-muted-foreground border-b">
                      {row.rowIndex}
                    </td>
                    <td className="px-3 py-1.5 border-b">
                      {hasErrors ? (
                        <span title={row.issues.filter((i) => i.level === "error").map((i) => i.message).join("\n")}>
                          <X className="w-4 h-4 text-destructive" />
                        </span>
                      ) : hasWarnings ? (
                        <span title={row.issues.filter((i) => i.level === "warning").map((i) => i.message).join("\n")}>
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        </span>
                      ) : (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </td>
                    {VISIBLE_COLUMNS.map((col) => {
                      const value = row.data[col.key]
                      const hasErr = errorFields.has(col.key)
                      return (
                        <td
                          key={col.key}
                          className={`px-1 py-1 border-b ${hasErr ? "border-destructive border" : ""}`}
                          title={
                            hasErr
                              ? row.issues.find((i) => i.field === col.key && i.level === "error")?.message
                              : undefined
                          }
                        >
                          <EditableCell
                            columnKey={col.key}
                            value={value}
                            onChange={(v) => onUpdateCell(row.rowIndex, col.key, v)}
                            required={col.required}
                          />
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </ScrollArea>

      <DialogFooter className="px-6 py-4 border-t flex items-center gap-3">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          ← Volver a subir
        </Button>
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground">
          {summary.total} filas totales
        </span>
        <Button
          onClick={onCommit}
          disabled={!canCommit || loading}
          size="lg"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          Importar {summary.valid} válidas
        </Button>
      </DialogFooter>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Celda editable — decide input según columna
// ─────────────────────────────────────────────────────────────────────

function EditableCell({
  columnKey,
  value,
  onChange,
  required,
}: {
  columnKey: string
  value: unknown
  onChange: (v: unknown) => void
  required: boolean
}) {
  const stringValue = value === null || value === undefined ? "" : String(value)

  // Dropdowns según columna
  if (columnKey === "categoria") {
    return (
      <Select value={stringValue} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-36 border-0 bg-transparent hover:bg-muted">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {INVENTORY_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (columnKey === "subcategoria") {
    return (
      <Select value={stringValue} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-32 border-0 bg-transparent hover:bg-muted">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {EPP_SUBCATEGORIES.map((s) => (
            <SelectItem key={s} value={s}>{EPP_SUBCATEGORY_LABELS[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (columnKey === "condicion") {
    return (
      <Select value={stringValue} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-32 border-0 bg-transparent hover:bg-muted">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {INVENTORY_CONDITIONS.map((c) => (
            <SelectItem key={c} value={c}>{CONDITION_LABELS[c]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (columnKey === "almacen_tipo") {
    return (
      <Select value={stringValue} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-44 border-0 bg-transparent hover:bg-muted">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {ALMACEN_TIPOS.map((t) => (
            <SelectItem key={t} value={t}>{ALMACEN_TIPO_LABELS[t]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (columnKey === "almacen_referencia") {
    return (
      <Select value={stringValue} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-36 border-0 bg-transparent hover:bg-muted">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">(ninguna)</SelectItem>
          {MACHINES.map((m) => (
            <SelectItem key={m.slug} value={m.label}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (columnKey === "unidad_medida") {
    return (
      <Select value={stringValue} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-28 border-0 bg-transparent hover:bg-muted">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {INVENTORY_UNIT_MEASURES.map((u) => (
            <SelectItem key={u} value={u}>{UNIT_MEASURE_LABELS[u]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (columnKey === "requiere_mantenimiento" || columnKey === "requiere_certificacion") {
    return (
      <Select value={stringValue} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-20 border-0 bg-transparent hover:bg-muted">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">—</SelectItem>
          <SelectItem value="Sí">Sí</SelectItem>
          <SelectItem value="No">No</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  // Fecha (tipo texto por simplicidad — aceptamos ISO o DD/MM/AAAA)
  if (columnKey.startsWith("fecha_") || columnKey === "ultima_mantencion" || columnKey === "proxima_mantencion") {
    return (
      <Input
        type="date"
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-36 border-0 bg-transparent focus:bg-background"
      />
    )
  }

  // Numéricos
  if (columnKey === "cantidad" || columnKey === "año_fabricacion" || columnKey === "vida_util_meses" || columnKey === "intervalo_mantenimiento_meses" || columnKey === "valor_referencial") {
    return (
      <Input
        type="number"
        value={stringValue}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="h-7 w-24 border-0 bg-transparent focus:bg-background"
        required={required}
      />
    )
  }

  // Texto libre
  return (
    <Input
      value={stringValue}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 min-w-28 w-full border-0 bg-transparent focus:bg-background"
      required={required}
    />
  )
}
