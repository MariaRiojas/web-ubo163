import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAllInventoryItems } from "@/lib/inventario/get-items"
import { ItemLabels } from "@/components/inventario/item-label"
import type { Metadata } from "next"

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Etiquetas de inventario' }

export default async function EtiquetasPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const items = await getAllInventoryItems()
  // AUTH_URL está configurado en el Lambda env con el dominio CloudFront correcto.
  // No leer 'host' header — el Lambda ve su propia URL ahí, no CloudFront.
  const baseUrl = (process.env.AUTH_URL ?? 'https://d1bno1kyerz6hk.cloudfront.net').replace(/\/$/, '')

  return (
    <div className="min-h-screen p-8" style={{ background: '#f5f5f5', color: '#000' }}>
      <div className="no-print mb-6">
        <h1 className="text-xl font-bold">Etiquetas de inventario</h1>
        <p className="text-sm text-gray-600 mt-1">
          {items.length} ítem(s) · Escanea el QR para registrar un movimiento
        </p>
      </div>

      <ItemLabels
        items={items.map(i => ({
          itemId: i.itemId,
          name: i.name,
          category: i.category,
          serialNumber: i.serialNumber,
          unitMeasure: i.unitMeasure,
        }))}
        baseUrl={baseUrl}
      />

      <style>{`
        @media print {
          html, body { background: #fff !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
