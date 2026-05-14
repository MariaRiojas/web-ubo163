// Re-exporta todos los schemas para que drizzle-kit los encuentre
// y para imports limpios en el resto del proyecto

// Autenticación y perfiles
export * from './users'
export * from './profiles'

// Secciones y cargos
export * from './sections'
export * from './section-roles'

// Guardia (v2: dormitorios + camarotes + camas)
export * from './guard-nocturna'
// v1 legacy — mantener hasta migrar queries
export * from './guard-shifts'

// Servicio y operativo
export * from './service-hours'
export * from './incidents'
export * from './requests'
export * from './inventory'

// Máquinas, compartimientos y checklists
export * from './machines'

// Capacitación (LMS)
export * from './training'
export * from './esbas' // legacy — se migra dentro de training

// Anuncios y contenido
export * from './announcements'
export * from './content-calendar'

// Integración CGBVP
export * from './emergencies'
export * from './cgbvp'
export * from './cgbvp-sync'
export * from './internal-requests'

// Sistema de Comando de Incidentes (SCI)
export * from './ics'
