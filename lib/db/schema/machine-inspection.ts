/**
 * Checklist de una máquina del parque motor, por TURNO.
 *
 * La ESTRUCTURA del checklist NO se define a mano: se deriva del inventario, de la
 * ubicación que cada ítem declara (`almacenTipo='maquina'` → `almacenReferencia` = la
 * unidad → `ubicacionInterna` = el gabinete). Esta tabla solo guarda los RESULTADOS.
 *
 * Cadencia (docs/ARQUITECTURA_MENU.md §3.2): un checklist completo al ingreso de
 * cada turno de piloto — 07:00, 15:00 y 23:00 — para todas las máquinas. Por eso
 * la inspección se identifica por unidad + turno, no por día: si fuera por día,
 * quien marcara a las 08:00 dejaría los turnos de tarde y noche sin nada que hacer.
 *
 * Tabla `{PREFIX}-machine-inspections`
 *   PK: maquinaRef  (nombre institucional de la unidad, ej. "MAQUINA 163 - 1")
 *   SK: date        (guarda el PERIODO `YYYY-MM-DD#turno`; la fecha es la de
 *                    INICIO del turno, porque el nocturno cruza medianoche)
 *   → una inspección colaborativa por máquina y turno; cada ítem guarda quién lo marcó.
 *
 * La SK conserva el nombre `date` por compatibilidad con la tabla ya creada;
 * los atributos `fecha` y `turno` guardan las partes por separado para poder
 * filtrar por día sin parsear la clave.
 */
import type { TurnoKey } from '@/lib/turnos'

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
  date: string                                    // SK — periodo `${fecha}#${turno}`
  /** Fecha de inicio del turno (YYYY-MM-DD, hora de Lima). */
  fecha: string
  turno: TurnoKey
  results: Record<string, InspectionItemResult>   // itemId → resultado
  updatedAt: string
  createdAt: string
}
