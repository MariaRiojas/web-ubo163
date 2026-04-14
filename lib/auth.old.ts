// Sistema de autenticación para Intranet Bomberos
// Los datos se cargan desde credentials.txt (no incluido en git)

export type UserRole = 'comandante' | 'jefe_area' | 'jefe_guardia' | 'efectivo'
export type Gender = 'masculino' | 'femenino'
export type Area = 'comandancia' | 'administracion' | 'servicios' | 'operaciones' | 'sanidad' | 'imagen' | 'jefatura'

export interface User {
  username: string
  password: string
  role: UserRole
  name: string
  gender: Gender
  area: Area
}

// Credenciales hardcodeadas para producción
// En un entorno real, estas se cargarían de una base de datos
const USERS: User[] = [
  // COMANDANCIA
  {
    username: 'comandante',
    password: 'Bomberos2024!',
    role: 'comandante',
    name: 'Comandante General Torres',
    gender: 'masculino',
    area: 'comandancia'
  },
  // JEFES DE ÁREA
  {
    username: 'jefe.admin',
    password: 'Admin2024!',
    role: 'jefe_area',
    name: 'Jefe Administración Pérez',
    gender: 'masculino',
    area: 'administracion'
  },
  {
    username: 'jefe.servicios',
    password: 'Servicios2024!',
    role: 'jefe_area',
    name: 'Jefa Servicios Generales García',
    gender: 'femenino',
    area: 'servicios'
  },
  {
    username: 'jefe.operaciones',
    password: 'Oper2024!',
    role: 'jefe_area',
    name: 'Jefe Operaciones Martínez',
    gender: 'masculino',
    area: 'operaciones'
  },
  {
    username: 'jefe.sanidad',
    password: 'Sanidad2024!',
    role: 'jefe_area',
    name: 'Jefa Sanidad López',
    gender: 'femenino',
    area: 'sanidad'
  },
  {
    username: 'jefe.imagen',
    password: 'Imagen2024!',
    role: 'jefe_area',
    name: 'Jefe Imagen Rojas',
    gender: 'masculino',
    area: 'imagen'
  },
  // JEFE DE GUARDIA
  {
    username: 'jefe.guardia',
    password: 'Guardia2024!',
    role: 'jefe_guardia',
    name: 'Jefe de Guardia Sánchez',
    gender: 'masculino',
    area: 'jefatura'
  },
  // EFECTIVOS
  {
    username: 'efectivo.m1',
    password: 'Efectivo2024!',
    role: 'efectivo',
    name: 'Carlos Ramírez',
    gender: 'masculino',
    area: 'operaciones'
  },
  {
    username: 'efectivo.m2',
    password: 'Efectivo2024!',
    role: 'efectivo',
    name: 'Juan Fernández',
    gender: 'masculino',
    area: 'operaciones'
  },
  {
    username: 'efectivo.f1',
    password: 'Efectivo2024!',
    role: 'efectivo',
    name: 'María González',
    gender: 'femenino',
    area: 'sanidad'
  },
  {
    username: 'efectivo.f2',
    password: 'Efectivo2024!',
    role: 'efectivo',
    name: 'Ana Silva',
    gender: 'femenino',
    area: 'imagen'
  },
  {
    username: 'efectivo.m3',
    password: 'Efectivo2024!',
    role: 'efectivo',
    name: 'Pedro Castro',
    gender: 'masculino',
    area: 'servicios'
  },
  {
    username: 'efectivo.f3',
    password: 'Efectivo2024!',
    role: 'efectivo',
    name: 'Laura Vega',
    gender: 'femenino',
    area: 'administracion'
  }
]

/**
 * Autentica un usuario con sus credenciales
 */
export function authenticateUser(username: string, password: string): User | null {
  const user = USERS.find(u => u.username === username && u.password === password)
  return user || null
}

/**
 * Verifica si un usuario tiene acceso a un área específica
 */
export function hasAccessToArea(user: User, area: Area): boolean {
  // Comandante tiene acceso a todo
  if (user.role === 'comandante') return true

  // Jefe de área solo tiene acceso a su área
  if (user.role === 'jefe_area') return user.area === area

  // Jefe de guardia tiene acceso a jefatura
  if (user.role === 'jefe_guardia') return area === 'jefatura'

  // Efectivos no tienen acceso a áreas de gestión
  return false
}

/**
 * Módulos disponibles en el sistema
 */
