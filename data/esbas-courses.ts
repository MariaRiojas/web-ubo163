// Sistema de cursos ESBAS (Escuela Superior de Bomberos)
// 30 lecciones con sistema de desbloqueo progresivo

export interface Lesson {
  id: number
  title: string
  description: string
  duration: number // en minutos
  difficulty: 'basico' | 'intermedio' | 'avanzado'
  requiredLesson: number | null // ID de la lección requerida para desbloquear esta
  specialtyUnlocked?: string // Especialidad que se desbloquea al completar
  content: {
    theory: string[]
    practice: string[]
    evaluation: string[]
  }
}

export interface Specialty {
  id: string
  name: string
  icon: string
  description: string
  unlockedAt: number // ID de lección que desbloquea esta especialidad
  color: string
}

export const SPECIALTIES: Specialty[] = [
  {
    id: 'basico',
    name: 'Bombero Básico',
    icon: 'Shield',
    description: 'Conocimientos fundamentales de bomberos',
    unlockedAt: 5,
    color: 'blue'
  },
  {
    id: 'rescate',
    name: 'Rescate',
    icon: 'HeartPulse',
    description: 'Técnicas de rescate en emergencias',
    unlockedAt: 10,
    color: 'green'
  },
  {
    id: 'incendios',
    name: 'Control de Incendios',
    icon: 'Flame',
    description: 'Combate y prevención de incendios',
    unlockedAt: 15,
    color: 'red'
  },
  {
    id: 'materiales_peligrosos',
    name: 'Materiales Peligrosos',
    icon: 'AlertTriangle',
    description: 'Manejo de sustancias peligrosas',
    unlockedAt: 20,
    color: 'yellow'
  },
  {
    id: 'primeros_auxilios',
    name: 'Primeros Auxilios Avanzados',
    icon: 'Cross',
    description: 'Atención médica de emergencia',
    unlockedAt: 25,
    color: 'purple'
  },
  {
    id: 'instructor',
    name: 'Instructor',
    icon: 'GraduationCap',
    description: 'Capacitación como instructor',
    unlockedAt: 30,
    color: 'gold'
  }
]

