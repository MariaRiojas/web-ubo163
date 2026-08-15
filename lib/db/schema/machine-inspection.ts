/**
 * Inspección diaria (checklist) de una máquina del parque motor.
 *
 * La ESTRUCTURA del checklist NO se define a mano: se deriva del inventario, de la
 * ubicación que cada ítem declara (`almacenTipo='maquina'` → `almacenReferencia` = la
 * unidad → `ubicacionInterna` = el gabinete). Esta tabla solo guarda los RESULTADOS.
 *
 * Tabla `{PREFIX}-machine-inspections`
 *   PK: maquinaRef (nombre/ref de la unidad, ej. "B163-1")
 *   SK: date (YYYY-MM-DD, hora de Lima)
 *   → una inspección colaborativa por máquina por día; cada ítem guarda quién lo marcó.
 */

export const INSPECTION_ITEM_STATUSES = ['presente', 'faltante', 'danado', 'no_aplica'] as const
export type InspectionItemStatus = (typeof INSPECTION_ITEM_STATUSES)[number]

export interface InspectionItemResult {
  status: InspectionItemStatus
  observacion?: string
  byProfileId: string
  byName: string
  at: string            // ISO
}

export interface MachineInspection {
  maquinaRef: string                              // PK
  date: string                                    // SK — YYYY-MM-DD (Lima)
  results: Record<string, InspectionItemResult>   // itemId → resultado
  updatedAt: string
  createdAt: string
}
