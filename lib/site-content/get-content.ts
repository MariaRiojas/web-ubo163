import 'server-only'
import { ddb, TABLE, ScanCommand } from '@/lib/db/dynamodb'
import type { SiteContentBlock } from '@/lib/db/schema/site-content'

/**
 * Devuelve TODO el contenido editable como un mapa { contentKey: html }.
 * Usado por el layout del landing para hidratar el provider una sola vez.
 * Fail-safe: si la tabla no existe o falla, devuelve {} (se usan los fallbacks).
 */
export async function getAllSiteContent(): Promise<Record<string, string>> {
  try {
    const res = await ddb.send(new ScanCommand({ TableName: TABLE.siteContent }))
    const map: Record<string, string> = {}
    for (const item of (res.Items ?? []) as SiteContentBlock[]) {
      if (item.contentKey && typeof item.html === 'string') map[item.contentKey] = item.html
    }
    return map
  } catch (err) {
    console.error('[getAllSiteContent] error (se usan fallbacks):', err)
    return {}
  }
}
