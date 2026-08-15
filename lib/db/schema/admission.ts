/**
 * Postulaciones de admisión (formulario público del landing).
 *
 * Tabla `{PREFIX}-admission-applications`
 *   PK: applicationId
 *   GSI cohortId-createdAt-index: cohortId + createdAt → listar postulantes de una convocatoria
 *
 * Flujo: el postulante llena el formulario público (sin login) cuando hay una
 * convocatoria (cohorte) activa. El área de Instrucción revisa y gestiona el
 * estado. Los aprobados avanzan a la promoción (cohorte) como aspirantes/postulantes.
 */

export const ADMISSION_STATUSES = [
  'pendiente_revision',        // recién enviada
  'aprobado_siguiente_etapa',  // pasa a la siguiente etapa del proceso
  'observaciones',             // documentos con observaciones (requiere corrección)
  'descartado',                // no continúa
] as const
export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number]

export const ADMISSION_STATUS_LABELS: Record<AdmissionStatus, string> = {
  pendiente_revision:       'Pendiente de revisión',
  aprobado_siguiente_etapa: 'Aprobado — siguiente etapa',
  observaciones:            'Con observaciones',
  descartado:               'Descartado',
}

/**
 * Pipeline real de admisión (basado en el registro histórico de la Compañía):
 * Inscrito → Entrevista personal → Evaluación psicológica → Prueba física → Aprobado.
 * Tras inscribirse, se contacta al postulante por WhatsApp para coordinar la
 * entrevista personal y la evaluación psicológica. El orden de antigüedad
 * (por llegada) puede reordenarse en cada etapa.
 */
export const ADMISSION_ETAPAS = [
  'inscrito',      // recién postuló (por orden de llegada)
  'contactado',    // contactado por WhatsApp para indicaciones
  'entrevista',    // en/tras entrevista personal
  'psicologica',   // en/tras evaluación psicológica
  'fisica',        // en/tras prueba física
  'aprobado',      // pasó todo → puede incorporarse como aspirante
  'descartado',    // no continúa
] as const
export type AdmissionEtapa = (typeof ADMISSION_ETAPAS)[number]

export const ADMISSION_ETAPA_LABELS: Record<AdmissionEtapa, string> = {
  inscrito:    'Inscrito',
  contactado:  'WhatsApp enviado',
  entrevista:  'Entrevista',
  psicologica: 'Ev. psicológica',
  fisica:      'Prueba física',
  aprobado:    'Aprobado',
  descartado:  'Descartado',
}

export type EvalResultado = 'apto' | 'observado' | 'no_apto' | null

export interface EtapaEval {
  resultado: EvalResultado
  observacion?: string
  fecha?: string           // fecha de la evaluación / cita
}

export interface AdmissionApplication {
  applicationId: string    // PK
  cohortId: string         // GSI HASH — convocatoria a la que postula
  cohortName?: string      // denormalizado para la UI
  createdAt: string        // GSI RANGE
  updatedAt: string

  // Datos del postulante (del formulario público)
  fullName: string
  profession: string       // profesión y/o ocupación
  birthDate?: string       // YYYY-MM-DD — fuente de verdad para la edad
  age?: number             // edad calculada al momento de postular (denormalizada; se recalcula desde birthDate)
  dni: string
  distrito: string
  residencia?: string      // dirección / lugar de residencia
  celular: string          // WhatsApp
  correo?: string
  certijovenKey?: string   // S3 key del PDF de CERTIJOVEN

  // Gestión / pipeline (área de Instrucción)
  status: AdmissionStatus  // legacy (compat con la gestión anterior)
  etapa?: AdmissionEtapa    // etapa actual del proceso
  ordenLlegada?: number     // N.° por orden de llegada (antigüedad inicial)
  contactadoWhatsappAt?: string
  entrevista?: EtapaEval
  psicologica?: EtapaEval
  fisica?: EtapaEval & { fechaProgramada?: string }
  observaciones?: string
  reviewedBy?: string
  reviewedAt?: string
}
