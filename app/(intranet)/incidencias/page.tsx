import { redirect } from 'next/navigation'

/**
 * Ruta legacy. Las incidencias ahora son una pestaña dentro de `/faena`
 * (módulo Faena y Servicio).
 */
export default function IncidenciasLegacy() {
  redirect('/faena')
}
