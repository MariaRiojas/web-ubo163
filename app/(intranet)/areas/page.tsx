import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getAreasHubData, type AreaHubCard } from '@/lib/areas/get-areas-hub'

export const dynamic = 'force-dynamic'

export default async function AreasHubPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { cards, stats } = await getAreasHubData()

  const jefatura = cards.filter((c) => c.meta.type === 'jefatura')
  const linea = cards.filter((c) => c.meta.type === 'linea')
  const asesoramiento = cards.filter((c) => c.meta.type === 'asesoramiento')

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
          <Meta label="MÓDULO" value="ÁREAS DE LA COMPAÑÍA" />
          <Meta label="REFERENCIA" value="ART. 112–117 RIF CGBVP" />
          <Meta
            label="FASES IMPLEMENTADAS"
            value={`${stats.implementedAreas} de ${stats.totalAreas}`}
          />
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
          Áreas por sección
        </h1>
        <p style={{ color: 'var(--steel)', fontSize: 13, maxWidth: 720 }}>
          Estructura organizativa de la compañía según el Reglamento Interno de Funcionamiento
          del CGBVP. Cada área tiene su propio responsable, inventario, bandeja de solicitudes y
          herramientas específicas.
        </p>
      </header>

      {/* Jefatura */}
      {jefatura.length > 0 && (
        <div className="areas-block">
          <div className="areas-block-label">Jefatura</div>
          <div className="areas-grid">
            {jefatura.map((c) => <AreaCardUI key={c.meta.key} card={c} />)}
          </div>
        </div>
      )}

      {/* Secciones de Línea */}
      <div className="areas-block">
        <div className="areas-block-label">Secciones de Línea</div>
        <div className="areas-grid">
          {linea.map((c) => <AreaCardUI key={c.meta.key} card={c} />)}
        </div>
      </div>

      {/* Secciones de Asesoramiento */}
      <div className="areas-block">
        <div className="areas-block-label">Secciones de Asesoramiento</div>
        <div className="areas-grid">
          {asesoramiento.map((c) => <AreaCardUI key={c.meta.key} card={c} />)}
        </div>
      </div>
    </div>
  )
}

function AreaCardUI({ card }: { card: AreaHubCard }) {
  const { meta } = card
  const href = meta.implemented ? `/areas/${meta.key}` : `/areas/${meta.key}`
  const cardClass = `area-card area-card--${meta.type}`

  return (
    <Link href={href} className={cardClass}>
      <div className="area-card-seal">{meta.seal}</div>
      <div className="area-card-body">
        <div className="area-card-ref">{meta.normativeRef}</div>
        <h3 className="area-card-title">{meta.name}</h3>
        <p className="area-card-desc">{meta.description}</p>
        <div className="area-card-stats">
          <span className="area-card-stat">
            <strong>{card.personnelCount}</strong> personal
          </span>
          {card.inventoryCount > 0 && (
            <>
              <span>·</span>
              <span className="area-card-stat">
                <strong>{card.inventoryCount}</strong> ítems
              </span>
            </>
          )}
          {(card.openIncidents + card.openRequests) > 0 ? (
            <>
              <span>·</span>
              <span className="area-card-stat area-card-stat--alert">
                <strong>{card.openIncidents + card.openRequests}</strong> pendientes
              </span>
            </>
          ) : null}
          {!meta.implemented && (
            <>
              <span>·</span>
              <span className="area-card-stat" style={{ color: 'var(--brass)' }}>
                FASE {meta.phase}
              </span>
            </>
          )}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 area-card-arrow" strokeWidth={1.6} />
    </Link>
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
