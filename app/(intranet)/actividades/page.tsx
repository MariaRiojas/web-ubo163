import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ddb, TABLE, ScanCommand } from '@/lib/db/dynamodb'
import { getActividadesMes } from '@/lib/actividades/get-actividades-data'
import { ActividadesClient } from '@/components/actividades/actividades-client'
import { limaDateStr } from '@/lib/instruccion/horario'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

/** Calendario de actividades — lo ven todos; lo cargan Jefatura y Administración. */
export default async function ActividadesPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const permissions = (session.user.permissions ?? []) as Permission[]
  const canManage = permissions.includes('activities.manage')

  const sp = await searchParams
  const hoy = limaDateStr()
  const anio = Number(sp.anio) || Number(hoy.slice(0, 4))
  const mesRaw = Number(sp.mes) || Number(hoy.slice(5, 7))
  const mes = Math.min(12, Math.max(1, mesRaw))

  const [data, personalRes, seccionesRes] = await Promise.all([
    getActividadesMes(anio, mes),
    canManage
      ? ddb.send(new ScanCommand({
          TableName: TABLE.profiles,
          ProjectionExpression: 'profileId, fullName, grade, #s',
          ExpressionAttributeNames: { '#s': 'status' },
          FilterExpression: '#s <> :r',
          ExpressionAttributeValues: { ':r': 'retirado' },
        }))
      : Promise.resolve({ Items: [] }),
    canManage
      ? ddb.send(new ScanCommand({
          TableName: TABLE.sections,
          ProjectionExpression: 'sectionId, #k, #n',
          ExpressionAttributeNames: { '#k': 'key', '#n': 'name' },
        }))
      : Promise.resolve({ Items: [] }),
  ])

  const personal = ((personalRes.Items ?? []) as any[])
    .map(p => ({ id: p.profileId, fullName: p.fullName as string, grade: p.grade as string }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName))

  const secciones = ((seccionesRes.Items ?? []) as any[])
    .map(s => ({ id: s.sectionId, key: s.key, name: s.name }))

  return (
    <div className="max-w-[1400px]">
      <ActividadesClient data={data} canManage={canManage} personal={personal} secciones={secciones} />
    </div>
  )
}
