"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { registerMovement, type MovementType, type Procedencia } from "@/lib/inventario/actions"
import type { InventoryItemDB } from "@/lib/inventario/get-items"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Package, ChevronDown,
} from "lucide-react"

const PROCEDENCIA_OPTIONS: Procedencia[] = [
  'INBP',
  'CGBVP',
  'INSTITUCIÓN PÚBLICA',
  'INSTITUCIÓN PRIVADA',
  'OTRO',
]

interface Props {
  item: InventoryItemDB
  registeredByName: string
}

export function MovimientoForm({ item, registeredByName }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [type, setType] = useState<MovementType>('SALIDA')
  const [procedencia, setProcedencia] = useState<Procedencia>('CGBVP')
  const [quantity, setQuantity] = useState('1')
  const [description, setDescription] = useState('')
  const [observations, setObservations] = useState('')
  const [done, setDone] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const qty = parseInt(quantity)
    if (!qty || qty < 1) { toast.error('La cantidad debe ser al menos 1'); return }
    if (!description.trim()) { toast.error('La descripción es requerida'); return }
    if (!observations.trim()) { toast.error('Las observaciones son requeridas'); return }

    startTransition(async () => {
      try {
        const res = await registerMovement({
          itemId: item.itemId,
          itemName: item.name,
          type,
          procedencia: type === 'INGRESO' ? procedencia : null,
          quantity: qty,
          description: description.trim(),
          observations: observations.trim(),
        })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        setDone(true)
      } catch {
        toast.error('Error inesperado. Inténtelo de nuevo.')
      }
    })
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <div>
          <p className="text-xl font-semibold" style={{ color: 'var(--bone)' }}>
            {type === 'INGRESO' ? 'Ingreso' : 'Salida'} registrado
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--steel)' }}>
            {item.name} · {quantity} {item.unitMeasure ?? 'unidad(es)'}
          </p>
        </div>
        <Button
          onClick={() => router.push('/dashboard')}
          className="bg-primary hover:bg-primary/90 text-white min-w-40"
        >
          Ir al dashboard
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Ítem seleccionado */}
      <div
        className="rounded-xl border p-4 flex items-center gap-3"
        style={{ borderColor: 'var(--ink-line)', background: 'var(--ink-deep)' }}
      >
        <div className="rounded-lg p-2.5" style={{ background: 'var(--glow-red-subtle)' }}>
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm" style={{ color: 'var(--bone)' }}>{item.name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--steel)' }}>
            {item.brand ? `${item.brand} · ` : ''}
            {item.category.replace('_', ' ')} ·
            Stock actual: <strong>{item.quantity} {item.unitMeasure ?? 'ud.'}</strong>
          </p>
        </div>
      </div>

      {/* Tipo */}
      <div className="space-y-2">
        <Label style={{ color: 'var(--steel)' }}>Tipo de registro *</Label>
        <div className="grid grid-cols-2 gap-3">
          {(['INGRESO', 'SALIDA'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className="flex items-center justify-center gap-2 rounded-xl border py-3 px-4 text-sm font-medium transition-all"
              style={{
                borderColor: type === t ? 'var(--primary)' : 'var(--ink-line)',
                background: type === t ? 'var(--glow-red-subtle)' : 'var(--ink-deep)',
                color: type === t ? 'var(--bone)' : 'var(--steel)',
              }}
            >
              {t === 'INGRESO'
                ? <ArrowDownToLine className="h-4 w-4 text-green-400" />
                : <ArrowUpFromLine className="h-4 w-4 text-amber-400" />
              }
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Procedencia (solo INGRESO) */}
      {type === 'INGRESO' && (
        <div className="space-y-2">
          <Label style={{ color: 'var(--steel)' }}>Procedencia *</Label>
          <Select value={procedencia} onValueChange={v => setProcedencia(v as Procedencia)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROCEDENCIA_OPTIONS.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Cantidad */}
      <div className="space-y-2">
        <Label htmlFor="mov-qty" style={{ color: 'var(--steel)' }}>
          Cantidad *
          {item.unitMeasure && (
            <span className="ml-1 text-xs" style={{ color: 'var(--steel)' }}>({item.unitMeasure})</span>
          )}
        </Label>
        <Input
          id="mov-qty"
          type="number"
          min="1"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          required
        />
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="mov-desc" style={{ color: 'var(--steel)' }}>Descripción *</Label>
        <Input
          id="mov-desc"
          placeholder="¿Para qué se usa? (ej: Emergencia 24-06, guardia nocturna...)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
        />
      </div>

      {/* Observaciones */}
      <div className="space-y-2">
        <Label htmlFor="mov-obs" style={{ color: 'var(--steel)' }}>Observaciones *</Label>
        <Textarea
          id="mov-obs"
          rows={3}
          placeholder="Estado del ítem al momento de la operación, novedades..."
          value={observations}
          onChange={e => setObservations(e.target.value)}
          required
        />
      </div>

      {/* Registrado por (solo lectura) */}
      <div
        className="rounded-xl border p-3 text-xs"
        style={{ borderColor: 'var(--ink-line)', background: 'var(--ink-deep)', color: 'var(--steel)' }}
      >
        Registrado por: <strong style={{ color: 'var(--bone)' }}>{registeredByName}</strong>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-primary hover:bg-primary/90 text-white py-3 text-base font-semibold"
      >
        {pending ? 'Registrando...' : `Confirmar ${type === 'INGRESO' ? 'ingreso' : 'salida'}`}
      </Button>
    </form>
  )
}
