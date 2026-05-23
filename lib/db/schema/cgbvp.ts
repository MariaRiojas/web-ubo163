/**
 * Integración CGBVP — asistencia mensual y estado de compañía.
 *
 * Tablas DynamoDB:
 *   {PREFIX}-cgbvp-attendance  PK: profileId, SK: date (YYYY-MM)
 *   {PREFIX}-cgbvp-status      PK: profileId, SK: date (historial)
 */

export interface CgbvpAttendance {
  profileId: string     // PK
  date: string          // SK — formato "YYYY-MM" (mes)
  mes: number
  anio: number
  diasAsistidos: number
  diasGuardia: number
  horasAcumuladas: number
  numEmergencias: number
  updatedAt: string     // ISO 8601
}

export interface CgbvpStatusHistory {
  profileId: string     // PK
  date: string          // SK — ISO 8601
  estadoAnterior?: string
  estadoNuevo: string
  fuente: 'scraper' | 'manual'
  createdAt: string
}

export interface CgbvpCompanyStatus {
  statusId: string
  primerJefe?: string
  segundoJefe?: string
  estadoGeneral?: string
  pilotosDisponibles?: number
  paramedicosDisponibles?: number
  personalDisponible?: number
  observaciones?: string
  informante?: string
  fechaHora?: string
  vehiculos?: CgbvpVehicleSnapshot[]
  personal?: CgbvpShiftPersonnel[]
  createdAt: string
}

export interface CgbvpVehicleSnapshot {
  codigoVehiculo: string
  estado?: string
  motivo?: string
  tipoVehiculo?: string
}

export interface CgbvpShiftPersonnel {
  profileId?: string
  nombreRaw?: string
  tipo?: string   // BOM | REN
  horaIngreso?: string
  esBombero?: boolean
  esAlMando?: boolean
  esPiloto?: boolean
  esMedico?: boolean
}

export interface CgbvpVehicle {
  codigo: string
  tipo?: string
  estado?: string
  motivo?: string
  updatedAt: string
}
