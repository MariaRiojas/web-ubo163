/**
 * CUARTEL-CRM — Script de seed inicial
 *
 * Crea datos de prueba realistas para la Cía. Demo N° 999.
 * Ejecutar con: npm run db:seed  (npx tsx data/seed.ts)
 *
 * Incluye:
 * - 7 secciones del RIF (Art. 112-117)
 * - 1 Primer Jefe + estructura de jefatura
 * - 20 efectivos con roles asignados
 * - 12 camas de guardia nocturna
 * - 5 lecciones ESBAS con progreso de ejemplo
 * - Inventario básico por sección
 * - 3 incidencias de ejemplo
 * - 3 comunicados de ejemplo
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { db } from '../lib/db'
import {
  users,
  sections,
  profiles,
  sectionRoles,
  guardBeds,
  guardShifts,
  esbasLessons,
  esbasProgress,
  inventory,
  incidents,
  announcements,
  serviceHours,
} from '../lib/db/schema'

async function seed() {
  console.log('🌱 Iniciando seed de CUARTEL-CRM...\n')

  // ── 1. SECCIONES (Art. 112 RIF CGBVP) ─────────────────────────────────
  console.log('📋 Creando secciones...')
  const [
    secJefatura,
    secMaquinas,
    secServicios,
    secInstruccion,
    secPrehospitalaria,
    secAdministracion,
    secImagen,
  ] = await db
    .insert(sections)
    .values([
      {
        key: 'jefatura',
        name: 'Jefatura de Compañía',
        type: 'jefatura',
        description: 'Dirección y representación de la UBO. Primer Jefe y Segundo Jefe.',
        normativeRef: 'Art. 113-115 RIF CGBVP',
        icon: 'Shield',
        displayOrder: 0,
      },
      {
        key: 'maquinas',
        name: 'Sección de Máquinas',
        type: 'linea',
        description: 'Operatividad y equipamiento de unidades de emergencia.',
        normativeRef: 'Art. 116a RIF CGBVP',
        icon: 'Truck',
        displayOrder: 1,
      },
      {
        key: 'servicios_generales',
        name: 'Sección de Servicios Generales',
        type: 'linea',
        description: 'Insumos, almacén y mantenimiento de instalaciones.',
        normativeRef: 'Art. 116b RIF CGBVP',
        icon: 'Wrench',
        displayOrder: 2,
      },
      {
        key: 'instruccion',
        name: 'Sección de Instrucción y Entrenamiento',
        type: 'linea',
        description: 'Capacitación del personal en todos sus niveles.',
        normativeRef: 'Art. 116c RIF CGBVP',
        icon: 'GraduationCap',
        displayOrder: 3,
      },
      {
        key: 'prehospitalaria',
        name: 'Sección de Atención Prehospitalaria',
        type: 'linea',
        description: 'Equipamiento y operatividad de unidades médicas.',
        normativeRef: 'Art. 116d RIF CGBVP',
        icon: 'Stethoscope',
        displayOrder: 4,
      },
      {
        key: 'administracion',
        name: 'Sección de Administración',
        type: 'asesoramiento',
        description: 'Gestión administrativa interna de la compañía.',
        normativeRef: 'Art. 117a RIF CGBVP',
        icon: 'ClipboardList',
        displayOrder: 5,
      },
      {
        key: 'imagen',
        name: 'Sección de Imagen de Compañía',
        type: 'asesoramiento',
        description: 'Proyección institucional y comunicaciones.',
        normativeRef: 'Art. 117b RIF CGBVP',
        icon: 'Camera',
        displayOrder: 6,
      },
    ])
    .returning()

  console.log(`  ✓ ${7} secciones creadas`)

  // ── 2. USUARIOS (credenciales de acceso) ────────────────────────────────
  console.log('🔐 Creando usuarios con contraseñas...')
  // Contraseña de desarrollo: "bombero2024" — CAMBIAR en producción
  const DEV_PASSWORD = 'bombero2024'
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12)

  const USER_IDS = [
    'seed-primer-jefe', 'seed-segundo-jefe', 'seed-jefe-maquinas',
    'seed-jefe-servicios', 'seed-jefe-instruccion', 'seed-jefe-prehos',
    'seed-jefe-admin', 'seed-jefe-imagen',
    'seed-ef-01', 'seed-ef-02', 'seed-ef-03', 'seed-ef-04',
    'seed-asp-01', 'seed-asp-02',
  ]

  const EMAILS: Record<string, string> = {
    'seed-primer-jefe':      'torres@cia999.pe',
    'seed-segundo-jefe':     'ramirez@cia999.pe',
    'seed-jefe-maquinas':    'herrera@cia999.pe',
    'seed-jefe-servicios':   'cordova@cia999.pe',
    'seed-jefe-instruccion': 'soto@cia999.pe',
    'seed-jefe-prehos':      'flores@cia999.pe',
    'seed-jefe-admin':       'vega@cia999.pe',
    'seed-jefe-imagen':      'ruiz@cia999.pe',
    'seed-ef-01':            'cardenas@cia999.pe',
    'seed-ef-02':            'diaz@cia999.pe',
    'seed-ef-03':            'mendoza2@cia999.pe',
    'seed-ef-04':            'quispe@cia999.pe',
    'seed-asp-01':           'gonzalez@cia999.pe',
    'seed-asp-02':           'mamani@cia999.pe',
  }

  await db.insert(users).values(
    USER_IDS.map((id) => ({ id, email: EMAILS[id], passwordHash }))
  )
  console.log(`  ✓ ${USER_IDS.length} usuarios creados (contraseña: ${DEV_PASSWORD})`)

  // ── 3. PERFILES ─────────────────────────────────────────────────────────
  console.log('👤 Creando perfiles...')

  const profilesData = await db
    .insert(profiles)
    .values([
      // JEFATURA
      {
        userId: 'seed-primer-jefe',
        fullName: 'Brigadier Torres Mendoza',
        dni: '10000001',
        grade: 'brigadier',
        status: 'activo',
        gender: 'masculino',
        email: 'torres@cia999.pe',
        phone: '+51 999 001 001',
        bloodType: 'O+',
        joinDate: '2000-03-15',
        birthDate: '1975-06-20',
        specialties: ['Liderazgo', 'Gestión de Crisis', 'Rescate Urbano'],
        esbasPromotion: 'ESBAS-2002-I',
      },
      {
        userId: 'seed-segundo-jefe',
        fullName: 'Teniente Brigadier Ramírez Silva',
        dni: '10000002',
        grade: 'teniente_brigadier',
        status: 'activo',
        gender: 'masculino',
        email: 'ramirez@cia999.pe',
        phone: '+51 999 001 002',
        bloodType: 'A+',
        joinDate: '2005-08-10',
        birthDate: '1980-11-15',
        specialties: ['Operaciones', 'Coordinación', 'Rescate Vertical'],
        esbasPromotion: 'ESBAS-2007-I',
      },
      // JEFES DE SECCIÓN
      {
        userId: 'seed-jefe-maquinas',
        fullName: 'Capitán Herrera Vargas',
        dni: '10000003',
        grade: 'capitan',
        status: 'activo',
        gender: 'masculino',
        email: 'herrera@cia999.pe',
        phone: '+51 999 001 003',
        bloodType: 'B+',
        joinDate: '2008-04-20',
        birthDate: '1983-03-08',
        specialties: ['Vehículos de Emergencia', 'Mecánica', 'Rescate Vehicular'],
        esbasPromotion: 'ESBAS-2010-I',
      },
      {
        userId: 'seed-jefe-servicios',
        fullName: 'Teniente Córdova Quispe',
        dni: '10000004',
        grade: 'teniente',
        status: 'activo',
        gender: 'femenino',
        email: 'cordova@cia999.pe',
        phone: '+51 999 001 004',
        bloodType: 'AB+',
        joinDate: '2010-07-15',
        birthDate: '1985-09-22',
        specialties: ['Logística', 'Almacén', 'Hazmat'],
        esbasPromotion: 'ESBAS-2012-II',
      },
      {
        userId: 'seed-jefe-instruccion',
        fullName: 'Teniente Soto Palacios',
        dni: '10000005',
        grade: 'teniente',
        status: 'activo',
        gender: 'masculino',
        email: 'soto@cia999.pe',
        phone: '+51 999 001 005',
        bloodType: 'O-',
        joinDate: '2009-02-28',
        birthDate: '1984-01-10',
        specialties: ['Instrucción', 'ESBAS', 'Incendios Forestales'],
        esbasPromotion: 'ESBAS-2011-I',
      },
      {
        userId: 'seed-jefe-prehos',
        fullName: 'Teniente Flores Medina',
        dni: '10000006',
        grade: 'teniente',
        status: 'activo',
        gender: 'femenino',
        email: 'flores@cia999.pe',
        phone: '+51 999 001 006',
        bloodType: 'A-',
        joinDate: '2011-05-12',
        birthDate: '1986-07-30',
        specialties: ['Atención Prehospitalaria', 'APH Avanzada', 'Rescate Médico'],
        esbasPromotion: 'ESBAS-2013-I',
      },
      {
        userId: 'seed-jefe-admin',
        fullName: 'Teniente Vega Castro',
        dni: '10000007',
        grade: 'teniente',
        status: 'activo',
        gender: 'masculino',
        email: 'vega@cia999.pe',
        phone: '+51 999 001 007',
        bloodType: 'B-',
        joinDate: '2012-09-01',
        birthDate: '1987-04-18',
        specialties: ['Administración', 'Finanzas', 'Recursos Humanos'],
        esbasPromotion: 'ESBAS-2014-II',
      },
      {
        userId: 'seed-jefe-imagen',
        fullName: 'Subteniente Ruiz Palomino',
        dni: '10000008',
        grade: 'subteniente',
        status: 'activo',
        gender: 'femenino',
        email: 'ruiz@cia999.pe',
        phone: '+51 999 001 008',
        bloodType: 'O+',
        joinDate: '2015-03-10',
        birthDate: '1990-12-05',
        specialties: ['Comunicación Social', 'Diseño Gráfico', 'Redes Sociales'],
        esbasPromotion: 'ESBAS-2017-I',
      },
      // EFECTIVOS
      {
        userId: 'seed-ef-01',
        fullName: 'Seccionario Cárdenas López',
        dni: '10000009',
        grade: 'seccionario',
        status: 'activo',
        gender: 'masculino',
        email: 'cardenas@cia999.pe',
        phone: '+51 999 001 009',
        bloodType: 'A+',
        joinDate: '2022-01-15',
        birthDate: '2000-08-12',
        specialties: ['Combate de Incendios'],
        esbasPromotion: 'ESBAS-2022-I',
      },
      {
        userId: 'seed-ef-02',
        fullName: 'Seccionaria Díaz Tello',
        dni: '10000010',
        grade: 'seccionario',
        status: 'activo',
        gender: 'femenino',
        email: 'diaz@cia999.pe',
        phone: '+51 999 001 010',
        bloodType: 'B+',
        joinDate: '2022-01-15',
        birthDate: '2001-03-25',
        specialties: ['Primeros Auxilios'],
        esbasPromotion: 'ESBAS-2022-I',
      },
      {
        userId: 'seed-ef-03',
        fullName: 'Seccionario Mendoza Quiroz',
        dni: '10000011',
        grade: 'seccionario',
        status: 'activo',
        gender: 'masculino',
        email: 'mendoza2@cia999.pe',
        phone: '+51 999 001 011',
        bloodType: 'O+',
        joinDate: '2022-06-01',
        birthDate: '1999-11-30',
        specialties: ['Rescate Vehicular'],
        esbasPromotion: 'ESBAS-2022-II',
      },
      {
        userId: 'seed-ef-04',
        fullName: 'Seccionaria Quispe Huanca',
        dni: '10000012',
        grade: 'seccionario',
        status: 'activo',
        gender: 'femenino',
        email: 'quispe@cia999.pe',
        phone: '+51 999 001 012',
        bloodType: 'AB-',
        joinDate: '2023-01-10',
        birthDate: '2002-05-14',
        specialties: [],
        esbasPromotion: 'ESBAS-2023-I',
      },
      // ASPIRANTES EN CURSO
      {
        userId: 'seed-asp-01',
        fullName: 'Aspirante González Pérez',
        dni: '10000013',
        grade: 'aspirante',
        status: 'aspirante_en_curso',
        gender: 'masculino',
        email: 'gonzalez@cia999.pe',
        phone: '+51 999 001 013',
        bloodType: 'O+',
        joinDate: '2024-01-20',
        birthDate: '2003-02-28',
        specialties: [],
        esbasPromotion: 'ESBAS-2024-I',
      },
      {
        userId: 'seed-asp-02',
        fullName: 'Aspirante Mamani Torres',
        dni: '10000014',
        grade: 'aspirante',
        status: 'aspirante_en_curso',
        gender: 'femenino',
        email: 'mamani@cia999.pe',
        phone: '+51 999 001 014',
        bloodType: 'A+',
        joinDate: '2024-01-20',
        birthDate: '2004-07-19',
        specialties: [],
        esbasPromotion: 'ESBAS-2024-I',
      },
    ])
    .returning()

  console.log(`  ✓ ${profilesData.length} perfiles creados`)

  const [primerJefe, segundoJefe, jefeMaquinas, jefeServicios, jefeInstruccion,
    jefePrehos, jefeAdmin, jefeImagen, ef01, ef02, ef03, ef04, asp01, asp02] = profilesData

  // ── 4. ROLES EN SECCIONES ───────────────────────────────────────────────
  console.log('🎖️  Asignando roles...')
  await db.insert(sectionRoles).values([
    { profileId: primerJefe.id, sectionId: secJefatura.id, role: 'primer_jefe', assignedBy: primerJefe.id },
    { profileId: segundoJefe.id, sectionId: secJefatura.id, role: 'segundo_jefe', assignedBy: primerJefe.id },
    { profileId: jefeMaquinas.id, sectionId: secMaquinas.id, role: 'jefe_seccion', assignedBy: primerJefe.id },
    { profileId: jefeServicios.id, sectionId: secServicios.id, role: 'jefe_seccion', assignedBy: primerJefe.id },
    { profileId: jefeInstruccion.id, sectionId: secInstruccion.id, role: 'jefe_seccion', assignedBy: primerJefe.id },
    { profileId: jefePrehos.id, sectionId: secPrehospitalaria.id, role: 'jefe_seccion', assignedBy: primerJefe.id },
    { profileId: jefeAdmin.id, sectionId: secAdministracion.id, role: 'jefe_seccion', assignedBy: primerJefe.id },
    { profileId: jefeImagen.id, sectionId: secImagen.id, role: 'jefe_seccion', assignedBy: primerJefe.id },
    // Efectivos como miembros
    { profileId: ef01.id, sectionId: secMaquinas.id, role: 'miembro', assignedBy: jefeMaquinas.id },
    { profileId: ef02.id, sectionId: secPrehospitalaria.id, role: 'miembro', assignedBy: jefePrehos.id },
    { profileId: ef03.id, sectionId: secMaquinas.id, role: 'miembro', assignedBy: jefeMaquinas.id },
    { profileId: ef04.id, sectionId: secInstruccion.id, role: 'miembro', assignedBy: jefeInstruccion.id },
  ])
  console.log('  ✓ Roles asignados')

  // ── 5. CAMAS DE GUARDIA ─────────────────────────────────────────────────
  console.log('🛏️  Creando camas de guardia...')
  const beds = await db
    .insert(guardBeds)
    .values(
      Array.from({ length: 12 }, (_, i) => ({
        number: i + 1,
        sector: i < 4 ? 'Sector A' : i < 8 ? 'Sector B' : 'Sector C',
        status: i === 5 ? 'mantenimiento' : 'disponible',
        notes: i === 5 ? 'En revisión por humedad' : null,
      }))
    )
    .returning()
  console.log(`  ✓ ${beds.length} camas creadas`)

  // ── 6. LECCIONES ESBAS ──────────────────────────────────────────────────
  console.log('📚 Creando lecciones ESBAS...')
  const lessons = await db
    .insert(esbasLessons)
    .values([
      {
        module: 'induccion',
        lessonNumber: 1,
        title: 'Inducción al CGBVP',
        description: 'Historia del CGBVP, estructura organizativa, valores y ética del bombero.',
        durationMinutes: 180,
        difficulty: 'basico',
        hasFieldPractice: false,
        contentTheory: ['Historia y fundación del CGBVP', 'Estructura orgánica', 'Código de ética'],
        contentEvaluation: ['Examen teórico sobre historia y organización'],
        displayOrder: 1,
      },
      {
        module: 'induccion',
        lessonNumber: 2,
        title: 'Normas de Seguridad y EPP',
        description: 'Uso correcto del equipo de protección personal y normas de seguridad en emergencias.',
        durationMinutes: 240,
        difficulty: 'basico',
        hasFieldPractice: true,
        contentTheory: ['Tipos de EPP', 'Procedimientos de colocación', 'Normas de seguridad NFPA'],
        contentPractice: ['Colocación de EPP completo en tiempo estándar', 'Revisión de equipo'],
        contentEvaluation: ['Práctica cronometrada de colocación de EPP'],
        displayOrder: 2,
      },
      {
        module: 'teorico_practico',
        lessonNumber: 1,
        title: 'Combate de Incendios I — Fundamentos',
        description: 'Triángulo del fuego, clasificación de incendios, tipos de agentes extintores.',
        durationMinutes: 300,
        difficulty: 'basico',
        hasFieldPractice: true,
        specialtyUnlocked: 'Combate de Incendios Básico',
        contentTheory: ['Química del fuego', 'Clasificación A, B, C, D, K', 'Agentes extintores'],
        contentPractice: ['Manejo de extintores portátiles', 'Técnicas de extinción básica'],
        contentEvaluation: ['Examen teórico + práctica de extinción'],
        displayOrder: 3,
      },
      {
        module: 'teorico_practico',
        lessonNumber: 2,
        title: 'Primeros Auxilios Básicos',
        description: 'Evaluación primaria, RCP, manejo de hemorragias y vendajes.',
        durationMinutes: 360,
        difficulty: 'basico',
        hasFieldPractice: true,
        specialtyUnlocked: 'Primeros Auxilios Básicos',
        contentTheory: ['Cadena de supervivencia', 'Evaluación primaria (ABCDE)', 'Anatomía básica'],
        contentPractice: ['RCP en maniquí', 'Vendajes y torniquetes', 'Inmovilizaciones básicas'],
        contentEvaluation: ['Simulacro de atención prehospitalaria'],
        displayOrder: 4,
      },
      {
        module: 'teorico_practico',
        lessonNumber: 3,
        title: 'Rescate Vehicular I',
        description: 'Estabilización de vehículos, acceso a víctimas y excarcelación básica.',
        durationMinutes: 480,
        difficulty: 'intermedio',
        hasFieldPractice: true,
        specialtyUnlocked: 'Rescate Vehicular',
        contentTheory: ['Biomecánica del trauma', 'Tipos de accidentes', 'Herramientas de excarcelación'],
        contentPractice: ['Estabilización vehicular', 'Uso de herramientas hidráulicas', 'Extricación'],
        contentEvaluation: ['Práctica completa en vehículo de entrenamiento'],
        displayOrder: 5,
      },
    ])
    .returning()
  console.log(`  ✓ ${lessons.length} lecciones ESBAS creadas`)

  // Progreso ESBAS para aspirantes
  await db.insert(esbasProgress).values([
    { profileId: asp01.id, lessonId: lessons[0].id, status: 'completada', theoryCompleted: true, practiceCompleted: false, evaluationScore: '85.00', completedAt: new Date('2024-02-15'), instructorId: jefeInstruccion.id },
    { profileId: asp01.id, lessonId: lessons[1].id, status: 'completada', theoryCompleted: true, practiceCompleted: true, evaluationScore: '92.00', completedAt: new Date('2024-03-01'), instructorId: jefeInstruccion.id },
    { profileId: asp01.id, lessonId: lessons[2].id, status: 'en_curso', theoryCompleted: true, practiceCompleted: false },
    { profileId: asp02.id, lessonId: lessons[0].id, status: 'completada', theoryCompleted: true, practiceCompleted: false, evaluationScore: '78.00', completedAt: new Date('2024-02-15'), instructorId: jefeInstruccion.id },
    { profileId: asp02.id, lessonId: lessons[1].id, status: 'en_curso', theoryCompleted: true, practiceCompleted: false },
  ])
  console.log('  ✓ Progreso ESBAS registrado')

  // ── 7. HORAS DE SERVICIO ─────────────────────────────────────────────────
  console.log('⏰ Registrando horas de servicio...')
  await db.insert(serviceHours).values([
    { profileId: ef01.id, date: '2026-04-01', hours: '12.00', type: 'guardia_nocturna', autoRegistered: true, verifiedBy: primerJefe.id, verifiedAt: new Date('2026-04-02') },
    { profileId: ef01.id, date: '2026-04-05', hours: '12.00', type: 'guardia_nocturna', autoRegistered: true, verifiedBy: primerJefe.id, verifiedAt: new Date('2026-04-06') },
    { profileId: ef01.id, date: '2026-04-10', hours: '4.00', type: 'instruccion', description: 'Práctica de combate de incendios', verifiedBy: jefeInstruccion.id, verifiedAt: new Date('2026-04-10') },
    { profileId: ef02.id, date: '2026-04-03', hours: '12.00', type: 'guardia_nocturna', autoRegistered: true, verifiedBy: primerJefe.id, verifiedAt: new Date('2026-04-04') },
    { profileId: ef02.id, date: '2026-04-08', hours: '3.00', type: 'instruccion', description: 'Curso RCP avanzado', verifiedBy: jefePrehos.id, verifiedAt: new Date('2026-04-08') },
    { profileId: jefeMaquinas.id, date: '2026-04-02', hours: '12.00', type: 'guardia_nocturna', autoRegistered: true, verifiedBy: primerJefe.id, verifiedAt: new Date('2026-04-03') },
    { profileId: jefeMaquinas.id, date: '2026-04-07', hours: '8.00', type: 'mantenimiento', description: 'Revisión técnica unidad A-01', verifiedBy: primerJefe.id, verifiedAt: new Date('2026-04-07') },
  ])
  console.log('  ✓ Horas de servicio registradas')

  // ── 8. INVENTARIO BÁSICO ─────────────────────────────────────────────────
  console.log('📦 Creando inventario básico...')
  await db.insert(inventory).values([
    // Máquinas
    { name: 'Autobomba A-01', category: 'vehiculo', sectionId: secMaquinas.id, serialNumber: 'AB-999-001', quantity: 1, condition: 'operativo', location: 'Bahía Principal', lastMaintenance: '2026-03-15', nextMaintenance: '2026-06-15' },
    { name: 'Camioneta de Rescate R-01', category: 'vehiculo', sectionId: secMaquinas.id, serialNumber: 'R-999-001', quantity: 1, condition: 'operativo', location: 'Bahía 2', lastMaintenance: '2026-02-20', nextMaintenance: '2026-05-20' },
    // EPP — asignado a efectivos
    { name: 'Traje de Aproximación Nº1', category: 'epp', sectionId: secMaquinas.id, quantity: 1, condition: 'operativo', assignedTo: ef01.id, location: 'Casillero 09' },
    { name: 'Traje de Aproximación Nº2', category: 'epp', sectionId: secMaquinas.id, quantity: 1, condition: 'operativo', assignedTo: ef03.id, location: 'Casillero 11' },
    // Prehospitalaria
    { name: 'DEA (Desfibrilador)', category: 'medico', sectionId: secPrehospitalaria.id, serialNumber: 'DEA-999-001', quantity: 1, condition: 'operativo', location: 'Ambulancia A-01', lastMaintenance: '2026-04-01', nextMaintenance: '2026-07-01' },
    { name: 'Camilla de Cuchara', category: 'medico', sectionId: secPrehospitalaria.id, quantity: 2, condition: 'operativo', location: 'Almacén Médico' },
    { name: 'Botiquín de Trauma', category: 'medico', sectionId: secPrehospitalaria.id, quantity: 3, condition: 'operativo', location: 'Almacén Médico', nextMaintenance: '2026-05-01' },
    // Servicios Generales
    { name: 'Extintor PQS 12kg', category: 'herramienta', sectionId: secServicios.id, quantity: 8, condition: 'operativo', location: 'Almacén General', nextMaintenance: '2026-10-01' },
    { name: 'Manguera de 65mm x 30m', category: 'herramienta', sectionId: secMaquinas.id, quantity: 6, condition: 'operativo', location: 'Compartimento A-01' },
  ])
  console.log('  ✓ Inventario creado')

  // ── 9. INCIDENCIAS DE EJEMPLO ────────────────────────────────────────────
  console.log('⚠️  Creando incidencias...')
  await db.insert(incidents).values([
    {
      code: 'INC-2026-001',
      title: 'Manguera dañada en unidad A-01',
      description: 'Durante la revisión pre-operativa se detectó una manguera de 65mm con grieta longitudinal en el tramo central. Requiere reemplazo inmediato.',
      priority: 'alta',
      status: 'en_proceso',
      category: 'equipamiento',
      sectionId: secMaquinas.id,
      reportedBy: ef01.id,
      assignedTo: jefeMaquinas.id,
    },
    {
      code: 'INC-2026-002',
      title: 'Solicitud de reposición de botiquines',
      description: 'Los botiquines de trauma de la ambulancia A-01 tienen insumos vencidos (gasas, vendas). Se solicita reposición urgente al almacén.',
      priority: 'media',
      status: 'pendiente',
      category: 'equipamiento',
      sectionId: secPrehospitalaria.id,
      reportedBy: ef02.id,
    },
    {
      code: 'INC-2026-003',
      title: 'Goteras en techo de bahía 2',
      description: 'Con las lluvias de esta semana se detectaron filtraciones en el techo de la bahía 2, cerca del vehículo R-01. Podría afectar la unidad.',
      priority: 'media',
      status: 'pendiente',
      category: 'infraestructura',
      sectionId: secServicios.id,
      reportedBy: jefeMaquinas.id,
    },
  ])
  console.log('  ✓ Incidencias creadas')

  // ── 10. COMUNICADOS ──────────────────────────────────────────────────────
  console.log('📢 Creando comunicados...')
  await db.insert(announcements).values([
    {
      title: 'Actividad obligatoria: Simulacro Trimestral',
      content: 'Se convoca a todo el personal activo al simulacro trimestral el día sábado 20 de abril a las 08:00h. La asistencia es obligatoria y se contabilizará como horas de instrucción.\n\nPresentarse con EPP completo.',
      priority: 'importante',
      authorId: primerJefe.id,
      publishedAt: new Date('2026-04-10'),
      expiresAt: new Date('2026-04-20'),
      isPinned: true,
    },
    {
      title: 'Inicio de ESBAS-2024-I',
      content: 'Se informa que el proceso ESBAS-2024-I comenzará el lunes 15 de abril. Los aspirantes inscritos deben presentarse a las instalaciones a las 08:00h.\n\nJefe de Instrucción: Ten. Soto Palacios.',
      priority: 'normal',
      authorId: jefeInstruccion.id,
      targetGrades: ['aspirante'],
      publishedAt: new Date('2026-04-08'),
    },
    {
      title: 'Revisión de EPP — Personal de Máquinas',
      content: 'Se solicita a todo el personal de la Sección de Máquinas presentar su EPP para revisión técnica el jueves 18 de abril entre las 14:00h y 17:00h en la bahía principal.',
      priority: 'normal',
      authorId: jefeMaquinas.id,
      targetSections: [secMaquinas.id],
      publishedAt: new Date('2026-04-12'),
    },
  ])
  console.log('  ✓ Comunicados creados')

  console.log('\n✅ Seed completado exitosamente.')
  console.log('\n📋 Credenciales de acceso (usuario = DNI o email):')
  console.log(`  Primer Jefe:   10000001  /  ${DEV_PASSWORD}`)
  console.log(`  Segundo Jefe:  10000002  /  ${DEV_PASSWORD}`)
  console.log(`  Jefe Máquinas: 10000003  /  ${DEV_PASSWORD}`)
  console.log(`  Efectivo:      10000009  /  ${DEV_PASSWORD}`)
  console.log(`  Aspirante:     10000013  /  ${DEV_PASSWORD}`)
  console.log('\n⚠️  Cambiar contraseñas antes de poner en producción.')

  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err)
  process.exit(1)
})
