import { redirect } from 'next/navigation'

/**
 * Ruta legacy. El módulo pasó a llamarse "Anuncios" con flujo de aprobación
 * completo. Los usuarios son redirigidos a `/anuncios`.
 */
export default function ComunicadosLegacy() {
  redirect('/anuncios')
}
