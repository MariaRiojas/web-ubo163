/**
 * Tabla DynamoDB: {PREFIX}-activities
 *   PK: activityId
 *   GSI date-index: date (HASH) + activityId (RANGE)
 *
 * Calendario de actividades de la compañía: visitas al cuartel, capacitaciones
 * a empresas, ceremonias, reuniones y todo evento que requiera la presencia de
 * un representante o de la escolta.
 *
 * Algunas actividades NO se guardan acá porque el sistema ya las conoce y se
 * derivan al vuelo (ver lib/actividades/get-actividades-data.ts): los
 * cumpleaños salen de la fecha de nacimiento de cada perfil, la instrucción
 * semanal del horario en lib/instruccion/horario.ts, y los cursos del LMS.
 */

export const ACTIVITY_TYPES = [
  'visita',                // visita de colegio, institución o vecinos al cuartel
  'capacitacion_externa',  // capacitación dictada a una empresa o institución
  'ceremonia',             // aniversarios, izamientos, desfiles
  'reunion',               // reunión de jefatura, asamblea, consejo
  'simulacro',
  'instruccion',
  'curso',
  'cumpleanos',
  'guardia',
  'otro',
] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  visita: 'Visita al cuartel',
  capacitacion_externa: 'Capacitación externa',
  ceremonia: 'Ceremonia',
  reunion: 'Reunión',
  simulacro: 'Simulacro',
  instruccion: 'Instrucción',
  curso: 'Curso',
  cumpleanos: 'Cumpleaños',
  guardia: 'Guardia',
  otro: 'Otro',
}

export const ACTIVITY_STATUSES = [
  'programada',
  'confirmada',
  'realizada',
  'cancelada',
  'reprogramada',
] as const
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]

export interface Activity {
  activityId: string        // PK
  title: string
  type: ActivityType
  date: string              // YYYY-MM-DD (hora de Lima) — GSI date-index
  endDate?: string          // para actividades de varios días
  startTime?: string        // HH:MM
  endTime?: string          // HH:MM
  allDay?: boolean

  /** Institución, empresa o colegio involucrado (visitas y capacitaciones). */
  entidad?: string
  location?: string
  description?: string

  /** Participación institucional requerida. */
  requiereRepresentante?: boolean
  requiereEscolta?: boolean
  representanteProfileId?: string
  /** Cuántos efectivos de escolta se necesitan. */
  escoltaCantidad?: number
  /** Efectivos ya confirmados para representar o integrar la escolta. */
  participantes?: string[]  // profileIds

  /** Área organizadora (sectionId). */
  sectionId?: string
  status: ActivityStatus
  /** Fijada arriba en el tablero (actividad crítica del mes). */
  isPinned?: boolean

  createdBy: string         // profileId
  createdAt: string
  updatedAt: string
}

export type NewActivity = Omit<Activity, 'createdAt' | 'updatedAt'>

/** Actividad lista para mostrar: la guardada o una derivada de otra fuente. */
export interface ActivityView {
  id: string
  title: string
  type: ActivityType
  date: string
  endDate?: string
  startTime?: string
  endTime?: string
  entidad?: string
  location?: string
  description?: string
  requiereRepresentante?: boolean
  requiereEscolta?: boolean
  escoltaCantidad?: number
  representanteNombre?: string
  sectionId?: string
  status: ActivityStatus
  isPinned?: boolean
  /** false = derivada (cumpleaños, instrucción, curso): no se edita ni se borra. */
  editable: boolean
  /** De dónde salió, para mostrarlo en la tarjeta. */
  origen: 'manual' | 'cumpleanos' | 'instruccion' | 'curso' | 'convocatoria'
}
