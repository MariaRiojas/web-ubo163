/**
 * Tipos de secciones del CGBVP según RIF Arts. 112-117.
 *
 * Una compañía puede tener múltiples secciones; cada efectivo
 * pertenece a al menos una. El RIF define los cargos válidos
 * dentro de cada tipo de sección.
 */

export const SECTION_TYPES = [
  "operativa",
  "instruccion",
  "imagen_institucional",
  "bienestar",
  "logistica",
  "tecnologia",
  "administracion",
] as const

export type SectionType = (typeof SECTION_TYPES)[number]

export const SECTION_TYPE_LABEL: Record<SectionType, string> = {
  operativa:              "Operativa",
  instruccion:            "Instrucción y Capacitación",
  imagen_institucional:   "Imagen Institucional",
  bienestar:              "Bienestar Social",
  logistica:              "Logística y Mantenimiento",
  tecnologia:             "Tecnología e Información",
  administracion:         "Administración",
}

/**
 * Cargos válidos dentro de una sección.
 * Cada efectivo puede tener uno de estos roles en cada sección
 * a la que pertenece.
 */
export const SECTION_ROLES = [
  "jefe_seccion",
  "sub_jefe_seccion",
  "vocal",
  "miembro",
] as const

export type SectionRole = (typeof SECTION_ROLES)[number]

export const SECTION_ROLE_LABEL: Record<SectionRole, string> = {
  jefe_seccion:     "Jefe de Sección",
  sub_jefe_seccion: "Sub-Jefe de Sección",
  vocal:            "Vocal",
  miembro:          "Miembro",
}

/**
 * Cargos de mando de la compañía (Art. 114 RIF).
 * Distintos de los roles de sección.
 */
export const COMMAND_ROLES = [
  "primer_jefe",
  "segundo_jefe",
  "jefe_guardia",
  "secretario",
  "tesorero",
  "abanderado",
] as const

export type CommandRole = (typeof COMMAND_ROLES)[number]

export const COMMAND_ROLE_LABEL: Record<CommandRole, string> = {
  primer_jefe:  "Primer Jefe",
  segundo_jefe: "Segundo Jefe",
  jefe_guardia: "Jefe de Guardia",
  secretario:   "Secretario",
  tesorero:     "Tesorero",
  abanderado:   "Abanderado",
}
