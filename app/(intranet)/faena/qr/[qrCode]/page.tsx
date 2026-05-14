import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { lookupCompartmentByQr } from '@/lib/faena/get-faena-data'
import { startOrContinueExecution } from '@/lib/faena/actions'

export const dynamic = 'force-dynamic'

export default async function QrResolverPage({
  params,
}: {
  params: Promise<{ qrCode: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { qrCode } = await params
  const decoded = decodeURIComponent(qrCode).toUpperCase()

  const hit = await lookupCompartmentByQr(decoded)

  if (!hit) {
    return (
      <div className="max-w-[1400px]">
        <div className="qr-scan-state">
          <div className="qr-scan-state-icon qr-scan-state-icon--error">
            <AlertCircle className="w-9 h-9" strokeWidth={1.4} />
          </div>
          <h2 className="qr-scan-state-title">Código no reconocido</h2>
          <p className="qr-scan-state-text">
            El código que escaneó no corresponde a ningún compartimiento registrado.
            Verifique que el QR esté correctamente impreso o contacte al Jefe de Máquinas.
          </p>
          <div className="qr-scan-state-code">{decoded}</div>
          <div style={{ marginTop: 24 }}>
            <Link
              href="/faena/qr"
              className="btn btn--ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.8} />
              Volver a escanear
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Intentar iniciar o continuar la ejecución
  const res = await startOrContinueExecution(hit.compartment.id)

  if (!res.ok) {
    return (
      <div className="max-w-[1400px]">
        <div className="qr-scan-state">
          <div className="qr-scan-state-icon qr-scan-state-icon--error">
            <AlertCircle className="w-9 h-9" strokeWidth={1.4} />
          </div>
          <h2 className="qr-scan-state-title">No se pudo iniciar el checklist</h2>
          <p className="qr-scan-state-text">{res.error}</p>
          <div
            style={{
              margin: '16px 0',
              padding: '12px 16px',
              background: 'var(--ink-black)',
              border: '1px solid var(--ink-line)',
              borderRadius: 2,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--brass)',
            }}
          >
            {hit.machine.label} → {hit.compartment.name}
          </div>
          <div style={{ marginTop: 16 }}>
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
      </div>
    )
  }

  // Redirigir al checklist
  redirect(`/faena/checklist/${res.executionId}`)
}
