import { redirect } from 'next/navigation'

/**
 * Ruta legacy. El ESBAS ahora es un curso dentro del módulo Capacitación.
 * Los usuarios son redirigidos al detalle del curso ESBAS.
 */
export default function EsbasLegacy() {
  redirect('/capacitacion/esbas')
}
