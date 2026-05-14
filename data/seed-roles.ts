/**
 * Seed de secciones y cargos (encargatura) para usuarios de prueba.
 *
 * Este script:
 *   1. Crea las 7 secciones reglamentarias (jefatura + 6 secciones de línea/asesoramiento)
 *   2. Asigna cargos de jefatura a Torres (primer_jefe) y Ramírez (segundo_jefe)
 *
 * Idempotente — usa onConflictDoNothing en secciones y upsert en roles.
 * Ejecutar con: npm run db:seed:roles
 *
 * IMPORTANTE: Requiere que los perfiles ya existan (npm run db:seed:operativo primero).
 */

import { db } from '../lib/db'
import { sections, sectionRoles, profiles } from '../lib/db/schema'
import { and, eq } from 'drizzle-orm'

const SECTIONS_DATA = [
  {
    key: 'jefatura',
    name: 'Jefatura',
    type: 'jefatura',
    description: 'Primer Jefe, Segundo Jefe y cargos de dirección (Art. 113-115 RIF)',
    normativeRef: 'Art. 113-115 RIF CGBVP',
    icon: 'shield',
    displayOrder: 0,
  },
  {
    key: 'maquinas',
    name: 'Sección de Máquinas',
    type: 'linea',
    description: 'Mantenimiento y operación del parque automotor (Art. 116a RIF)',
    normativeRef: 'Art. 116a RIF CGBVP',
    icon: 'truck',
    displayOrder: 1,
  },
  {
    key: 'servicios_generales',
    name: 'Sección de Servicios Generales',
    type: 'linea',
    description: 'Logística, cuartel y servicios de apoyo (Art. 116b RIF)',
    normativeRef: 'Art. 116b RIF CGBVP',
    icon: 'wrench',
    displayOrder: 2,
  },
  {
    key: 'instruccion',
    name: 'Sección de Instrucción',
    type: 'linea',
    description: 'Capacitación, ESBAS y entrenamiento operativo (Art. 116c RIF)',
    normativeRef: 'Art. 116c RIF CGBVP',
    icon: 'graduation-cap',
    displayOrder: 3,
  },
  {
    key: 'prehospitalaria',
    name: 'Sección Prehospitalaria',
    type: 'linea',
    description: 'Atención médica de emergencia prehospitalaria (Art. 116d RIF)',
    normativeRef: 'Art. 116d RIF CGBVP',
    icon: 'heart-pulse',
    displayOrder: 4,
  },
  {
    key: 'administracion',
    name: 'Sección de Administración',
    type: 'asesoramiento',
    description: 'Gestión administrativa, personal y recursos (Art. 117a RIF)',
    normativeRef: 'Art. 117a RIF CGBVP',
    icon: 'clipboard',
    displayOrder: 5,
  },
  {
    key: 'imagen',
    name: 'Sección de Imagen',
    type: 'asesoramiento',
    description: 'Comunicación institucional e imagen corporativa (Art. 117b RIF)',
    normativeRef: 'Art. 117b RIF CGBVP',
    icon: 'camera',
    displayOrder: 6,
  },
]

async function upsertJefaturaRole(
  profileId: string,
  sectionId: string,
  role: 'primer_jefe' | 'segundo_jefe',
  label: string
) {
  // Look for any existing row (active or not) for this profile+section
  const existing = await db
    .select()
    .from(sectionRoles)
    .where(
      and(
        eq(sectionRoles.profileId, profileId),
        eq(sectionRoles.sectionId, sectionId)
      )
    )
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(sectionRoles)
      .set({ role, isActive: true })
      .where(
        and(
          eq(sectionRoles.profileId, profileId),
          eq(sectionRoles.sectionId, sectionId)
        )
      )
    console.log(`  ✓ ${label} actualizado como ${role.toUpperCase().replace('_', ' ')}`)
  } else {
    await db.insert(sectionRoles).values({
      profileId,
      sectionId,
      role,
      isActive: true,
    })
    console.log(`  ✓ ${label} asignado como ${role.toUpperCase().replace('_', ' ')}`)
  }
}

async function main() {
  console.log('🏛️  Seed de Secciones y Cargos\n')

  // ── 1. Crear secciones ─────────────────────────────────────────────
  console.log('📋 Creando secciones reglamentarias...')
  for (const s of SECTIONS_DATA) {
    await db
      .insert(sections)
      .values(s)
      .onConflictDoNothing({ target: sections.key })
  }
  console.log(`  ✓ ${SECTIONS_DATA.length} secciones (idempotente)`)

  // Cargar la sección jefatura para obtener su ID
  const [jefaturaSection] = await db
    .select()
    .from(sections)
    .where(eq(sections.key, 'jefatura'))
    .limit(1)

  if (!jefaturaSection) {
    console.error('❌ No se pudo encontrar la sección jefatura después de insertarla.')
    process.exit(1)
  }

  // ── 2. Encontrar perfiles de prueba ────────────────────────────────
  console.log('\n👤 Buscando perfiles de prueba...')

  const torresPerfil = await db.query.profiles.findFirst({
    where: (p, { eq }) => eq(p.email, 'torres@cia999.pe'),
  })

  const ramirezPerfil = await db.query.profiles.findFirst({
    where: (p, { eq }) => eq(p.email, 'ramirez@cia999.pe'),
  })

  if (!torresPerfil) {
    console.warn('  ⚠️  Perfil de Torres no encontrado — omitiendo asignación de Primer Jefe')
    console.warn('       Asegúrate de haber ejecutado npm run db:seed:operativo primero.')
  } else {
    console.log(`  ✓ Torres: ${torresPerfil.fullName} (grado: ${torresPerfil.grade})`)
  }

  if (!ramirezPerfil) {
    console.warn('  ⚠️  Perfil de Ramírez no encontrado — omitiendo asignación de Segundo Jefe')
  } else {
    console.log(`  ✓ Ramírez: ${ramirezPerfil.fullName} (grado: ${ramirezPerfil.grade})`)
  }

  // ── 3. Asignar cargos de jefatura ──────────────────────────────────
  console.log('\n🎖️  Asignando encargatura de Jefatura...')

  if (torresPerfil) {
    await upsertJefaturaRole(torresPerfil.id, jefaturaSection.id, 'primer_jefe', 'Torres')
  }

  if (ramirezPerfil) {
    await upsertJefaturaRole(ramirezPerfil.id, jefaturaSection.id, 'segundo_jefe', 'Ramírez')
  }

  console.log('\n✅ Seed de roles completado.')
  console.log('   Cierra sesión y vuelve a entrar con torres@cia999.pe para aplicar permisos.')
  process.exit(0)
}

main().catch((e) => {
  console.error('❌ Error:', e)
  process.exit(1)
})
