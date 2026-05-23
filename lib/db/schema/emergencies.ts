/**
 * Emergencias CGBVP (SGO Norte + Partes CIA)
 *
 * Tablas DynamoDB:
 *   {PREFIX}-emergencies     PK: emergencyId  + GSI date-index
 *   {PREFIX}-emergency-crew  PK: emergencyId, SK: profileId  + GSI profileId-index
 */

export interface Emergency {
  emergencyId: string          // PK (prefixado: "EMG-" + numeroParte)
  numeroParte: string          // único — viene del scraper
  tipo?: string
  estado?: string              // DESPACHADA, EN CAMINO, EN ESCENA, CONTROLADA
  fechaDespacho?: string       // ISO 8601
  fechaRetorno?: string        // ISO 8601
  date: string                 // YYYY-MM-DD (GSI: date-index)
  tipoEmergenciaDesc?: string
  direccion?: string
  distrito?: string
  alMandoId?: string           // profileId resuelto
  alMandoTexto?: string        // texto original del scraper
  observaciones?: string
  vehiculos?: EmergencyVehicle[]  // denormalizado en el item de emergencia
  createdAt: string
  updatedAt: string
}

export interface EmergencyVehicle {
  codigoVehiculo: string
  nombreVehiculo?: string
  horaSalida?: string          // ISO 8601
  horaRetorno?: string
  kmSalida?: number
  kmRetorno?: number
}

export interface EmergencyCrewMember {
  emergencyId: string          // PK
  profileId: string            // SK + GSI
  vehicleCodigo?: string
  rol?: string                 // piloto, jefe_maquina, bombero
  nombreTexto?: string         // texto original si no se resolvió el profileId
}

export interface HiredDriver {
  hiredDriverId: string        // PK (en tabla aparte si se necesita)
  apellidos: string
  nombres: string
  codigoCgbvp?: string
  dni?: string
  telefono?: string
  activo: boolean
}

export type NewEmergency = Omit<Emergency, 'createdAt' | 'updatedAt'>
export type NewEmergencyCrewMember = EmergencyCrewMember
