/**
 * Máquinas, compartimientos y checklists.
 *
 * Tablas DynamoDB:
 *   {PREFIX}-machines              PK: machineId
 *   {PREFIX}-machine-compartments  PK: machineId, SK: compartmentId
 *   {PREFIX}-machine-checklists    PK: machineId, SK: checklistId
 *                                  + GSI profileId-date-index
 */

export const MACHINE_KINDS = [
  'autobomba', 'ambulancia', 'rescate', 'auxiliar', 'cisterna', 'otra',
] as const
export type MachineKind = (typeof MACHINE_KINDS)[number]

export const MACHINE_STATUSES = [
  'operativa', 'mantenimiento', 'fuera_servicio', 'baja',
] as const
export type MachineStatus = (typeof MACHINE_STATUSES)[number]

export const COMPARTMENT_TYPES = [
  'cabina', 'cajon', 'vitrina', 'cama_mangueras', 'exterior', 'otro',
] as const
export type CompartmentType = (typeof COMPARTMENT_TYPES)[number]

export const CHECKLIST_FREQUENCIES = [
  'turno_manana', 'turno_tarde', 'turno_noche', 'post_emergencia', 'manual',
] as const
export type ChecklistFrequency = (typeof CHECKLIST_FREQUENCIES)[number]

export const CHECKLIST_EXECUTION_STATUSES = [
  'en_curso', 'completado', 'diferido', 'vencido',
] as const
export type ChecklistExecutionStatus = (typeof CHECKLIST_EXECUTION_STATUSES)[number]

export const CHECKLIST_ITEM_RESULT_STATUSES = [
  'presente', 'faltante', 'danado', 'no_aplica',
] as const
export type ChecklistItemResultStatus = (typeof CHECKLIST_ITEM_RESULT_STATUSES)[number]

export interface Machine {
  machineId: string        // PK
  slug: string
  label: string
  codigoCgbvp?: string
  kind: MachineKind
  status: MachineStatus
  brand?: string
  model?: string
  year?: number
  plate?: string
  chassisNumber?: string
  currentMileage?: number
  soatExpiresAt?: string
  revisionExpiresAt?: string
  nextMaintenanceAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface MachineCompartment {
  machineId: string        // PK
  compartmentId: string    // SK
  name: string
  type: CompartmentType
  qrCode: string
  displayOrder: number
  referencePhotoKey?: string
  notes?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ChecklistDefinition {
  checklistDefId: string
  compartmentId: string
  machineId: string
  name: string
  description?: string
  frequency: ChecklistFrequency
  active: boolean
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface ChecklistExecution {
  machineId: string           // PK
  checklistId: string         // SK (checklistExecId)
  definitionId: string
  profileId: string           // GSI: profileId-date-index
  date: string                // GSI: profileId-date-index (YYYY-MM-DD)
  triggeredByEmergencyId?: string
  status: ChecklistExecutionStatus
  startedAt: string
  completedAt?: string
  postponedUntil?: string
  postponedReason?: string
  notes?: string
  results?: ChecklistItemResult[]  // denormalizado
  createdAt: string
}

export interface ChecklistItemResult {
  inventoryId: string
  status: ChecklistItemResultStatus
  foundQuantity?: number
  photoKey?: string
  notes?: string
}

export type NewMachine = Omit<Machine, 'createdAt' | 'updatedAt'>
export type NewMachineCompartment = Omit<MachineCompartment, 'createdAt' | 'updatedAt'>
export type NewChecklistExecution = Omit<ChecklistExecution, 'createdAt'>
