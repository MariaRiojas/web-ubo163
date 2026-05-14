import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { profiles, sections } from '@/lib/db/schema'
import { eq, and, inArray, asc } from 'drizzle-orm'
import { getAnunciosData } from '@/lib/anuncios/get-anuncios-data'
import { AnunciosClient } from '@/components/anuncios/anuncios-client'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function AnunciosPage() {
  const session = await auth()
  if (!session?.user?.profileId) redirect('/login')

  const permissions = (session.user.permissions as Permission[]) ?? []
  const capabilities = {
    canCreate: permissions.includes('announcements.create_draft'),
    canPublish: permissions.includes('announcements.publish'),
  }

  const data = await getAnunciosData(session.user.profileId, capabilities)

  // Traer catálogo de secciones y efectivos (para composer de directos)
  const [sectionList, profileList] = await Promise.all([
    db
      .select({ id: sections.id, key: sections.key, name: sections.name })
      .from(sections)
      .orderBy(asc(sections.displayOrder), asc(sections.name)),
    capabilities.canCreate
      ? db
          .select({
            id: profiles.id,
            fullName: profiles.fullName,
            grade: profiles.grade,
            codigoCgbvp: profiles.codigoCgbvp,
          })
          .from(profiles)
          .where(
            inArray(profiles.status, ['activo', 'aspirante_en_curso', 'postulante', 'reserva']),
          )
          .orderBy(asc(profiles.fullName))
          .limit(500)
      : Promise.resolve([]),
  ])

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
          <Meta label="MÓDULO" value="ANUNCIOS" />
          <Meta
            label="FLUJO"
            value={
              capabilities.canPublish
                ? 'APROBACIÓN HABILITADA'
                : capabilities.canCreate
                  ? 'CREACIÓN DE BORRADORES'
                  : 'SOLO LECTURA'
            }
          />
          <Meta label="AUDIENCIA" value="GRANULAR POR GRADO · FIGURA · PERSONA" />
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
          Anuncios institucionales
        </h1>
        <p style={{ color: 'var(--steel)', fontSize: 13, maxWidth: 720 }}>
          Comunicación interna con flujo de aprobación. Los Jefes de Sección y de Jefatura
          redactan borradores que el Primer Jefe aprueba antes de publicarlos. La audiencia
          se define por grado, figura o destinatario directo.
        </p>
      </header>

      <AnunciosClient
        data={data}
        sections={sectionList}
        profilesForDirect={profileList}
      />
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
