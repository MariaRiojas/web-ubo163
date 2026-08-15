import { redirect } from 'next/navigation'

/** Módulo de reportes mock retirado. La reportería vive en «Emergencias» y «Personal» (Comando). */
export default function ReportesLegacy() {
  redirect('/emergencias')
}
