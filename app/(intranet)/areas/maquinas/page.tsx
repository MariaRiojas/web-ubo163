import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AREAS_META } from '@/lib/areas/get-areas-hub'
import { getMaquinasAreaData } from '@/lib/areas/get-maquinas-data'
import { MaquinasClient } from '@/components/areas/maquinas-client'

export const dynamic = 'force-dynamic'

export default async function AreaMaquinasPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const meta = AREAS_META.maquinas
  const data = await getMaquinasAreaData()

  return (
    <div className="max-w-[1400px]">
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/areas"
          className="btn btn--ghost btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
          Volver a Áreas
        </Link>
      </div>

      {/* Hero institucional */}
      <header className="area-hero">
        <div className="area-hero-seal">{meta.seal}</div>
        <div className="area-hero-body">
          <div className="area-hero-ref">{meta.normativeRef}</div>
          <h1 className="area-hero-title">{meta.name}</h1>
          <p className="area-hero-desc">{meta.description}</p>
        </div>
        <div className="area-hero-jefe">
          <span className="area-hero-jefe-label">RESPONSABLE DEL ÁREA</span>
          {data.jefeArea ? (
            <>
              <span className="area-hero-jefe-name">
                {shortNameHero(data.jefeArea.fullName)}
              </span>
              <span className="area-hero-jefe-grade">
                {data.jefeArea.gradeLabel}
                {data.jefeArea.codigoCgbvp && ` · ${data.jefeArea.codigoCgbvp}`}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--graphite)', fontSize: 12 }}>
              Sin responsable asignado
            </span>
          )}
        </div>
      </header>

      <MaquinasClient data={data} />
    </div>
  )
}

function shortNameHero(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) return fullName
  const apellidos = parts[0].trim()
  const nombre = parts[1].trim().split(/\s+/)[0]
  return `${apellidos}, ${nombre}`
}
