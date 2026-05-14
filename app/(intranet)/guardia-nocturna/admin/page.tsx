import { redirect } from 'next/navigation'

/**
 * Ruta legacy. La configuración del dormitorio ahora está dentro de la misma
 * página `/guardia-nocturna` bajo la vista "Jefe de Guardia" (visible solo si
 * el efectivo tiene permisos `guard.manage_*` o `guard.config_beds_*`).
 */
export default function GuardiaAdminLegacy() {
  redirect('/guardia-nocturna')
}
