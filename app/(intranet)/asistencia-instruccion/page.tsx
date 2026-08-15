import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ddb, TABLE, GetCommand } from '@/lib/db/dynamodb'
import { getMiAsistencia } from '@/lib/instruccion/get-asistencia-data'
import { AsistenciaInstruccionClient } from '@/components/instruccion/asistencia-client'

export const dynamic = 'force-dynamic'

const FORMACION_GRADES = new Set(['postulante', 'aspirante'])

export default async function AsistenciaInstruccionPage() {
  const session = await auth()
  if (!session?.user?.profileId) redirect('/login')

  const { Item: profile } = await ddb.send(new GetCommand({
    TableName: TABLE.profiles,
    Key: { profileId: session.user.profileId },
  }))
  if (!profile) redirect('/login')

  const esFormacion = FORMACION_GRADES.has(profile.grade as string) && profile.status !== 'retirado'

  if (!esFormacion) {
    return (
      <div className="max-w-[900px]">
        <header style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--bone)' }}>Asistencia a Instrucción</h1>
        </header>
        <div className="guardia-empty" style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--ink-line)', color: 'var(--steel)' }}>
          El registro de asistencia a instrucción es solo para <b style={{ color: 'var(--bone)' }}>postulantes y aspirantes</b> en formación.
        </div>
      </div>
    )
  }

  const data = await getMiAsistencia(profile.profileId as string)

  return (
    <div className="max-w-[900px]">
      <AsistenciaInstruccionClient data={data} nombre={profile.fullName as string} />
    </div>
  )
}
