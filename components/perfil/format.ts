const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function formatShortDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return `${d.getDate().toString().padStart(2, '0')}·${MESES_CORTOS[d.getMonth()]}·${d.getFullYear()}`
}

export function formatLongDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return `${d.getDate()} de ${MESES_LARGOS[d.getMonth()]} de ${d.getFullYear()}`
}

export function formatMonthYear(mes: number, anio: number): string {
  const capital = MESES_LARGOS[mes - 1].charAt(0).toUpperCase() + MESES_LARGOS[mes - 1].slice(1)
  return `${capital} ${anio}`
}

export function calcAge(birthDate: string | Date | null | undefined): number | null {
  if (!birthDate) return null
  const bd = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
  const today = new Date()
  let age = today.getFullYear() - bd.getFullYear()
  const m = today.getMonth() - bd.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) {
    age--
  }
  return age
}

export const GENDER_LABEL: Record<string, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
}
