import { redirect } from 'next/navigation'

// La gestión de admisión (pipeline de selección + convocatorias) se unificó
// dentro del workspace «Aspirantes y Postulantes», segmento «En admisión».
export default function AdmisionRedirect() {
  redirect('/areas/instruccion/aspirantes-y-postulantes')
}
