"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, Upload, Paperclip, Trash2, FileText, Image as ImageIcon, Download, X } from "lucide-react"
import { toast } from "sonner"
import { ATTACHMENT_TYPE_LABELS } from "@/lib/inventory/constants"
import { INVENTORY_ATTACHMENT_TYPES, type InventoryAttachmentType } from "@/lib/db/schema/inventory"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface Attachment {
  id: string
  type: InventoryAttachmentType
  fileName: string
  fileSizeBytes: number | null
  mimeType: string | null
  uploadedAt: string | null
  uploadedBy: string
  notes: string | null
  downloadUrl: string
}

interface AttachmentsModalProps {
  inventoryId: string
  itemName: string
  canManage: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AttachmentsModal({ inventoryId, itemName, canManage, open, onOpenChange }: AttachmentsModalProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState<InventoryAttachmentType>("ficha_tecnica")
  const [notes, setNotes] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  // ─── Cargar adjuntos al abrir ──────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/inventory/${inventoryId}/attachments`)
      if (!res.ok) {
        toast.error("No se pudieron cargar los adjuntos")
        return
      }
      const data = await res.json()
      setAttachments(data.attachments ?? [])
    } catch {
      toast.error("Error al cargar adjuntos")
    } finally {
      setLoading(false)
    }
  }, [inventoryId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  // ─── Subir archivo ─────────────────────────────────────────
  const handleUpload = useCallback(
    async (file: File) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Archivo mayor a 10 MB")
        return
      }

      setUploading(true)
      try {
        // 1. Pedir presigned URL
        const presignRes = await fetch("/api/storage/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: "inventory",
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            resourceId: inventoryId,
            sizeBytes: file.size,
          }),
        })
        if (!presignRes.ok) {
          const err = await presignRes.json().catch(() => ({}))
          toast.error(err.error ?? "No se pudo obtener URL de subida")
          return
        }
        const { presignedUrl, key } = await presignRes.json()

        // 2. Subir a S3
        const uploadRes = await fetch(presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        })
        if (!uploadRes.ok) {
          toast.error("Falló la subida a S3")
          return
        }

        // 3. Registrar adjunto en BD
        const registerRes = await fetch(`/api/inventory/${inventoryId}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: selectedType,
            fileName: file.name,
            fileKey: key,
            fileSizeBytes: file.size,
            mimeType: file.type || "application/octet-stream",
            notes: notes.trim() || undefined,
          }),
        })
        if (!registerRes.ok) {
          const err = await registerRes.json().catch(() => ({}))
          toast.error(err.error ?? "No se pudo registrar el adjunto")
          return
        }

        toast.success("Adjunto subido")
        setNotes("")
        await load()
      } catch (err: any) {
        toast.error(err?.message ?? "Error al subir")
      } finally {
        setUploading(false)
        if (fileRef.current) fileRef.current.value = ""
      }
    },
    [inventoryId, selectedType, notes, load]
  )

  // ─── Eliminar adjunto ──────────────────────────────────────
  const handleDelete = useCallback(
    async (attId: string) => {
      if (!confirm("¿Eliminar este adjunto? Esta acción no se puede deshacer.")) return
      try {
        const res = await fetch(`/api/inventory/attachments/${attId}`, {
          method: "DELETE",
        })
        if (!res.ok) {
          toast.error("No se pudo eliminar")
          return
        }
        toast.success("Adjunto eliminado")
        await load()
      } catch {
        toast.error("Error al eliminar")
      }
    },
    [load]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            Adjuntos — {itemName}
          </DialogTitle>
        </DialogHeader>

        {canManage && (
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <div className="flex items-center gap-2">
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as InventoryAttachmentType)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_ATTACHMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{ATTACHMENT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleUpload(f)
                }}
              />
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Subir archivo
              </Button>
            </div>

            <Input
              placeholder="Nota opcional (ej: 'Acta firmada el 15-mar-2026')"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={uploading}
            />

            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG o WEBP · Máximo 10 MB
            </p>
          </div>
        )}

        {/* Lista de adjuntos */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : attachments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay adjuntos todavía
            </div>
          ) : (
            attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                {att.mimeType?.startsWith("image/") ? (
                  <ImageIcon className="w-8 h-8 text-primary flex-shrink-0" />
                ) : (
                  <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{att.fileName}</p>
                    <Badge variant="outline" className="text-xs">
                      {ATTACHMENT_TYPE_LABELS[att.type]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(att.fileSizeBytes)} · {att.uploadedBy}
                    {att.uploadedAt && (
                      <> · hace {formatDistanceToNow(new Date(att.uploadedAt), { locale: es })}</>
                    )}
                  </p>
                  {att.notes && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">{att.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                  >
                    <a href={att.downloadUrl} target="_blank" rel="noopener noreferrer" download={att.fileName}>
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                  {canManage && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(att.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "?"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
