import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DiccionarioClient } from '@/components/inventario/diccionario-client'

export const dynamic = 'force-dynamic'

export default async function DiccionarioInventarioPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return (
    <div className="max-w-[1100px]">
      <DiccionarioClient />
    </div>
  )
}
