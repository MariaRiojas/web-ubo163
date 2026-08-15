import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ddb, TABLE, GetCommand } from '@/lib/db/dynamodb'
import { getCapacitacionData } from '@/lib/capacitacion/get-capacitacion-data'
import { CapacitacionClient } from '@/components/capacitacion/capacitacion-client'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

const FIGURA_LABEL: Record<string, string> = {
  postulante: 'POSTULANTE',
  aspirante_en_curso: 'ASPIRANTE EN FORMACIÓN',
  activo: 'BOMBERO EN ACTIVIDAD',
  reserva: 'EN RESERVA',
  licencia: 'EN LICENCIA',
  retirado: 'RETIRADO',
}

export default async function CapacitacionPage() {
  const session = await auth()
  if (!session?.user?.profileId) redirect('/login')

  const { Item: profile } = await ddb.send(new GetCommand({
    TableName: TABLE.profiles,
    Key: { profileId: session.user.profileId },
  })) as any
  if (!profile) redirect('/login')

  const permissions = (session.user.permissions as Permission[]) ?? []
  const hasEscuela = permissions.includes('training.access_escuela_tecnica')
  const hasEsbas = permissions.includes('training.access_esbas')

  const accesoLabel = hasEscuela
    ? 'ESCUELA TÉCNICA HABILITADA'
    : hasEsbas
      ? 'ESBAS DISPONIBLE'
      : 'ACCESO RESTRINGIDO'

  const data = await getCapacitacionData(profile.profileId)

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
          <Meta label="MÓDULO" value="CAPACITACIÓN" />
          <Meta label="MI FIGURA" value={FIGURA_LABEL[profile.status] ?? profile.status.toUpperCase()} />
          <Meta label="ACCESO" value={accesoLabel} />
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
          Capacitación y Formación
        </h1>
        <p style={{ color: 'var(--steel)', fontSize: 13, maxWidth: 720 }}>
          Biblioteca institucional, curso ESBAS y Escuela Técnica del CGBVP. Continúe su
          formación a lo largo de toda la carrera bomberil.
        </p>
      </header>

      <CapacitacionClient
        data={data}
        esbasPromotionFromProfile={profile.esbasPromotion}
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
