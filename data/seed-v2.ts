/**
 * CUARTEL-CRM — Seed complementario v2
 *
 * Agrega los datos necesarios para las tablas nuevas del modelo v2:
 *   - Dormitorios de guardia (masculino y femenino)
 *   - Máquinas de la UBO 163
 *   - Compartimientos con QR únicos
 *   - Cursos iniciales (ESBAS + Escuela Técnica)
 *
 * Se ejecuta DESPUÉS del seed principal (npm run db:seed).
 * Ejecutar con: npm run db:seed:v2
 *
 * Idempotente: no duplica si ya se ejecutó antes (usa onConflictDoNothing).
 */

import { randomBytes } from 'node:crypto'
import { db } from '../lib/db'
import {
  guardDormitories,
  guardBunks,
  guardBedsV2,
  machines,
  machineCompartments,
  courses,
  courseLessons,
  libraryDocuments,
} from '../lib/db/schema'

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function genQrCode(): string {
  return `MC-${randomBytes(4).toString('hex').toUpperCase()}`
}

async function seed() {
  console.log('🌱 Seed v2 — Arquitectura extendida...\n')

  // ─────────────────────────────────────────────────────────────────
  // 1. DORMITORIOS DE GUARDIA NOCTURNA
  // ─────────────────────────────────────────────────────────────────
  console.log('🛏️  Creando dormitorios de guardia...')

  const [dormMasc] = await db
    .insert(guardDormitories)
    .values({
      name: 'Dormitorio Masculino',
      gender: 'masculino',
      notes: 'Segundo piso, ala izquierda',
      active: true,
    })
    .returning()

  const [dormFem] = await db
    .insert(guardDormitories)
    .values({
      name: 'Dormitorio Femenino',
      gender: 'femenino',
      notes: 'Segundo piso, ala derecha',
      active: true,
    })
    .returning()

  console.log(`  ✓ 2 dormitorios creados`)

  // ─────────────────────────────────────────────────────────────────
  // 2. CAMAROTES Y CAMAS
  // ─────────────────────────────────────────────────────────────────
  console.log('🏨 Creando camarotes y camas...')

  // Masculino: 6 camarotes (A-F), 12 camas (superior + inferior)
  let bedNumber = 1
  for (const label of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const [bunk] = await db
      .insert(guardBunks)
      .values({
        dormitoryId: dormMasc.id,
        label,
        displayOrder: bedNumber,
      })
      .returning()

    await db.insert(guardBedsV2).values([
      {
        dormitoryId: dormMasc.id,
        bunkId: bunk.id,
        number: bedNumber++,
        position: 'inferior',
        status: 'disponible',
      },
      {
        dormitoryId: dormMasc.id,
        bunkId: bunk.id,
        number: bedNumber++,
        position: 'superior',
        status: 'disponible',
      },
    ])
  }

  // Femenino: 3 camarotes (A-C), 6 camas
  bedNumber = 1
  for (const label of ['A', 'B', 'C']) {
    const [bunk] = await db
      .insert(guardBunks)
      .values({
        dormitoryId: dormFem.id,
        label,
        displayOrder: bedNumber,
      })
      .returning()

    await db.insert(guardBedsV2).values([
      {
        dormitoryId: dormFem.id,
        bunkId: bunk.id,
        number: bedNumber++,
        position: 'inferior',
        status: 'disponible',
      },
      {
        dormitoryId: dormFem.id,
        bunkId: bunk.id,
        number: bedNumber++,
        position: 'superior',
        status: 'disponible',
      },
    ])
  }

  console.log(`  ✓ 9 camarotes · 18 camas (12M + 6F)`)

  // ─────────────────────────────────────────────────────────────────
  // 3. MÁQUINAS DE LA UBO 163
  // ─────────────────────────────────────────────────────────────────
  console.log('🚒 Creando máquinas de la compañía...')

  const [maq163_1] = await db
    .insert(machines)
    .values({
      slug: 'maquina_163_1',
      label: 'MAQUINA 163-1',
      codigoCgbvp: '1288',
      kind: 'autobomba',
      status: 'operativa',
      brand: null,
      model: null,
      notes: 'Autobomba principal de la UBO 163',
    })
    .returning()

  const [amb163] = await db
    .insert(machines)
    .values({
      slug: 'ambulancia_163',
      label: 'AMBULANCIA 163',
      codigoCgbvp: '1377',
      kind: 'ambulancia',
      status: 'operativa',
      notes: 'Ambulancia de atención prehospitalaria',
    })
    .returning()

  const [res163] = await db
    .insert(machines)
    .values({
      slug: 'rescate_163',
      label: 'RESCATE 163',
      codigoCgbvp: '0570',
      kind: 'rescate',
      status: 'operativa',
      notes: 'Unidad de rescate técnico',
    })
    .returning()

  const [aux163] = await db
    .insert(machines)
    .values({
      slug: 'auxiliar_163',
      label: 'AUXILIAR 163',
      codigoCgbvp: '1737',
      kind: 'auxiliar',
      status: 'operativa',
      notes: 'Unidad auxiliar',
    })
    .returning()

  console.log(`  ✓ 4 máquinas creadas`)

  // ─────────────────────────────────────────────────────────────────
  // 4. COMPARTIMIENTOS DE CADA MÁQUINA
  // ─────────────────────────────────────────────────────────────────
  console.log('🗄️  Creando compartimientos con QR único...')

  // MAQUINA 163-1: 15 compartimientos (cabinas numeradas, con letras, cama mangueras)
  const compartimientos163_1 = [
    { name: 'Cabina 1', type: 'cabina' },
    { name: 'Cabina 2', type: 'cabina' },
    { name: 'Cabina 3', type: 'cabina' },
    { name: 'Cabina 4', type: 'cabina' },
    { name: 'Cabina A', type: 'cabina' },
    { name: 'Cabina B', type: 'cabina' },
    { name: 'Cabina T1', type: 'cabina' },
    { name: 'Cabina T2', type: 'cabina' },
    { name: 'Cama de mangueras', type: 'cama_mangueras' },
    { name: 'Paragolpes delantero', type: 'exterior' },
    { name: 'Paragolpes trasero', type: 'exterior' },
    { name: 'Cabina interna (SCBA)', type: 'cabina' },
    { name: 'Cabina piloto', type: 'cabina' },
    { name: 'Techo superior', type: 'exterior' },
    { name: 'Compartimiento lateral', type: 'cabina' },
  ]

  for (const [i, c] of compartimientos163_1.entries()) {
    await db.insert(machineCompartments).values({
      machineId: maq163_1.id,
      name: c.name,
      type: c.type,
      qrCode: genQrCode(),
      displayOrder: i,
      active: true,
    })
  }

  // AMBULANCIA 163: cajones, vitrinas, gavetas
  const compartimientosAmb = [
    { name: 'Gaveta médica 1', type: 'cajon' },
    { name: 'Gaveta médica 2', type: 'cajon' },
    { name: 'Vitrina frontal', type: 'vitrina' },
    { name: 'Vitrina trasera', type: 'vitrina' },
    { name: 'Cajón superior derecho', type: 'cajon' },
    { name: 'Cajón superior izquierdo', type: 'cajon' },
    { name: 'Cabina trasera - mueble A', type: 'cabina' },
    { name: 'Cabina trasera - mueble B', type: 'cabina' },
    { name: 'Compartimiento oxígeno', type: 'cabina' },
    { name: 'Cabina piloto', type: 'cabina' },
  ]

  for (const [i, c] of compartimientosAmb.entries()) {
    await db.insert(machineCompartments).values({
      machineId: amb163.id,
      name: c.name,
      type: c.type,
      qrCode: genQrCode(),
      displayOrder: i,
      active: true,
    })
  }

  // RESCATE 163: compartimientos de rescate técnico
  const compartimientosRes = [
    { name: 'Cabina 1 (trípodes)', type: 'cabina' },
    { name: 'Cabina 2 (canastillas)', type: 'cabina' },
    { name: 'Cabina 3 (picos y palas)', type: 'cabina' },
    { name: 'Cabina 4 (estabilizadores)', type: 'cabina' },
    { name: 'Cabina 5 (gata granja)', type: 'cabina' },
    { name: 'Cabina técnica', type: 'cabina' },
    { name: 'Cabina A (cuerdas)', type: 'cabina' },
    { name: 'Cabina B (arnéses)', type: 'cabina' },
    { name: 'Cabina T1', type: 'cabina' },
    { name: 'Cabina T2', type: 'cabina' },
    { name: 'Techo (escalera)', type: 'exterior' },
    { name: 'Paragolpes', type: 'exterior' },
  ]

  for (const [i, c] of compartimientosRes.entries()) {
    await db.insert(machineCompartments).values({
      machineId: res163.id,
      name: c.name,
      type: c.type,
      qrCode: genQrCode(),
      displayOrder: i,
      active: true,
    })
  }

  // AUXILIAR 163: más simple
  const compartimientosAux = [
    { name: 'Compartimiento 1', type: 'cabina' },
    { name: 'Compartimiento 2', type: 'cabina' },
    { name: 'Compartimiento 3', type: 'cabina' },
    { name: 'Cabina piloto', type: 'cabina' },
    { name: 'Caja trasera', type: 'cabina' },
  ]

  for (const [i, c] of compartimientosAux.entries()) {
    await db.insert(machineCompartments).values({
      machineId: aux163.id,
      name: c.name,
      type: c.type,
      qrCode: genQrCode(),
      displayOrder: i,
      active: true,
    })
  }

  const totalComp =
    compartimientos163_1.length +
    compartimientosAmb.length +
    compartimientosRes.length +
    compartimientosAux.length
  console.log(`  ✓ ${totalComp} compartimientos creados con QR único`)

  // ─────────────────────────────────────────────────────────────────
  // 5. CURSOS INICIALES
  // ─────────────────────────────────────────────────────────────────
  console.log('📚 Creando catálogo de cursos...')

  const catalogo = [
    // ESBAS
    {
      slug: 'esbas',
      title: 'ESBAS',
      subtitle: 'Escuela Básica de Bomberos',
      description:
        'Curso de formación inicial para todo bombero voluntario. Obligatorio para postulantes y aspirantes. Libre para bomberos que deseen repasar.',
      category: 'esbas' as const,
      durationHours: 400,
      availableForPostulantes: true,
      availableForAspirantes: true,
      mandatoryForPostulantes: true,
      mandatoryForAspirantes: true,
    },
    // Escuela Técnica
    {
      slug: 'matpel-1',
      title: 'MATPEL I',
      subtitle: 'Materiales Peligrosos — Nivel Primer Respondedor',
      description: 'Identificación y respuesta inicial a incidentes con materiales peligrosos.',
      category: 'escuela_tecnica' as const,
      durationHours: 24,
      minGrade: 'seccionario',
    },
    {
      slug: 'matpel-2',
      title: 'MATPEL II',
      subtitle: 'Materiales Peligrosos — Nivel Operaciones',
      description: 'Respuesta operativa defensiva a incidentes con materiales peligrosos.',
      category: 'escuela_tecnica' as const,
      durationHours: 40,
      minGrade: 'seccionario',
    },
    {
      slug: 'matpel-3',
      title: 'MATPEL III',
      subtitle: 'Materiales Peligrosos — Nivel Técnico',
      description: 'Intervención técnica y control ofensivo de incidentes HAZMAT.',
      category: 'escuela_tecnica' as const,
      durationHours: 80,
      minGrade: 'subteniente',
    },
    {
      slug: 'brec',
      title: 'BREC',
      subtitle: 'Búsqueda y Rescate en Estructuras Colapsadas',
      description: 'Técnicas de búsqueda, rescate y estabilización en estructuras colapsadas.',
      category: 'escuela_tecnica' as const,
      durationHours: 120,
      minGrade: 'seccionario',
    },
    {
      slug: 'brei',
      title: 'BREI',
      subtitle: 'Búsqueda y Rescate en Espacios Intermedios',
      description: 'Rescate en espacios confinados de nivel intermedio.',
      category: 'escuela_tecnica' as const,
      durationHours: 60,
      minGrade: 'seccionario',
    },
    {
      slug: 'rec',
      title: 'REC',
      subtitle: 'Rescate en Espacios Confinados',
      description: 'Rescate vertical y horizontal en espacios confinados.',
      category: 'escuela_tecnica' as const,
      durationHours: 48,
      minGrade: 'seccionario',
    },
    {
      slug: 'crecl',
      title: 'CRECL',
      subtitle: 'Curso de Rescate en Espacios Confinados Largos',
      description: 'Especialización avanzada en rescate en espacios confinados de gran longitud.',
      category: 'escuela_tecnica' as const,
      durationHours: 80,
      minGrade: 'subteniente',
    },
    {
      slug: 'lote-cuerdas',
      title: 'Lote de Cuerdas de Rescate',
      subtitle: 'Sistemas y técnicas con cuerdas',
      description: 'Sistemas de anclaje, descenso controlado y rescate vertical con cuerdas.',
      category: 'escuela_tecnica' as const,
      durationHours: 40,
      minGrade: 'seccionario',
    },
    {
      slug: 'supervivencia-bombero',
      title: 'Supervivencia del Bombero',
      subtitle: 'Autorrescate y Supervivencia',
      description:
        'Técnicas de autorrescate ante situaciones críticas: desorientación, caída, atrapamiento, baja de aire.',
      category: 'escuela_tecnica' as const,
      durationHours: 30,
      minGrade: 'seccionario',
    },
    {
      slug: 'nfpa-basico',
      title: 'Normas NFPA — Introducción',
      subtitle: 'Fundamentos de las normas NFPA aplicables a bomberos',
      description: 'Introducción a las normas internacionales NFPA más relevantes para la operación bomberil.',
      category: 'norma' as const,
      durationHours: 16,
      minGrade: 'seccionario',
    },
  ]

  for (const c of catalogo) {
    await db
      .insert(courses)
      .values({
        ...c,
        availableForPostulantes: c.availableForPostulantes ?? false,
        availableForAspirantes: c.availableForAspirantes ?? false,
        mandatoryForPostulantes: c.mandatoryForPostulantes ?? false,
        mandatoryForAspirantes: c.mandatoryForAspirantes ?? false,
        active: true,
      })
      .onConflictDoNothing({ target: courses.slug })
  }

  console.log(`  ✓ ${catalogo.length} cursos en catálogo`)

  // ─────────────────────────────────────────────────────────────────
  // 6. BIBLIOTECA DE REFERENCIA
  // ─────────────────────────────────────────────────────────────────
  console.log('📖 Creando entradas de biblioteca...')

  await db.insert(libraryDocuments).values([
    {
      title: 'Reglamento Interno de Funcionamiento (RIF) 2024',
      description: 'Reglamento madre del CGBVP. Octubre 2023.',
      category: 'reglamentos',
      fileKey: 'library/RIF_VERSION_2024.pdf',
      mimeType: 'application/pdf',
      visibleToAspirantes: true,
      visibleToPostulantes: true,
    },
    {
      title: 'NDR — Ascensos',
      description: 'Norma de Desarrollo del Reglamento sobre ascensos (agosto 2023).',
      category: 'reglamentos',
      fileKey: 'library/NDR-ASCENSOS-AGOSTO-2023-FINAL-1.pdf',
      mimeType: 'application/pdf',
      visibleToAspirantes: true,
    },
    {
      title: 'NDR — Incorporación al CGBVP',
      description: 'Proceso de incorporación de nuevos bomberos voluntarios.',
      category: 'reglamentos',
      fileKey: 'library/NDR-Incorporacion-al-CGBVP-vf.pdf',
      mimeType: 'application/pdf',
      visibleToAspirantes: true,
      visibleToPostulantes: true,
    },
    {
      title: 'NDR — Uniformes, Insignias, Reconocimientos y Condecoraciones',
      description: 'Normativa completa sobre uniformes y distintivos.',
      category: 'reglamentos',
      fileKey: 'library/NDR-UNIFORMES-INSIGNIAS-RECONOCIMIENTOS-Y-CONDECORACIONES.pdf',
      mimeType: 'application/pdf',
      visibleToAspirantes: true,
    },
    {
      title: 'NDR — Admisión ESBAS',
      description: 'Requisitos y proceso de admisión a la Escuela Básica de Bomberos.',
      category: 'reglamentos',
      fileKey: 'library/NDR-Admision-ESBAS-07-AGOSTO-2023.pdf',
      mimeType: 'application/pdf',
      visibleToAspirantes: true,
      visibleToPostulantes: true,
    },
    {
      title: 'NDR — Malla Curricular ESBAS',
      description: 'Malla curricular oficial de la Escuela Básica de Bomberos.',
      category: 'reglamentos',
      fileKey: 'library/NDR_MALLA_CURRICULAR.pdf',
      mimeType: 'application/pdf',
      visibleToAspirantes: true,
      visibleToPostulantes: true,
    },
  ])

  console.log(`  ✓ 6 documentos en biblioteca`)

  console.log('\n✅ Seed v2 completado')
}

seed()
  .catch((err) => {
    console.error('❌ Error en seed v2:', err)
    process.exit(1)
  })
  .then(() => process.exit(0))
