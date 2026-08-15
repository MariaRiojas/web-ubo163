/**
 * Calcula la edad (años cumplidos) a partir de una fecha de nacimiento `YYYY-MM-DD`.
 * Función pura, sin dependencias — usable en Server y Client Components.
 * Devuelve `null` si la fecha es inválida o está fuera de rango razonable.
 */
export function edadDe(birthDate?: string | null): number | null {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (isNaN(d.getTime())) return null
  const t = new Date()
  let a = t.getFullYear() - d.getFullYear()
  const m = t.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--
  return a >= 0 && a < 120 ? a : null
}
