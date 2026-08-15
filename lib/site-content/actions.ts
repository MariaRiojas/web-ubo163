'use server'

import { auth } from '@/lib/auth'
import { ddb, TABLE, PutCommand, now } from '@/lib/db/dynamodb'
import { writeAuditLog, auditActor } from '@/lib/audit/write-audit'
import { EDITABLE_BLOCK_KEYS, EDITABLE_BLOCKS } from '@/lib/db/schema/site-content'
import type { Permission } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'

/** Guarda (upsert) el HTML de un bloque editable del landing. Requiere `content.manage`. */
export async function saveSiteBlock(input: { contentKey: string; html: string }) {
  const session = await auth()
  if (!session?.user) return { ok: false as const, error: 'No autenticado' }
  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes('content.manage')) return { ok: false as const, error: 'Sin permiso' }

  if (!EDITABLE_BLOCK_KEYS.includes(input.contentKey)) {
    return { ok: false as const, error: 'Bloque no editable' }
  }
  if (input.html.length > 20000) return { ok: false as const, error: 'Contenido demasiado largo' }

  const ts = now()
  await ddb.send(new PutCommand({
    TableName: TABLE.siteContent,
    Item: {
      contentKey: input.contentKey,
      html: input.html,
      updatedBy: session.user.profileId,
      updatedByName: session.user.name ?? undefined,
      updatedAt: ts,
    },
  }))

  const block = EDITABLE_BLOCKS.find(b => b.key === input.contentKey)
  await writeAuditLog({
    entityType: 'system',
    entityId: input.contentKey,
    entityLabel: block?.label ?? input.contentKey,
    action: 'update',
    ...auditActor(session),
    summary: `Editó el contenido del landing: «${block?.label ?? input.contentKey}» (${block?.page ?? ''})`,
  })

  // El landing carga el contenido en su layout (force-dynamic), pero revalidamos por si acaso.
  revalidatePath('/admision')
  revalidatePath('/', 'layout')
  return { ok: true as const }
}
