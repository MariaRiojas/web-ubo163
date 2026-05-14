import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { QrCode } from 'lucide-react'
import { getFaenaData, getSectionCatalog } from '@/lib/faena/get-faena-data'
import { FaenaClient } from '@/components/faena/faena-client'

export const dynamic = 'force-dynamic'

const WEEKDAYS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO']
const MESES_CORTOS_UPPER = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

export default async function FaenaPage() {
  const session = await auth()
  if (!session?.user?.profileId) redirect('/login')

  const [data, sections] = await Promise.all([
    getFaenaData(session.user.profileId),
    getSectionCatalog(),
  ])

  const now = new Date()
  const fechaLabel = `${WEEKDAYS[now.getDay()]} ${String(now.getDate()).padStart(2, '0')}·${MESES_CORTOS_UPPER[now.getMonth()]}·${now.getFullYear()}`
  const turnoRange =
    data.shift.key === 'manana' ? 'MAÑANA · 07:00–15:00'
      : data.shift.key === 'tarde' ? 'TARDE · 15:00–23:00'
      : 'NOCHE · 23:00–07:00'

  return (
    <div className="max-w-[1400px]">
      <header style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            paddingBottom: 12,
            borderBottom: '1px solid var(--ink-line)',
            marginBottom: 16,
          }}
        >
          <Meta label="MÓDULO" value="FAENA Y SERVICIO" />
          <Meta label="TURNO ACTUAL" value={turnoRange} />
          <Meta label="FECHA" value={fechaLabel} />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 500,
                color: 'var(--bone)',
                letterSpacing: '-0.015em',
                marginBottom: 6,
              }}
            >
              Inspecciones de hoy
            </h1>
            <p style={{ color: 'var(--steel)', fontSize: 13, maxWidth: 720 }}>
              Escanee el código QR del compartimiento para iniciar la inspección, o seleccione
              la máquina manualmente.
            </p>
          </div>

          <Link
            href="/faena/qr"
            className="btn btn--primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
            }}
          >
            <QrCode className="w-4 h-4" strokeWidth={1.8} />
            Escanear QR
          </Link>
        </div>
      </header>

      <FaenaClient data={data} sections={sections} />
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.14em',
          color: 'var(--graphite)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--bone)',
          letterSpacing: '0.04em',
        }}
      >
        {value}
      </span>
    </div>
  )
}
