import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { QrCode } from 'lucide-react'
import { QrManualInput } from '@/components/faena/qr-manual-input'

export default async function QrScanPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="max-w-[1400px]">
      <div className="qr-scan-state">
        <div className="qr-scan-state-icon">
          <QrCode className="w-9 h-9" strokeWidth={1.4} />
        </div>
        <h2 className="qr-scan-state-title">Escanear código QR</h2>
        <p className="qr-scan-state-text">
          Cada compartimiento de las máquinas tiene un código QR único impreso.
          Escanéelo con la cámara del teléfono, o ingrese el código manualmente abajo para
          iniciar la inspección.
        </p>

        <QrManualInput />

        <p
          style={{
            marginTop: 20,
            fontSize: 11,
            color: 'var(--graphite)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          El escaneo con cámara estará disponible en una próxima entrega.
        </p>
      </div>
    </div>
  )
}
