import { redirect } from 'next/navigation'

/** El registro de partes ahora es una pestaña del módulo «Emergencias» (Comando). */
export default function PartesEmergenciaLegacy() {
  redirect('/emergencias')
}
