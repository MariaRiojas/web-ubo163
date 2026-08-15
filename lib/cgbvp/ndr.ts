/**
 * Requisitos NDR de Ascensos (CGBVP) — mínimos TRIMESTRALES por grado.
 * Fuente única compartida por /horas y el módulo Personal (Comando).
 */
export interface NdrRequisito {
  horasTrimestrales: number
  guardiasTrimestrales: number
  label: string
}

export const NDR_REQUISITOS: Record<string, NdrRequisito> = {
  aspirante:          { horasTrimestrales: 150, guardiasTrimestrales: 9, label: 'Aspirante → Seccionario' },
  seccionario:        { horasTrimestrales: 120, guardiasTrimestrales: 6, label: 'Seccionario → Subteniente' },
  subteniente:        { horasTrimestrales: 100, guardiasTrimestrales: 4, label: 'Subteniente → Teniente' },
  teniente:           { horasTrimestrales: 80,  guardiasTrimestrales: 3, label: 'Teniente → Capitán' },
  capitan:            { horasTrimestrales: 60,  guardiasTrimestrales: 2, label: 'Capitán → Ten. Brigadier' },
  teniente_brigadier: { horasTrimestrales: 60,  guardiasTrimestrales: 2, label: 'Ten. Brigadier → Brigadier' },
  brigadier:          { horasTrimestrales: 40,  guardiasTrimestrales: 1, label: 'Brigadier → Brig. Mayor' },
  brigadier_mayor:    { horasTrimestrales: 40,  guardiasTrimestrales: 1, label: 'Brig. Mayor → Brig. General' },
}

export type NdrEstado = 'cumple' | 'excedente' | 'falta' | 'na'

export interface NdrResultado {
  estado: NdrEstado
  requeridas: number       // horas requeridas en el trimestre
  acumuladas: number       // horas acumuladas
  deltaHoras: number       // + excedente / − faltante
  cumpleGuardias: boolean
}

/**
 * Evalúa el cumplimiento trimestral de un efectivo.
 * - `cumple`: alcanzó exactamente el mínimo (± margen).
 * - `excedente`: superó el mínimo.
 * - `falta`: por debajo del mínimo.
 * - `na`: grado sin requisito (p. ej. postulante).
 */
export function computeNdrEstado(grade: string, horasTrim: number, guardiasTrim: number): NdrResultado {
  const req = NDR_REQUISITOS[grade]
  if (!req) {
    return { estado: 'na', requeridas: 0, acumuladas: horasTrim, deltaHoras: 0, cumpleGuardias: true }
  }
  const delta = horasTrim - req.horasTrimestrales
  const estado: NdrEstado = delta > 0 ? 'excedente' : delta === 0 ? 'cumple' : 'falta'
  return {
    estado,
    requeridas: req.horasTrimestrales,
    acumuladas: horasTrim,
    deltaHoras: delta,
    cumpleGuardias: guardiasTrim >= req.guardiasTrimestrales,
  }
}

const MESES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** Meses (1-12) del trimestre al que pertenece un mes dado, y su etiqueta. */
export function trimestreDe(mes: number): { meses: number[]; label: string; numero: number } {
  const qStart = Math.floor((mes - 1) / 3) * 3 + 1
  const meses = [qStart, qStart + 1, qStart + 2]
  const numero = Math.floor((mes - 1) / 3) + 1
  return { meses, numero, label: `${MESES_ABBR[qStart - 1]}–${MESES_ABBR[qStart + 1]}` }
}
