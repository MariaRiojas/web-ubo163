import { redirect } from 'next/navigation'

/**
 * Ruta legacy de lección individual. Las lecciones ahora viven dentro del
 * detalle del curso en `/capacitacion/esbas`.
 */
export default function EsbasLegacyLesson() {
  redirect('/capacitacion/esbas')
}
