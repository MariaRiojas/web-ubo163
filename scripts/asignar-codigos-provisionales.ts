/**
 * Asigna un código de acceso provisional a los postulantes y aspirantes que aún
 * no tienen código CGBVP, para que puedan iniciar sesión como el resto.
 *
 * Formato: P-0001, P-0002, … El guion garantiza que nunca colisione con un
 * código real del CGBVP (6 caracteres sin separador, tipo A09600). Cuando el
 * CGBVP le asigne el definitivo, se reemplaza desde la ficha del workspace.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/asignar-codigos-provisionales.ts          (simula)
 *   npx tsx --env-file=.env.local scripts/asignar-codigos-provisionales.ts --apply  (escribe)
 */
import { ddb, TABLE, ScanCommand, UpdateCommand, now } from '../lib/db/dynamodb'

const APPLY = process.argv.includes('--apply')
const PREFIJO = 'P-'
const GRADOS = new Set(['postulante', 'aspirante'])

async function scanAll(TableName: string): Promise<any[]> {
  const out: any[] = []
  let ExclusiveStartKey: any
  do {
    const r = await ddb.send(new ScanCommand({ TableName, ExclusiveStartKey }))
    out.push(...(r.Items ?? []))
    ExclusiveStartKey = r.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return out
}

async function main() {
  const perfiles = await scanAll(TABLE.profiles)

  const usados = new Set<string>(
    perfiles.map(p => p.codigoCgbvp).filter(Boolean).map((c: string) => c.toUpperCase()),
  )

  const pendientes = perfiles
    // Excluye cuentas dummy de prueba para que no consuman correlativo.
    .filter(p => GRADOS.has(p.grade) && !p.codigoCgbvp && p.status !== 'retirado'
      && !String(p.profileId).startsWith('prof-dummy'))
    .sort((a, b) =>
      (a.ordenAntiguedad ?? a.ordenLlegada ?? 9999) - (b.ordenAntiguedad ?? b.ordenLlegada ?? 9999) ||
      String(a.fullName ?? '').localeCompare(String(b.fullName ?? '')),
    )

  if (pendientes.length === 0) {
    console.log('No hay postulantes ni aspirantes sin código. Nada que hacer.')
    return
  }

  let n = 0
  const asignaciones: { profileId: string; fullName: string; grade: string; codigo: string }[] = []
  for (const p of pendientes) {
    let codigo: string
    do { codigo = `${PREFIJO}${String(++n).padStart(4, '0')}` } while (usados.has(codigo))
    usados.add(codigo)
    asignaciones.push({ profileId: p.profileId, fullName: p.fullName, grade: p.grade, codigo })
  }

  console.log(`${APPLY ? 'ASIGNANDO' : 'SIMULACIÓN —'} ${asignaciones.length} códigos provisionales:\n`)
  for (const a of asignaciones) {
    console.log(`  ${a.codigo}  ${a.grade.padEnd(11)} ${a.fullName}`)
  }

  if (!APPLY) {
    console.log('\nNada escrito. Repetí con --apply para aplicar.')
    return
  }

  for (const a of asignaciones) {
    await ddb.send(new UpdateCommand({
      TableName: TABLE.profiles,
      Key: { profileId: a.profileId },
      UpdateExpression: 'SET codigoCgbvp = :c, updatedAt = :ts',
      // No pisa a nadie que ya tenga código (por si corre dos veces).
      ConditionExpression: 'attribute_not_exists(codigoCgbvp)',
      ExpressionAttributeValues: { ':c': a.codigo, ':ts': now() },
    }))
  }
  console.log(`\nListo: ${asignaciones.length} códigos asignados.`)
}

main().catch(e => { console.error('FALLO', e); process.exit(1) })
