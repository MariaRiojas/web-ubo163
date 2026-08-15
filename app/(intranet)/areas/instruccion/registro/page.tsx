import { redirect } from 'next/navigation'

// El registro de evaluaciones se unificó dentro del workspace «Aspirantes y
// Postulantes»: cada ficha genera su informe en /registro/[aspiranteId].
export default function RegistroRedirect() {
  redirect('/areas/instruccion/aspirantes-y-postulantes')
}
