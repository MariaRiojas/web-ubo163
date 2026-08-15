/**
 * Seed — Curso de Formación Básica de Bomberos (CFBB 2025)
 * Fuente: MP_CFBB_2026.md (DIGEFA / CGBVP)
 *
 * Crea 3 cursos en DynamoDB (uno por módulo) con sus 33 lecciones teóricas.
 * La lección 34 (MATPEL) no está incluida en esta versión del manual.
 *
 * Uso:
 *   $env:AWS_PROFILE="manbuild"; node scripts/seed-cfbb.js
 *
 * Para borrar y volver a crear (si ya existen):
 *   $env:AWS_PROFILE="manbuild"; node scripts/seed-cfbb.js --force
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb')
const { randomUUID } = require('crypto')

const FORCE = process.argv.includes('--force')
const PREFIX = process.env.TABLE_PREFIX ?? 'ubo163-dev'
const TABLE = `${PREFIX}-training-courses`

const client = new DynamoDBClient({ region: 'us-east-1' })
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
})

const now = new Date().toISOString()

// ─── Datos de los cursos ────────────────────────────────────────────────────

const CURSO_ID_MOD1 = randomUUID()
const CURSO_ID_MOD2 = randomUUID()
const CURSO_ID_MOD3 = randomUUID()

function makeLesson(courseId, order, num, title, description, contentType = 'texto') {
  return {
    lessonId: randomUUID(),
    courseId,
    displayOrder: order,
    title: `Lección ${String(num).padStart(2, '0')} — ${title}`,
    description,
    contentType,
    durationMinutes: 180,
    required: true,
  }
}

const MODULO_I_LESSONS = [
  makeLesson(CURSO_ID_MOD1, 0, 1,
    'Introducción al Curso de Formación Básica de Bomberos',
    'Lineamientos académicos del CFBB: módulos, prácticas de campo, régimen de asistencia, sistema de evaluaciones y cuadro de mérito nacional. Derechos y obligaciones del aspirante en curso.'),
  makeLesson(CURSO_ID_MOD1, 1, 2,
    'Doctrina y Mística del Bombero',
    'Definición de Doctrina, Mística y Ética bomberil. Lema "Dios – Patria – Humanidad". Símbolos institucionales del CGBVP. Objetivos y características de la institución. Definición de Bombero Voluntario.'),
  makeLesson(CURSO_ID_MOD1, 2, 3,
    'Historia del CGBVP',
    'Primeros antecedentes en el Perú virreinal. Primera Compañía de Bomberos republicana. Compañías fundadas tras el Combate del 02 de Mayo. Primer Héroe del CBP. Hitos históricos institucionales.'),
  makeLesson(CURSO_ID_MOD1, 3, 4,
    'Organización, Normas y Reglamento',
    'Estructura del CGBVP: Órganos de Gobierno, Comando Nacional, Órganos Desconcentrados. Régimen del Personal y sus clases. Jornada voluntaria. Régimen disciplinario y código de ética.'),
  makeLesson(CURSO_ID_MOD1, 4, 5,
    'Comunicaciones',
    'Central de Emergencias (CEEM) del CGBVP y norma NFPA aplicable. Procedimiento para el uso de comunicaciones radiales. Pasos para confirmar una llamada de emergencia. Comunicaciones en operaciones.'),
  makeLesson(CURSO_ID_MOD1, 5, 6,
    'Seguridad y Trabajo en Equipo',
    'Peligros, riesgos y consecuencias en emergencias. Jerarquía de controles de seguridad. Seguridad durante incendios, rescates, emergencias MATPEL y médicas. Trabajo en equipo y comunicación operativa.'),
  makeLesson(CURSO_ID_MOD1, 6, 7,
    'Manejo Psicológico — Estrés en Bomberos',
    'Causas del estrés en bomberos. Indicadores del EPRA emocional. Fases del modelo continuo de estrés. Signos de alerta de suicidio. Consecuencias de suprimir emociones. Apoyo entre pares y recursos de salud mental.'),
  makeLesson(CURSO_ID_MOD1, 7, 8,
    'Sistema de Comando de Incidentes (SCI) y Contabilidad de Personal',
    'Definición, características y principios del SCI. Estructura funcional del SCI. Pasos del efectivo al mando. Sistema de Contabilidad del Personal (SCP) e importancia. Protocolos de comunicación en el SCI.'),
  makeLesson(CURSO_ID_MOD1, 8, 9,
    'Seguridad y Gestión del Aire del EPRA',
    'Definición de EPRA y atmósferas peligrosas. Tipos y partes del EPRA. Requisitos, ventajas y desventajas de su uso. Gestión del aire: presión, autonomía y alarmas. Procedimientos de entrada y salida con EPRA.'),
]

const MODULO_II_LESSONS = [
  makeLesson(CURSO_ID_MOD2, 0, 10,
    'Comportamiento del Fuego I',
    'Tipos de energía y formas de transferencia de calor. Tipos de combustión. Fuego y pirólisis. Elementos del fuego (tetraedro). Características físicas y químicas de los combustibles.'),
  makeLesson(CURSO_ID_MOD2, 1, 11,
    'Comportamiento del Fuego II',
    'Métodos de extinción. Clases de incendio (A, B, C, D, K). Fases del incendio. Fenómenos peligrosos: Rollover, Flashover y Backdraft. Signos y síntomas externos e internos de riesgo inminente.'),
  makeLesson(CURSO_ID_MOD2, 2, 12,
    'Extintores',
    'Definición de extintor y agente extintor. Clasificación por desplazamiento, por agente y por rango de desempeño. Clases de fuego y extintor adecuado. Procedimiento de inspección, mantenimiento y uso (P.A.S.S.).'),
  makeLesson(CURSO_ID_MOD2, 3, 13,
    'Métodos de Abastecimiento de Agua',
    'Tipos de hidrantes. Pasos para abastecer desde hidrante, napa de agua o piscina. Maniobras de abastecimiento desde fuente de agua con bomba. Cálculo básico de caudal disponible.'),
  makeLesson(CURSO_ID_MOD2, 4, 14,
    'Hidráulica Aplicada a la Lucha Contra Incendios',
    'Conceptos de hidráulica, caudal y presión. Unidades de presión. Principios y tipos de presión. Efecto Venturi. Golpe de ariete y cavitación. Cálculo de pérdidas por fricción en mangueras.'),
  makeLesson(CURSO_ID_MOD2, 5, 15,
    'Chorros de Extinción',
    'Propiedades extintoras del agua. Tipos de chorros: sólido, neblinoso y cónico. Tamaños y características de los chorros. Patrones y aplicaciones. Selección del chorro según el tipo de incendio.'),
  makeLesson(CURSO_ID_MOD2, 6, 16,
    'Técnicas de Extinción Contra Incendios',
    'Acciones prioritarias en un incendio. Técnicas de aplicación con agua: directa, indirecta y combinada. Ventajas y desventajas de cada técnica. Patrones de chorros. Posiciones de acceso al compartimiento.'),
  makeLesson(CURSO_ID_MOD2, 7, 17,
    'Entrada Forzada',
    'Definición y propósito de la entrada forzada. Tipos de herramientas y equipos. Inspección y transporte seguro de herramientas. Condiciones de seguridad. Procedimientos para puertas, ventanas y muros.'),
  makeLesson(CURSO_ID_MOD2, 8, 18,
    'Ventilación en Incendios',
    'Métodos de ventilación: natural, mecánica, hidráulica. Ventilación vertical y horizontal. Ventilación por presión positiva (PPV). Equipos y herramientas. Razones y momento correcto para ventilar.'),
  makeLesson(CURSO_ID_MOD2, 9, 19,
    'Escaleras de Incendio: Tipos y Usos',
    'Tipos de escaleras contra incendios. Medidas de seguridad. Procesos de transporte. Levantamiento y bajada segura. Procedimientos para subir y bajar con y sin equipo, con manguera, con víctima.'),
  makeLesson(CURSO_ID_MOD2, 10, 20,
    'Conservación de la Propiedad',
    'Concepto de salvamento. Daños primarios y secundarios. Reacondicionamiento. Objetivos de las operaciones de conservación. Consideraciones para detener pérdidas adicionales. Uso de lonas y embalaje.'),
  makeLesson(CURSO_ID_MOD2, 11, 21,
    'Evaluación de Estructuras',
    'Elementos estructurales básicos. Métodos de construcción nacionales. Comportamiento de elementos estructurales bajo carga de fuego. Evaluación de estructuras de concreto armado, albañilería y adobe.'),
]

const MODULO_III_LESSONS = [
  makeLesson(CURSO_ID_MOD3, 0, 22,
    'Incendios en Edificios',
    'Definición de incendio en edificio elevado. Tipos de edificación. Elementos a considerar en estructuras elevadas. Problemas específicos para bomberos. Tácticas de extinción y búsqueda en altura.'),
  makeLesson(CURSO_ID_MOD3, 1, 23,
    'Incendios en Sótanos',
    'Definición y tipos de sótanos. Características e incendios en sótanos. Tareas y técnicas específicas. Prevención. Roles de las compañías en un incendio en sótano. Condiciones de visibilidad y ventilación.'),
  makeLesson(CURSO_ID_MOD3, 2, 24,
    'Incendios en Vehículos',
    'Riesgos generales en incendios de vehículos. Tipos de combustibles y energías (GLP, GNV, eléctrico, hidrógeno). Señalización de vía. Procedimientos de extinción según tipo de vehículo. BLEVE en vehículos.'),
  makeLesson(CURSO_ID_MOD3, 3, 25,
    'Incendios en Líquidos Inflamables y Combustibles',
    'Hidrocarburos y su clasificación. Cisternas de transporte de combustible. Fenómenos en incendios en tanques: BLEVE, Boilover, Slopover. Procedimientos de combate. Uso de espumas en líquidos inflamables.'),
  makeLesson(CURSO_ID_MOD3, 4, 26,
    'Fugas e Incendios en Gases Inflamables',
    'Características del GLP, GN y Acetileno. Procedimientos en operaciones con GLP. Definición de explosión. Fenómenos físicos de incendio y explosión de GLP. Definición de BLEVE y procedimientos de respuesta.'),
  makeLesson(CURSO_ID_MOD3, 5, 27,
    'Concentrados y Espumas Contra Incendios',
    'Formas de extinción de las espumas. Tetraedro de Espuma. Tipos de espuma (AFFF, FFFP, proteínica, etc.). Propiedades de la espuma. Aplicación en incendios Clase B. Proporciones y equipos de generación.'),
  makeLesson(CURSO_ID_MOD3, 6, 28,
    'Investigación de Incendios',
    'Finalidad y objetivos de los primeros respondedores en investigación. Actividades en la escena. Importancia de preservar evidencias. Alcance y limitaciones del bombero en investigación. Cadena de custodia básica.'),
  makeLesson(CURSO_ID_MOD3, 7, 29,
    'Rescate en Incendios',
    'Proceso de búsqueda y rescate en ambientes con humo. Técnicas básicas de búsqueda táctica. Condiciones para activar MAYDAY. Procedimiento de respuesta ante compañero en emergencia. Técnicas de arrastre y extricación.'),
  makeLesson(CURSO_ID_MOD3, 8, 30,
    'Rescate en Ascensores',
    'Definición y tipos de ascensor por sistema y uso. Partes del ascensor eléctrico e hidráulico. Medidas de seguridad en rescate. Procedimientos de apertura manual. Coordinación con personal técnico del fabricante.'),
  makeLesson(CURSO_ID_MOD3, 9, 31,
    'Sistemas de Rescate con Cuerdas',
    'Principios de física aplicados al rescate con cuerdas. Tipos de anclaje. Características de los vientos (nudos). Sistema de Ventaja Mecánica. Síndrome del arnés y su tratamiento. Protocolos de seguridad en altura.'),
  makeLesson(CURSO_ID_MOD3, 10, 32,
    'Atención Pre Hospitalaria I',
    'Maniobras para apertura de vías aéreas. Evaluación inicial del paciente. Guía para trauma: control de hemorragias, inmovilización. Método de triage START. Consideraciones de seguridad del respondedor.'),
  makeLesson(CURSO_ID_MOD3, 11, 33,
    'Atención Pre Hospitalaria II',
    'Sistema respiratorio y manejo de OVACE (adulto consciente e inconsciente). Sistema cardiovascular. Cadena de supervivencia extra hospitalaria. Reanimación Cardiopulmonar (RCP) según protocolo AHA.'),
  makeLesson(CURSO_ID_MOD3, 12, 34,
    'Emergencias con Materiales Peligrosos (MATPEL)',
    '[Contenido pendiente — esta lección no está incluida en la versión actual del manual CFBB-2025. Se actualizará cuando esté disponible el módulo MATPEL oficial de DIGEFA.]'),
]

const CURSOS = [
  {
    courseId: CURSO_ID_MOD1,
    slug: 'cfbb-modulo-i',
    title: 'CFBB — Módulo I: Fundamentos e Identidad Bomberil',
    subtitle: 'Curso de Formación Básica de Bomberos · DIGEFA / CGBVP',
    description: 'Primer módulo del Curso de Formación Básica de Bomberos (CFBB) del CGBVP. Cubre los fundamentos institucionales, doctrina, historia, organización, comunicaciones, seguridad, psicología operacional, Sistema de Comando de Incidentes y gestión del EPRA. 9 lecciones teóricas de 3 horas cada una. Nota mínima aprobatoria: 14.',
    category: 'esbas',
    durationHours: 27,
    minGrade: 'postulante',
    availableForPostulantes: true,
    availableForAspirantes: true,
    mandatoryForPostulantes: false,
    mandatoryForAspirantes: true,
    active: true,
    lessons: MODULO_I_LESSONS,
    createdBy: 'seed-cfbb',
    createdAt: now,
    updatedAt: now,
  },
  {
    courseId: CURSO_ID_MOD2,
    slug: 'cfbb-modulo-ii',
    title: 'CFBB — Módulo II: Combate de Incendios',
    subtitle: 'Curso de Formación Básica de Bomberos · DIGEFA / CGBVP',
    description: 'Segundo módulo del CFBB. Cubre el comportamiento del fuego, extintores, abastecimiento de agua, hidráulica, chorros y técnicas de extinción, entrada forzada, ventilación, escaleras, conservación de la propiedad y evaluación de estructuras. 12 lecciones teóricas de 3 horas cada una. Requisito: aprobar Módulo I con nota ≥ 14.',
    category: 'esbas',
    durationHours: 36,
    minGrade: 'aspirante',
    availableForPostulantes: false,
    availableForAspirantes: true,
    mandatoryForPostulantes: false,
    mandatoryForAspirantes: true,
    active: true,
    lessons: MODULO_II_LESSONS,
    createdBy: 'seed-cfbb',
    createdAt: now,
    updatedAt: now,
  },
  {
    courseId: CURSO_ID_MOD3,
    slug: 'cfbb-modulo-iii',
    title: 'CFBB — Módulo III: Incendios Especiales, Rescate y APH',
    subtitle: 'Curso de Formación Básica de Bomberos · DIGEFA / CGBVP',
    description: 'Tercer módulo del CFBB. Cubre incendios en edificios, sótanos, vehículos, líquidos inflamables y gases; espumas; investigación de incendios; rescate en incendios y ascensores; sistemas de rescate con cuerdas; atención prehospitalaria I y II; y emergencias MATPEL. 12 lecciones teóricas + 1 lección MATPEL pendiente. Requisito: aprobar Módulo II con nota ≥ 14.',
    category: 'esbas',
    durationHours: 39,
    minGrade: 'aspirante',
    availableForPostulantes: false,
    availableForAspirantes: true,
    mandatoryForPostulantes: false,
    mandatoryForAspirantes: true,
    active: true,
    lessons: MODULO_III_LESSONS,
    createdBy: 'seed-cfbb',
    createdAt: now,
    updatedAt: now,
  },
]

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔥 Seed CFBB — tabla: ${TABLE}`)
  console.log(`   Perfil AWS: ${process.env.AWS_PROFILE ?? '(default)'}`)
  console.log(`   Forzar recreación: ${FORCE}\n`)

  if (FORCE) {
    console.log('⚠  --force: buscando cursos CFBB existentes para eliminar…')
    const { Items } = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'begins_with(slug, :s)',
      ExpressionAttributeValues: { ':s': 'cfbb-' },
    }))
    for (const item of Items ?? []) {
      await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { courseId: item.courseId } }))
      console.log(`   ✓ Eliminado: ${item.slug}`)
    }
    console.log()
  }

  for (const curso of CURSOS) {
    process.stdout.write(`→ Creando "${curso.title}" (${curso.lessons.length} lecciones)… `)
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: curso,
      ConditionExpression: FORCE ? undefined : 'attribute_not_exists(courseId)',
    }))
    console.log('✓')
    console.log(`   courseId: ${curso.courseId}`)
    console.log(`   slug:     ${curso.slug}`)
    console.log()
  }

  console.log('✅ Seed completado.')
  console.log()
  console.log('Resumen de courseIds (guárdalos si los necesitas después):')
  for (const c of CURSOS) {
    console.log(`  ${c.slug}: ${c.courseId}`)
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