export type Module = 'dashboard' | 'guardias' | 'incidencias' | 'esbas' | 'equipo' | 'areas' | 'reportes' | 'perfil' | 'configuracion'

/**
 * Configuración de acceso por módulo según rol
 */
const MODULE_ACCESS: Record<Module, UserRole[]> = {
  dashboard: ['comandante', 'jefe_area', 'jefe_guardia', 'efectivo'], // Todos
  guardias: ['comandante', 'jefe_area', 'jefe_guardia', 'efectivo'], // Todos
  incidencias: ['comandante', 'jefe_area', 'jefe_guardia', 'efectivo'], // Todos
  esbas: ['comandante', 'jefe_area', 'jefe_guardia', 'efectivo'], // Todos
  equipo: ['comandante', 'jefe_area'], // Solo comandante y jefes de área
  areas: ['comandante', 'jefe_area'], // Solo comandante y jefes de área
  reportes: ['comandante', 'jefe_area'], // Solo comandante y jefes de área
  perfil: ['comandante', 'jefe_area', 'jefe_guardia', 'efectivo'], // Todos
  configuracion: ['comandante'] // Solo comandante
}

/**
 * Verifica si un usuario tiene acceso a un módulo específico
 */
export function hasAccessToModule(user: User, module: Module): boolean {
  return MODULE_ACCESS[module].includes(user.role)
}

/**
 * Obtiene los módulos accesibles para un usuario
 */
export function getAccessibleModules(user: User): Module[] {
  return (Object.keys(MODULE_ACCESS) as Module[]).filter(module =>
    hasAccessToModule(user, module)
  )
}

/**
 * Obtiene los permisos de un usuario
 */
export function getUserPermissions(user: User) {
  const basePermissions = {
    // Todos pueden ver el dashboard
    canViewDashboard: hasAccessToModule(user, 'dashboard'),

    // Todos pueden ver guardias (pero efectivos y jefe de guardia pueden reservar)
    canViewGuards: hasAccessToModule(user, 'guardias'),
    canReserveGuard: user.role === 'efectivo' || user.role === 'jefe_guardia',

    // Todos pueden ver incidencias
    canViewIncidents: hasAccessToModule(user, 'incidencias'),
    canCreateIncident: user.role === 'efectivo' || user.role === 'jefe_guardia' || user.role === 'jefe_area',
    canManageIncidents: user.role === 'jefe_area' || user.role === 'comandante',

    // Todos pueden acceder a ESBAS (aprendizaje)
    canAccessEsbas: hasAccessToModule(user, 'esbas'),

    // Solo jefes de área y comandante pueden gestionar áreas (NO jefe de guardia ni efectivo)
    canManageArea: hasAccessToModule(user, 'areas'),

    // Solo comandante puede gestionar todas las áreas
    canManageAllAreas: user.role === 'comandante',

    // Jefe de guardia y comandante pueden gestionar guardias
    canManageGuards: user.role === 'jefe_guardia' || user.role === 'comandante',

    // Solo comandante y jefe de área pueden ver equipo
    canViewTeam: hasAccessToModule(user, 'equipo'),

    // Solo comandante y jefe de área pueden ver reportes
    canViewReports: hasAccessToModule(user, 'reportes'),

    // Solo comandante puede acceder a configuración
    canAccessConfig: hasAccessToModule(user, 'configuracion'),

    // Todos pueden ver perfil
    canViewProfile: hasAccessToModule(user, 'perfil'),

    // Áreas accesibles según rol
    // IMPORTANTE: Solo comandante y jefes de área tienen acceso a gestión de áreas
    // Jefe de guardia y efectivos NO tienen acceso a áreas
    accessibleAreas: user.role === 'comandante'
      ? ['comandancia', 'administracion', 'servicios', 'operaciones', 'sanidad', 'imagen', 'jefatura'] as Area[]
      : user.role === 'jefe_area'
      ? [user.area] as Area[]
      : [] as Area[] // Jefe de guardia y efectivos NO tienen áreas
  }

  return basePermissions
}

/**
 * Obtiene el tipo de guardia que puede reservar un usuario
 */
export function getGuardType(user: User): 'masculina' | 'femenina' | null {
  if (user.role === 'efectivo' || user.role === 'jefe_guardia') {
    return user.gender === 'masculino' ? 'masculina' : 'femenina'
  }
  return null
}
