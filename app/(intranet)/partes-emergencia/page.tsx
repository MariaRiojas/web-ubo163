import { redirect } from 'next/navigation'

/**
 * Ruta legacy con drift respecto al schema v2 de emergencies.
 * La vista detallada de partes de emergencia se reconstruirá en una entrega
 * futura; por ahora redirigimos al módulo de Reportes.
 */
export default function PartesEmergenciaLegacy() {
  redirect('/reportes')
}
