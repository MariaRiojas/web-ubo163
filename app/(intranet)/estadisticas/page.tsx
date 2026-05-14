import { redirect } from 'next/navigation'

/**
 * Ruta legacy con drift respecto al schema v2 de emergencies.
 * Las estadísticas completas se migrarán en una entrega futura; por ahora
 * redirigimos al módulo de Reportes que usa el schema actualizado.
 */
export default function EstadisticasLegacy() {
  redirect('/reportes')
}
