import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { getChecklistExecution } from '@/lib/faena/get-faena-data'
import { ChecklistExecutor } from '@/components/faena/checklist-executor'

export const dynamic = 'force-dynamic'

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ executionId: string }>
}) {
  const session = await auth()
  if (!session?.user?.profileId) redirect('/login')

  const { executionId } = await params
  const detail = await getChecklistExecution(executionId)

  if (!detail) {
    return (
      <div className="max-w-[1400px]">
        <div className="qr-scan-state">
          <div className="qr-scan-state-icon qr-scan-state-icon--error">
            <AlertCircle className="w-9 h-9" strokeWidth={1.4} />
          </div>
          <h2 className="qr-scan-state-title">Ejecución no encontrada</h2>
          <p className="qr-scan-state-text">
            El checklist no existe o fue eliminado.
          </p>
          <Link
            href="/faena"
            className="btn btn--ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.8} />
            Volver a Faena
          </Link>
        </div>
      </div>
    )
  }

  // Sólo el ejecutor puede ver el checklist (o jefes, para audit)
  // Por simplicidad, cualquier bombero con acceso al módulo puede ver el detalle.

  return (
    <div className="max-w-[1400px]">
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/faena"
          className="btn btn--ghost btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
          Volver a Faena
        </Link>
      </div>
      <ChecklistExecutor detail={detail} />
    </div>
  )
}
