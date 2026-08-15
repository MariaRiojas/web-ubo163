/**
 * Trámites del ciclo de vida de postulantes/aspirantes en formación.
 *
 * Tabla `{PREFIX}-aspirante-tramites`
 *   PK: tramiteId
 *   GSI profileId-createdAt-index: profileId + createdAt → historial de un efectivo
 *
 * Cubre DOS familias en una sola tabla (discriminadas por `tipo`):
 *   1. Pases de etapa (con RESOLUCIÓN en PDF), que arman la TRAYECTORIA:
 *      ascenso_aspirante · pase_esbas · graduacion · baja · reincorporacion
 *   2. Licencias (con documento y periodo), que se solicitan desde el perfil del
 *      efectivo y el área de Instrucción aprueba/rechaza: tipo 'licencia'.
 *
 * Cada pase actualiza además la `situacion`/`grade` del perfil (ver actions).
 */

export const TRAMITE_TIPOS = [
  'ascenso_aspirante', // postulante → aspirante
  'pase_esbas',        // aspirante → enviado a la Escuela de Bomberos (ESBAS)
  'graduacion',        // egreso oficial (promoción que cuenta para el CGBVP)
  'baja',              // dado de baja (justificada por normativa)
  'reincorporacion',   // regreso de licencia / reversión de baja
  'licencia',          // permiso temporal (periodo + documento)
] as const
export type TramiteTipo = (typeof TRAMITE_TIPOS)[number]

/** Pases que exigen adjuntar la resolución en PDF. */
export const TRAMITES_CON_RESOLUCION: TramiteTipo[] = [
  'ascenso_aspirante', 'pase_esbas', 'graduacion', 'baja',
]

export const TRAMITE_LABELS: Record<TramiteTipo, string> = {
  ascenso_aspirante: 'Ascenso a aspirante',
  pase_esbas:        'Enviado a ESBAS',
  graduacion:        'Graduación',
  baja:              'Dado de baja',
  reincorporacion:   'Reincorporación',
  licencia:          'Licencia',
}

export const LICENCIA_ESTADOS = ['solicitada', 'aprobada', 'rechazada'] as const
export type LicenciaEstado = (typeof LICENCIA_ESTADOS)[number]

export interface AspiranteTramite {
  tramiteId: string        // PK
  profileId: string        // GSI HASH — efectivo al que aplica
  createdAt: string        // GSI RANGE
  updatedAt: string

  tipo: TramiteTipo
  fecha: string            // fecha del acto (o inicio de la licencia)
  detalle?: string         // texto libre / promoción / motivo de baja o licencia
  promocion?: string       // promoción asociada (ascenso, ESBAS, graduación)
  resolucionKey?: string   // S3 key del PDF (resolución para pases; documento para licencia)
  normativa?: string       // artículo/norma que justifica (sobre todo la baja)

  // Solo licencias:
  hasta?: string           // fin del periodo de licencia
  licenciaEstado?: LicenciaEstado
  resueltaPor?: string     // profileId de quien aprueba/rechaza
  resueltaAt?: string

  registradoPor?: string   // profileId del instructor que registró el trámite
  registradoPorNombre?: string
}
