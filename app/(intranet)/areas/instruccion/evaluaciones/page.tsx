import { redirect } from 'next/navigation'

// La cola de evaluaciones ahora vive dentro del workspace unificado de Formación.
export default function EvaluacionesRedirect() {
  redirect('/areas/instruccion/cursos?tab=evaluaciones')
}