export const LESSONS: Lesson[] = [
  // NIVEL BÁSICO (1-10)
  {
    id: 1,
    title: 'Introducción al Cuerpo de Bomberos',
    description: 'Historia, estructura y valores del cuerpo de bomberos',
    duration: 30,
    difficulty: 'basico',
    requiredLesson: null,
    content: {
      theory: [
        'Historia del cuerpo de bomberos',
        'Estructura organizacional',
        'Valores y principios',
        'Código de ética'
      ],
      practice: [
        'Reconocimiento de instalaciones',
        'Protocolo de saludo y jerarquías'
      ],
      evaluation: [
        'Cuestionario sobre historia',
        'Identificación de estructura'
      ]
    }
  },
  {
    id: 2,
    title: 'Equipamiento Personal Básico',
    description: 'Conocimiento y uso del equipo de protección personal',
    duration: 45,
    difficulty: 'basico',
    requiredLesson: 1,
    content: {
      theory: [
        'Tipos de equipo de protección',
        'Cuidado y mantenimiento',
        'Normas de seguridad'
      ],
      practice: [
        'Colocación correcta del equipo',
        'Inspección pre-uso',
        'Limpieza y almacenamiento'
      ],
      evaluation: [
        'Demostración práctica',
        'Cuestionario de seguridad'
      ]
    }
  },
  {
    id: 3,
    title: 'Comunicaciones de Emergencia',
    description: 'Uso de radios y protocolos de comunicación',
    duration: 40,
    difficulty: 'basico',
    requiredLesson: 2,
    content: {
      theory: [
        'Código fonético',
        'Protocolos de radio',
        'Señales de emergencia'
      ],
      practice: [
        'Uso de radio',
        'Simulacros de comunicación',
        'Reportes de incidentes'
      ],
      evaluation: [
        'Ejercicio de comunicación',
        'Simulacro de emergencia'
      ]
    }
  },
  {
    id: 4,
    title: 'Física del Fuego',
    description: 'Fundamentos científicos de la combustión',
    duration: 50,
    difficulty: 'basico',
    requiredLesson: 3,
    content: {
      theory: [
        'Triángulo y tetraedro del fuego',
        'Tipos de combustión',
        'Propagación del calor',
        'Clases de fuego'
      ],
      practice: [
        'Identificación de clases de fuego',
        'Experimentos controlados'
      ],
      evaluation: [
        'Examen teórico',
        'Análisis de casos'
      ]
    }
  },
  {
    id: 5,
    title: 'Primeros Auxilios Básicos',
    description: 'Técnicas fundamentales de primeros auxilios',
    duration: 60,
    difficulty: 'basico',
    requiredLesson: 4,
    specialtyUnlocked: 'Bombero Básico',
    content: {
      theory: [
        'Evaluación de víctimas',
        'RCP básico',
        'Control de hemorragias',
        'Manejo de fracturas'
      ],
      practice: [
        'Práctica de RCP',
        'Vendajes y entablillado',
        'Simulacros de atención'
      ],
      evaluation: [
        'Certificación de RCP',
        'Evaluación práctica'
      ]
    }
  },
  {
    id: 6,
    title: 'Uso de Extintores',
    description: 'Tipos de extintores y técnicas de uso',
    duration: 45,
    difficulty: 'basico',
    requiredLesson: 5,
    content: {
      theory: [
        'Tipos de extintores',
        'Agentes extintores',
        'Selección según clase de fuego'
      ],
      practice: [
        'Técnica PASS',
        'Práctica con extintores',
        'Mantenimiento preventivo'
      ],
      evaluation: [
        'Demostración práctica',
        'Cuestionario técnico'
      ]
    }
  },
  {
    id: 7,
    title: 'Nudos y Cuerdas',
    description: 'Técnicas de anudado para rescate',
    duration: 55,
    difficulty: 'basico',
    requiredLesson: 6,
    content: {
      theory: [
        'Tipos de cuerdas',
        'Resistencia y carga',
        'Inspección de cuerdas'
      ],
      practice: [
        'Nudo de ocho',
        'Nudo ballestrinque',
        'As de guía',
        'Nudo prusik'
      ],
      evaluation: [
        'Demostración de nudos',
        'Prueba de resistencia'
      ]
    }
  },
  {
    id: 8,
    title: 'Escaleras y Accesos',
    description: 'Uso seguro de escaleras de bomberos',
    duration: 50,
    difficulty: 'basico',
    requiredLesson: 7,
    content: {
      theory: [
        'Tipos de escaleras',
        'Ángulos de apoyo',
        'Capacidad de carga'
      ],
      practice: [
        'Transporte de escaleras',
        'Colocación y aseguramiento',
        'Ascenso y descenso'
      ],
      evaluation: [
        'Ejercicio práctico',
        'Evaluación de seguridad'
      ]
    }
  },
  {
    id: 9,
    title: 'Herramientas de Corte y Penetración',
    description: 'Uso de herramientas para entrada forzada',
    duration: 60,
    difficulty: 'intermedio',
    requiredLesson: 8,
    content: {
      theory: [
        'Tipos de herramientas',
        'Técnicas de penetración',
        'Seguridad en el uso'
      ],
      practice: [
        'Uso de hacha',
        'Uso de motosierra',
        'Técnicas de entrada forzada'
      ],
      evaluation: [
        'Demostración práctica',
        'Evaluación de seguridad'
      ]
    }
  },
  {
    id: 10,
    title: 'Búsqueda y Rescate Básico',
    description: 'Técnicas de búsqueda en estructuras',
    duration: 70,
    difficulty: 'intermedio',
    requiredLesson: 9,
    specialtyUnlocked: 'Rescate',
    content: {
      theory: [
        'Patrones de búsqueda',
        'Marcado de áreas',
        'Comunicación en búsqueda'
      ],
      practice: [
        'Búsqueda primaria',
        'Búsqueda secundaria',
        'Simulacros en humo'
      ],
      evaluation: [
        'Ejercicio de búsqueda',
        'Evaluación en condiciones adversas'
      ]
    }
  },

  // NIVEL INTERMEDIO (11-20)
  {
    id: 11,
    title: 'Mangueras y Sistemas de Agua',
    description: 'Operación de líneas de mangueras',
    duration: 65,
    difficulty: 'intermedio',
    requiredLesson: 10,
    content: {
      theory: [
        'Tipos de mangueras',
        'Presiones de agua',
        'Flujo y alcance'
      ],
      practice: [
        'Tendido de líneas',
        'Operación de pitones',
        'Trabajo en equipo'
      ],
      evaluation: [
        'Ejercicio práctico',
        'Evaluación de eficiencia'
      ]
    }
  },
  {
    id: 12,
    title: 'Bombas y Sistemas Hidráulicos',
    description: 'Operación de bombas de agua',
    duration: 70,
    difficulty: 'intermedio',
    requiredLesson: 11,
    content: {
      theory: [
        'Tipos de bombas',
        'Principios hidráulicos',
        'Cálculos de presión'
      ],
      practice: [
        'Operación de bomba',
        'Mantenimiento básico',
        'Resolución de problemas'
      ],
      evaluation: [
        'Certificación de operador',
        'Examen práctico'
      ]
    }
  },
  {
    id: 13,
    title: 'Ventilación Táctica',
    description: 'Técnicas de ventilación en incendios',
    duration: 60,
    difficulty: 'intermedio',
    requiredLesson: 12,
    content: {
      theory: [
        'Tipos de ventilación',
        'Ventilación horizontal/vertical',
        'Presión positiva'
      ],
      practice: [
        'Ventilación natural',
        'Uso de ventiladores',
        'Coordinación con ataque'
      ],
      evaluation: [
        'Simulacro de incendio',
        'Evaluación de técnicas'
      ]
    }
  },
  {
    id: 14,
    title: 'Comportamiento del Fuego en Estructuras',
    description: 'Análisis avanzado de incendios estructurales',
    duration: 75,
    difficulty: 'intermedio',
    requiredLesson: 13,
    content: {
      theory: [
        'Fases del incendio',
        'Flashover y backdraft',
        'Lectura de humo',
        'Indicadores de colapso'
      ],
      practice: [
        'Análisis de escenarios',
        'Simulaciones',
        'Toma de decisiones'
      ],
      evaluation: [
        'Examen avanzado',
        'Análisis de casos reales'
      ]
    }
  },
  {
    id: 15,
    title: 'Ataque de Incendios Estructurales',
    description: 'Estrategias y tácticas de combate',
    duration: 80,
    difficulty: 'intermedio',
    requiredLesson: 14,
    specialtyUnlocked: 'Control de Incendios',
    content: {
      theory: [
        'Estrategia ofensiva/defensiva',
        'Tamaño y ubicación',
        'Coordinación de equipo'
      ],
      practice: [
        'Simulacros de incendio',
        'Trabajo en equipo',
        'Toma de decisiones bajo presión'
      ],
      evaluation: [
        'Certificación de ataque',
        'Evaluación de liderazgo'
      ]
    }
  },
  {
    id: 16,
    title: 'Rescate Vehicular',
    description: 'Extricación de víctimas en accidentes',
    duration: 90,
    difficulty: 'intermedio',
    requiredLesson: 15,
    content: {
      theory: [
        'Estabilización de vehículos',
        'Herramientas hidráulicas',
        'Anatomía del vehículo'
      ],
      practice: [
        'Uso de spreader y cutter',
        'Técnicas de extricación',
        'Manejo de víctimas atrapadas'
      ],
      evaluation: [
        'Ejercicio de extricación',
        'Evaluación de tiempo y seguridad'
      ]
    }
  },
  {
    id: 17,
    title: 'Rescate en Altura',
    description: 'Técnicas de rescate en espacios elevados',
    duration: 85,
    difficulty: 'avanzado',
    requiredLesson: 16,
    content: {
      theory: [
        'Sistemas de anclaje',
        'Mecánica de cuerdas',
        'Factor de caída'
      ],
      practice: [
        'Rappel',
        'Ascenso por cuerda',
        'Sistemas de poleas',
        'Rescate de víctimas'
      ],
      evaluation: [
        'Certificación de altura',
        'Evaluación práctica avanzada'
      ]
    }
  },
  {
    id: 18,
    title: 'Rescate en Espacios Confinados',
    description: 'Operaciones en espacios reducidos',
    duration: 95,
    difficulty: 'avanzado',
    requiredLesson: 17,
    content: {
      theory: [
        'Identificación de espacios confinados',
        'Atmósferas peligrosas',
        'Permisos de entrada'
      ],
      practice: [
        'Monitoreo atmosférico',
        'Técnicas de rescate',
        'Uso de SCBA'
      ],
      evaluation: [
        'Certificación de espacios confinados',
        'Simulacro complejo'
      ]
    }
  },
  {
    id: 19,
    title: 'Rescate Acuático',
    description: 'Técnicas de rescate en agua',
    duration: 100,
    difficulty: 'avanzado',
    requiredLesson: 18,
    content: {
      theory: [
        'Tipos de rescate acuático',
        'Corrientes y peligros',
        'Equipo de flotación'
      ],
      practice: [
        'Natación de rescate',
        'Uso de bote',
        'Técnicas de aproximación'
      ],
      evaluation: [
        'Prueba de natación',
        'Simulacro de rescate'
      ]
    }
  },
  {
    id: 20,
    title: 'Materiales Peligrosos - Nivel I',
    description: 'Identificación y respuesta inicial',
    duration: 90,
    difficulty: 'avanzado',
    requiredLesson: 19,
    specialtyUnlocked: 'Materiales Peligrosos',
    content: {
      theory: [
        'Clasificación de materiales',
        'Libro naranja',
        'Zonas de control',
        'Descontaminación básica'
      ],
      practice: [
        'Identificación de placas',
        'Uso de detectores',
        'Establecimiento de zonas'
      ],
      evaluation: [
        'Certificación HazMat Nivel I',
        'Simulacro de incidente'
      ]
    }
  },

  // NIVEL AVANZADO (21-30)
  {
    id: 21,
    title: 'Materiales Peligrosos - Nivel II',
    description: 'Operaciones avanzadas con HazMat',
    duration: 100,
    difficulty: 'avanzado',
    requiredLesson: 20,
    content: {
      theory: [
        'Química de materiales peligrosos',
        'Equipos de detección',
        'Mitigación de derrames'
      ],
      practice: [
        'Uso de trajes nivel A/B',
        'Taponamiento y contención',
        'Descontaminación completa'
      ],
      evaluation: [
        'Certificación HazMat Nivel II',
        'Ejercicio complejo'
      ]
    }
  },
  {
    id: 22,
    title: 'Manejo de Incidentes con Múltiples Víctimas',
    description: 'Sistema de comando de incidentes',
    duration: 85,
    difficulty: 'avanzado',
    requiredLesson: 21,
    content: {
      theory: [
        'Sistema ICS',
        'Triage START',
        'Coordinación multiagencia'
      ],
      practice: [
        'Establecimiento de comando',
        'Triage de víctimas',
        'Gestión de recursos'
      ],
      evaluation: [
        'Simulacro de MCI',
        'Evaluación de liderazgo'
      ]
    }
  },
  {
    id: 23,
    title: 'Trauma Avanzado',
    description: 'Atención médica de emergencia avanzada',
    duration: 110,
    difficulty: 'avanzado',
    requiredLesson: 22,
    content: {
      theory: [
        'Evaluación primaria y secundaria',
        'Manejo de vía aérea',
        'Control de shock',
        'Traumas específicos'
      ],
      practice: [
        'Intubación (maniquí)',
        'Inmovilización espinal',
        'Torniquetes y hemostáticos'
      ],
      evaluation: [
        'Escenarios de trauma',
        'Evaluación práctica'
      ]
    }
  },
  {
    id: 24,
    title: 'Soporte Vital Avanzado',
    description: 'Técnicas de soporte vital cardíaco',
    duration: 120,
    difficulty: 'avanzado',
    requiredLesson: 23,
    content: {
      theory: [
        'Electrocardiografía básica',
        'Farmacología de emergencia',
        'Protocolos ACLS'
      ],
      practice: [
        'RCP avanzado',
        'Desfibrilación',
        'Administración de medicamentos'
      ],
      evaluation: [
        'Certificación ACLS',
        'Megacode'
      ]
    }
  },
  {
    id: 25,
    title: 'Medicina de Emergencias Pediátricas',
    description: 'Atención especializada a niños',
    duration: 100,
    difficulty: 'avanzado',
    requiredLesson: 24,
    specialtyUnlocked: 'Primeros Auxilios Avanzados',
    content: {
      theory: [
        'Diferencias anatómicas',
        'Dosis pediátricas',
        'Evaluación pediátrica'
      ],
      practice: [
        'RCP pediátrico',
        'Vía aérea pediátrica',
        'Manejo de emergencias comunes'
      ],
      evaluation: [
        'Certificación PALS',
        'Escenarios pediátricos'
      ]
    }
  },
  {
    id: 26,
    title: 'Comando de Incidente',
    description: 'Liderazgo y gestión de emergencias',
    duration: 90,
    difficulty: 'avanzado',
    requiredLesson: 25,
    content: {
      theory: [
        'Sistema ICS completo',
        'Planificación de operaciones',
        'Gestión de recursos',
        'Comunicación efectiva'
      ],
      practice: [
        'Simulacros de comando',
        'Toma de decisiones',
        'Coordinación interagencial'
      ],
      evaluation: [
        'Ejercicio de comando',
        'Evaluación de liderazgo'
      ]
    }
  },
  {
    id: 27,
    title: 'Investigación de Incendios',
    description: 'Determinación de causa y origen',
    duration: 95,
    difficulty: 'avanzado',
    requiredLesson: 26,
    content: {
      theory: [
        'Patrones de fuego',
        'Indicadores de incendio provocado',
        'Preservación de evidencia',
        'Documentación'
      ],
      practice: [
        'Análisis de escena',
        'Fotografía forense',
        'Recolección de evidencia'
      ],
      evaluation: [
        'Informe de investigación',
        'Análisis de caso real'
      ]
    }
  },
  {
    id: 28,
    title: 'Prevención de Incendios',
    description: 'Inspección y educación comunitaria',
    duration: 85,
    difficulty: 'avanzado',
    requiredLesson: 27,
    content: {
      theory: [
        'Códigos de construcción',
        'Sistemas de supresión',
        'Planificación de evacuación'
      ],
      practice: [
        'Inspecciones',
        'Educación pública',
        'Desarrollo de planes'
      ],
      evaluation: [
        'Informe de inspección',
        'Presentación educativa'
      ]
    }
  },
  {
    id: 29,
    title: 'Operaciones en Desastres',
    description: 'Respuesta a emergencias mayores',
    duration: 110,
    difficulty: 'avanzado',
    requiredLesson: 28,
    content: {
      theory: [
        'Tipos de desastres',
        'Planificación de contingencia',
        'Gestión de crisis',
        'Recuperación'
      ],
      practice: [
        'Simulacro de terremoto',
        'Simulacro de inundación',
        'Coordinación de albergues'
      ],
      evaluation: [
        'Ejercicio de desastre',
        'Plan de respuesta'
      ]
    }
  },
  {
    id: 30,
    title: 'Metodología de Instrucción',
    description: 'Técnicas para capacitar a otros',
    duration: 120,
    difficulty: 'avanzado',
    requiredLesson: 29,
    specialtyUnlocked: 'Instructor',
    content: {
      theory: [
        'Estilos de aprendizaje',
        'Desarrollo de lecciones',
        'Evaluación de estudiantes',
        'Técnicas de presentación'
      ],
      practice: [
        'Preparación de clase',
        'Presentación práctica',
        'Feedback constructivo'
      ],
      evaluation: [
        'Clase práctica',
        'Certificación de instructor'
      ]
    }
  }
]

// Función para obtener lecciones disponibles para un usuario
export function getAvailableLessons(completedLessons: number[]): Lesson[] {
  return LESSONS.filter(lesson => {
    if (lesson.requiredLesson === null) return true
    return completedLessons.includes(lesson.requiredLesson)
  })
}

// Función para obtener especialidades desbloqueadas
export function getUnlockedSpecialties(completedLessons: number[]): Specialty[] {
  return SPECIALTIES.filter(specialty =>
    completedLessons.includes(specialty.unlockedAt)
  )
}

// Función para calcular progreso
export function calculateProgress(completedLessons: number[]): {
  percentage: number
  current: number
  total: number
} {
  return {
    percentage: Math.round((completedLessons.length / LESSONS.length) * 100),
    current: completedLessons.length,
    total: LESSONS.length
  }
}
