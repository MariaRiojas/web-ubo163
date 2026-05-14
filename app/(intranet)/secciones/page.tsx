import { redirect } from 'next/navigation'

/**
 * Ruta legacy. Las secciones del RIF ahora se muestran como "Áreas" en
 * `/areas` con vistas dedicadas por sección.
 */
export default function SeccionesLegacy() {
  redirect('/areas')
}
