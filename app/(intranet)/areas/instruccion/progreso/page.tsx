import { redirect } from 'next/navigation'

// El progreso ahora vive dentro del workspace unificado de Formación.
export default function ProgresoRedirect() {
  redirect('/areas/instruccion/cursos?tab=progreso')
}
