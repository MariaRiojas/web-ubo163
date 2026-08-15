'use server'

import { auth } from '@/lib/auth'
import { getAuditFeed } from '@/lib/audit/get-audit'
import type { Permission } from '@/lib/auth/permissions'
import type { AuditEntityType } from '@/lib/db/schema/audit'

/** Carga una página del feed de auditoría. Solo Primer Jefe (company.manage). */
export async function loadAuditPage(input: {
  entityType?: AuditEntityType
  cursor?: string | null
}) {
  const session = await auth()
  const perms = (session?.user?.permissions ?? []) as Permission[]
  if (!perms.includes('company.manage')) {
    return { ok: false as const, error: 'Sin permiso' }
  }
  const page = await getAuditFeed({
    entityType: input.entityType,
    cursor: input.cursor ?? null,
    limit: 50,
  })
  return { ok: true as const, items: page.items, nextCursor: page.nextCursor }
}
