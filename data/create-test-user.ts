/**
 * Script de uso único para crear usuarios de prueba en dev.
 * Ejecutar con: npx tsx --env-file=.env.local data/create-test-user.ts
 */
import { db } from '@/lib/db'
import { users, profiles } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const TEST_USERS = [
  { email: 'torres@cia999.pe', password: '12345678', label: 'Brigadier Torres (top grade)' },
  { email: 'ramirez@cia999.pe', password: '12345678', label: 'Ten. Brigadier Ramírez' },
  { email: 'herrera@cia999.pe', password: '12345678', label: 'Capitán Herrera' },
  { email: 'gonzalez@cia999.pe', password: '12345678', label: 'Aspirante González' },
]

async function main() {
  console.log('🔐 Creando usuarios de prueba...\n')

  for (const u of TEST_USERS) {
    // Buscar perfil por email
    const profile = await db.query.profiles.findFirst({
      where: (p, { eq }) => eq(p.email, u.email),
    })

    if (!profile) {
      console.log(`  ⚠️  Perfil no encontrado para ${u.email} — saltando`)
      continue
    }

    // Si ya tiene userId, usar ese; si no, generar uno
    const userId = profile.userId ?? randomUUID()
    const passwordHash = await bcrypt.hash(u.password, 12)

    // Upsert usuario
    await db
      .insert(users)
      .values({ id: userId, email: u.email, passwordHash })
      .onConflictDoUpdate({
        target: users.id,
        set: { passwordHash, updatedAt: new Date() },
      })

    // Vincular userId al perfil si no lo tiene
    if (!profile.userId) {
      await db
        .update(profiles)
        .set({ userId })
        .where(eq(profiles.id, profile.id))
    }

    console.log(`  ✓ ${u.label} — ${u.email} / ${u.password}`)
  }

  console.log('\n✅ Usuarios creados. Abre http://localhost:3000/login')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
