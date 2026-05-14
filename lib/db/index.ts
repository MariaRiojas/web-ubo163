import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// ─────────────────────────────────────────────────────────────────────────
// Pool de conexiones reutilizable.
//
// En Next.js:
//   - dev (hot-reload):  1 pool global reutilizado entre recargas
//   - producción local:  1 pool con max=10
//   - Lambda:            1 pool con max=2 por container
//                        (RDS Proxy hace el pooling real, así evitamos
//                         que cada container de Lambda acumule conexiones
//                         directas contra la DB)
// ─────────────────────────────────────────────────────────────────────────

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
}

// Detección de Lambda por la variable estándar del runtime
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: isLambda ? 2 : 10,
    idleTimeoutMillis: isLambda ? 10_000 : 30_000,
    connectionTimeoutMillis: 5_000,
    // En Lambda los containers son volátiles; keep-alive ayuda a reutilizar
    // conexiones entre invocaciones del mismo container
    keepAlive: true,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool
}

export const db = drizzle(pool, { schema })

export type DB = typeof db
