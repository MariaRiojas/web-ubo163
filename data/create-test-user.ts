/**
 * Script de uso único para crear usuarios de prueba en dev.
 * Ejecutar con: npx tsx --env-file=.env.local data/create-test-user.ts
 */
import { ddb, TABLE, QueryCommand, PutCommand, UpdateCommand, generateId, now } from '../lib/db/dynamodb'
import bcrypt from 'bcryptjs'

const TEST_USERS = [
  { email: 'torres@cia999.pe', password: '12345678', label: 'Brigadier Torres (top grade)' },
  { email: 'ramirez@cia999.pe', password: '12345678', label: 'Ten. Brigadier Ramírez' },
  { email: 'herrera@cia999.pe', password: '12345678', label: 'Capitán Herrera' },
  { email: 'gonzalez@cia999.pe', password: '12345678', label: 'Aspirante González' },
]

async function findProfileByEmail(email: string) {
  const { Items } = await ddb.send(new QueryCommand({
    TableName: TABLE.profiles,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
    Limit: 1,
  }))
  return (Items?.[0] as any) ?? null
}

async function findUserByEmail(email: string) {
  const { Items } = await ddb.send(new QueryCommand({
    TableName: TABLE.users,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
    Limit: 1,
  }))
  return (Items?.[0] as any) ?? null
}

async function main() {
  console.log('🔐 Creando usuarios de prueba...\n')

  for (const u of TEST_USERS) {
    const profile = await findProfileByEmail(u.email)

    if (!profile) {
      console.log(`  ⚠️  Perfil no encontrado para ${u.email} — saltando`)
      continue
    }

    const existingUser = await findUserByEmail(u.email)
    const userId = existingUser?.userId ?? profile.userId ?? generateId()
    const passwordHash = await bcrypt.hash(u.password, 12)
    const ts = now()

    // Upsert usuario
    await ddb.send(new PutCommand({
      TableName: TABLE.users,
      Item: {
        userId,
        email: u.email,
        passwordHash,
        createdAt: existingUser?.createdAt ?? ts,
        updatedAt: ts,
      },
    }))

    // Vincular userId al perfil si no lo tiene
    if (!profile.userId) {
      await ddb.send(new UpdateCommand({
        TableName: TABLE.profiles,
        Key: { profileId: profile.profileId },
        UpdateExpression: 'SET userId = :uid, updatedAt = :t',
        ExpressionAttributeValues: { ':uid': userId, ':t': ts },
      }))
    }

    console.log(`  ✓ ${u.label} — ${u.email} / ${u.password}`)
  }

  console.log('\n✅ Usuarios creados. Abre http://localhost:3000/login')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
