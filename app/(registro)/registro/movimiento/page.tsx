import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAllInventoryItems } from "@/lib/inventario/get-items"
import { MovimientoGeneralForm } from "@/components/inventario/movimiento-general-form"
import { Package } from "lucide-react"
import type { Metadata } from "next"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Registro de movimiento' }

export default async function MovimientoGeneralPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const items = await getAllInventoryItems()

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-4"
            style={{
              background: 'var(--glow-red-subtle)',
              color: 'var(--primary)',
              border: '1px solid var(--primary)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
            }}
          >
            <Package className="h-3.5 w-3.5" />
            SERVICIOS GENERALES · REGISTRO
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--bone)', fontFamily: 'var(--font-display)' }}
          >
            Registro de movimiento
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--steel)' }}>
            Compañía de Bomberos Voluntarios Ancón N.° 163
          </p>
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{ borderColor: 'var(--ink-line)', background: 'rgba(var(--ink-black-rgb,12,12,14),0.8)' }}
        >
          <MovimientoGeneralForm items={items} registeredByName={session.user.name ?? ''} />
        </div>

      </div>
    </div>
  )
}
