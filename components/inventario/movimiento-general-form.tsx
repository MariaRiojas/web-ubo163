"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { InventoryItemDB } from "@/lib/inventario/get-items"
import { MovimientoForm } from "./movimiento-form"

interface Props {
  items: InventoryItemDB[]
  registeredByName: string
}

export function MovimientoGeneralForm({ items, registeredByName }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<InventoryItemDB | null>(null)

  const filtered = search.length < 2
    ? items
    : items.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.brand ?? '').toLowerCase().includes(search.toLowerCase())
      )

  if (selected) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="text-xs"
          style={{ color: 'var(--steel)' }}
        >
          ← Cambiar ítem
        </button>
        <MovimientoForm item={selected} registeredByName={registeredByName} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label style={{ color: 'var(--steel)' }}>Seleccionar ítem *</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--steel)' }} />
          <Input
            placeholder="Buscar ítem..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-center py-8 text-sm" style={{ color: 'var(--steel)' }}>
          No hay ítems en el inventario.
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filtered.map(item => (
            <button
              key={item.itemId}
              onClick={() => setSelected(item)}
              className="w-full text-left rounded-xl border p-3 transition-all hover:border-primary/60"
              style={{ borderColor: 'var(--ink-line)', background: 'var(--ink-deep)' }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--bone)' }}>{item.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--steel)' }}>
                {item.category.replace('_', ' ')} · Stock: {item.quantity} {item.unitMeasure ?? 'ud.'}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-4 text-sm" style={{ color: 'var(--steel)' }}>
              Sin resultados para "{search}"
            </p>
          )}
        </div>
      )}
    </div>
  )
}
