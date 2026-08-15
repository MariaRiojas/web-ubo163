import { redirect } from 'next/navigation'

/**
 * Ruta legacy duplicada con datos mock; el calendario real de imagen
 * institucional vive en /areas/imagen/calendario.
 */
export default function ContenidoLegacy() {
  redirect('/areas/imagen/calendario')
}
