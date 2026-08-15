import { redirect } from 'next/navigation'

/** Consolidado en el módulo «Personal» (Comando). La asistencia por efectivo
 *  vive ahora junto al padrón en /bomberos. */
export default function AsistenciasLegacy() {
  redirect('/bomberos')
}
