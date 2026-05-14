import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AREAS_META, type AreaKey } from '@/lib/areas/get-areas-hub'
import type { AreaBasePerson } from '@/lib/areas/get-area-base-data'

export function AreaHero({
  areaKey, jefeArea,
}: {
  areaKey: AreaKey
  jefeArea: AreaBasePerson | null
}) {
  const meta = AREAS_META[areaKey]
  const heroClass = meta.type === 'asesoramiento'
    ? 'area-hero area-hero--asesoramiento'
    : 'area-hero'

  return (
    <>
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

      <header className={heroClass}>
        <div className="area-hero-seal">{meta.seal}</div>
        <div className="area-hero-body">
          <div className="area-hero-ref">{meta.normativeRef}</div>
          <h1 className="area-hero-title">{meta.name}</h1>
          <p className="area-hero-desc">{meta.description}</p>
        </div>
        <div className="area-hero-jefe">
          <span className="area-hero-jefe-label">RESPONSABLE DEL ÁREA</span>
          {jefeArea ? (
            <>
              <span className="area-hero-jefe-name">
                {shortNameHero(jefeArea.fullName)}
              </span>
              <span className="area-hero-jefe-grade">
                {jefeArea.gradeLabel}
                {jefeArea.codigoCgbvp && ` · ${jefeArea.codigoCgbvp}`}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--graphite)', fontSize: 12 }}>
              Sin responsable asignado
            </span>
          )}
        </div>
      </header>
    </>
  )
}

function shortNameHero(fullName: string): string {
  const parts = fullName.split(',')
  if (parts.length < 2) return fullName
  const apellidos = parts[0].trim()
  const nombre = parts[1].trim().split(/\s+/)[0]
  return `${apellidos}, ${nombre}`
}
