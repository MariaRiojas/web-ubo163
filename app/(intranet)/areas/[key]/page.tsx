import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Construction } from 'lucide-react'
import { AREAS_META, type AreaKey } from '@/lib/areas/get-areas-hub'

export const dynamic = 'force-dynamic'

const VALID_KEYS = Object.keys(AREAS_META) as AreaKey[]

export default async function AreaGenericPage({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { key: rawKey } = await params

  if (!VALID_KEYS.includes(rawKey as AreaKey)) {
    notFound()
  }
  const key = rawKey as AreaKey

  // Maquinas tiene su propia page implementada
  if (key === 'maquinas') {
    redirect('/areas/maquinas')
  }

  const meta = AREAS_META[key]
  const heroClass = meta.type === 'asesoramiento'
    ? 'area-hero area-hero--asesoramiento'
    : 'area-hero'

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

      <header className={heroClass}>
        <div className="area-hero-seal">{meta.seal}</div>
        <div className="area-hero-body">
          <div className="area-hero-ref">{meta.normativeRef}</div>
          <h1 className="area-hero-title">{meta.name}</h1>
          <p className="area-hero-desc">{meta.description}</p>
        </div>
        <div className="area-hero-jefe">
          <span className="area-hero-jefe-label">FASE</span>
          <span className="area-hero-jefe-name">{meta.phase}</span>
          <span className="area-hero-jefe-grade">de implementación</span>
        </div>
      </header>

      <div className="area-placeholder">
        <div className="area-placeholder-icon">
          <Construction className="w-8 h-8" strokeWidth={1.4} />
        </div>
        <h3 className="area-placeholder-title">Vista en desarrollo</h3>
        <p className="area-placeholder-text">
          Esta área tendrá su vista dedicada en la <strong>fase {meta.phase}</strong> del plan de
          implementación. Incluirá personal asignado, inventario específico, bandeja de
          solicitudes recibidas y herramientas propias de la sección.
        </p>
        <div className="area-placeholder-phase">FASE {meta.phase}</div>

        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--ink-line)' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--graphite)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Funcionalidad prevista
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              maxWidth: 720,
              margin: '0 auto',
              fontSize: 12,
              color: 'var(--steel)',
              textAlign: 'left',
            }}
          >
            {getPlannedFeatures(key).map((feature, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  background: 'var(--ink-black)',
                  border: '1px solid var(--ink-line)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--brass)',
                    flexShrink: 0,
                    marginTop: 6,
                  }}
                />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function getPlannedFeatures(key: AreaKey): string[] {
  const map: Record<AreaKey, string[]> = {
    jefatura: [
      'Panel de situación en tiempo real de la compañía',
      'Aprobación de anuncios institucionales',
      'Gestión de cargos de sección',
      'Reportes consolidados de actividad y cumplimiento',
    ],
    maquinas: [], // ya implementado
    servicios_generales: [
      'Inventario de insumos y materiales del cuartel',
      'Bandeja de solicitudes de reposición',
      'Mantenimiento de instalaciones',
      'Asignación de EPP al personal',
    ],
    instruccion: [
      'Administración del catálogo de cursos',
      'Gestión de inscripciones y progreso',
      'Supervisión de aspirantes en ESBAS',
      'Emisión de certificados internos',
    ],
    prehospitalaria: [
      'Inventario de equipos APH y farmacia',
      'Control de fechas de vencimiento',
      'Protocolos clínicos operativos',
      'Estadísticas de emergencias médicas',
    ],
    administracion: [
      'Legajos del personal',
      'Resoluciones y actos administrativos',
      'Reportes de horas de servicio',
      'Gestión de correspondencia institucional',
    ],
    imagen: [
      'Calendario de publicaciones',
      'Biblioteca de material audiovisual',
      'Comunicados de prensa',
      'Redes sociales institucionales',
    ],
  }
  return map[key] ?? []
}
