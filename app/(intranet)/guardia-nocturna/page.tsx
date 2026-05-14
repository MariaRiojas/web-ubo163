import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getGuardiaData } from '@/lib/guardia-nocturna/get-guardia-data'
import type { Permission } from '@/lib/auth/permissions'
import { GuardiaNocturnaClient } from '@/components/guardia/guardia-client'
import { companyConfig } from '@/company.config'

export const dynamic = 'force-dynamic'

export default async function GuardiaNocturnaPage() {
  const session = await auth()
  if (!session?.user?.profileId) redirect('/login')

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.user.profileId),
  })
  if (!profile) redirect('/login')

  const permissions = (session.user.permissions as Permission[]) ?? []

  // Determinar género del usuario para mostrar el dormitorio correspondiente
  const userGender = profile.gender as 'masculino' | 'femenino' | null
  if (!userGender) {
    return (
      <div className="max-w-[1400px]">
        <header className="mb-6">
          <h1 className="font-display text-2xl" style={{ color: 'var(--bone)', fontFamily: 'var(--font-display)' }}>
            Guardia Nocturna
          </h1>
        </header>
        <div
          className="guardia-empty"
          style={{
            padding: '40px',
            textAlign: 'center',
            border: '1px dashed var(--red-163)',
            color: 'var(--steel)',
          }}
        >
          No se puede mostrar la guardia nocturna porque su perfil no tiene un género
          registrado. Contacte a Administración para corregir sus datos.
        </div>
      </div>
    )
  }

  // Verificar si puede gestionar (es Jefe de Guardia del género correspondiente)
  const canManage = userGender === 'masculino'
    ? permissions.includes('guard.manage_male') || permissions.includes('guard.config_beds_male')
    : permissions.includes('guard.manage_female') || permissions.includes('guard.config_beds_female')

  const data = await getGuardiaData(profile.id, {
    gender: userGender,
    canManage,
  })

  if (!data) {
    return (
      <div className="max-w-[1400px]">
        <div
          className="guardia-empty"
          style={{
            padding: '40px',
            textAlign: 'center',
            border: '1px dashed var(--red-163)',
            color: 'var(--steel)',
          }}
        >
          Aún no se ha configurado un dormitorio {userGender} activo en esta compañía.
          Contacte a la Jefatura para inicializar la guardia nocturna.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px]">
      {/* Header institucional */}
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
          <InstitutionalMeta label="MÓDULO" value="GUARDIA NOCTURNA" />
          <InstitutionalMeta
            label="DORMITORIO"
            value={`${data.dormitory.gender.toUpperCase()} · ${data.dormitory.totalBeds} CAMAS`}
          />
          <InstitutionalMeta
            label="HORARIO"
            value={`${companyConfig.guardia.horarioInicio} – ${companyConfig.guardia.horarioFin}`}
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
          Mi Guardia Nocturna
        </h1>
        <p style={{ color: 'var(--steel)', fontSize: 13 }}>
          Reserve su cama con anticipación. Los efectivos con reserva tienen prioridad
          verificable por el Jefe de Guardia.
        </p>
      </header>

      <GuardiaNocturnaClient data={data} canManage={canManage} />
    </div>
  )
}

function InstitutionalMeta({ label, value }: { label: string; value: string }) {
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
