import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, FileText, ChevronRight, ArrowLeft } from 'lucide-react'
import { getFullLibrary } from '@/lib/capacitacion/get-capacitacion-data'
import { BibliotecaClient } from '@/components/capacitacion/biblioteca-client'

export const dynamic = 'force-dynamic'

export default async function BibliotecaPage() {
  const session = await auth()
  if (!session?.user?.profileId) redirect('/login')

  const library = await getFullLibrary(session.user.profileId)

  return (
    <div className="max-w-[1400px]">
      <header style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <Link
            href="/capacitacion"
            className="btn btn--ghost btn--sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
            Volver a Capacitación
          </Link>
        </div>

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
          <Meta label="MÓDULO" value="CAPACITACIÓN · BIBLIOTECA" />
          <Meta label="DOCUMENTOS" value={`${library.length} DISPONIBLES`} />
        </div>
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
          Biblioteca institucional
        </h1>
        <p style={{ color: 'var(--steel)', fontSize: 13, maxWidth: 720 }}>
          Reglamentos, NDR, procedimientos operativos, fichas técnicas y normativa externa.
          Los documentos visibles dependen de su grado y figura actual.
        </p>
      </header>

      <BibliotecaClient library={library} />
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
