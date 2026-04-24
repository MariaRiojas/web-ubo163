/**
 * Re-exporta la instancia de Drizzle del proyecto principal.
 * Los scrapers usan el mismo pool y schema que la web.
 */
export { db } from '../../lib/db'
export * from '../../lib/db/schema'
