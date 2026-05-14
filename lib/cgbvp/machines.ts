/**
 * Catálogo de máquinas (vehículos) de la compañía.
 *
 * Cada máquina tiene un inventario propio — los ítems que viven a bordo
 * del vehículo se registran con `almacen_tipo='maquina'` y
 * `almacen_referencia=<slug>`.
 *
 * Convención:
 *   - **slug**: snake_case, sin espacios, URL-safe. Persistido en BD y URLs.
 *   - **label**: formato legible para usuario final. Aparece en UI y Excel.
 *
 * Para agregar una máquina nueva, agregarla a MACHINES y eso es todo —
 * los helpers y dropdowns se actualizan automáticamente.
 */

export interface Machine {
  /** Identificador en backend (snake_case). NO cambiar — rompería datos existentes. */
  slug: string
  /** Nombre legible para el usuario (aparece en UI, Excel dropdowns). */
  label: string
  /** Descripción breve para tooltips. */
  description: string
  /** Categoría operativa. */
  kind: 'autobomba' | 'ambulancia' | 'rescate' | 'auxiliar' | 'cisterna'
  /** Sección CGBVP responsable del vehículo (key de sections). */
  ownerSectionKey: 'maquinas' | 'prehospitalaria'
}

export const MACHINES: Machine[] = [
  {
    slug: 'maquina_163_1',
    label: 'MAQUINA 163-1',
    description: 'Autobomba principal',
    kind: 'autobomba',
    ownerSectionKey: 'maquinas',
  },
  {
    slug: 'ambulancia_163',
    label: 'AMBULANCIA 163',
    description: 'Ambulancia de atención prehospitalaria',
    kind: 'ambulancia',
    ownerSectionKey: 'prehospitalaria',
  },
  {
    slug: 'rescate_163',
    label: 'RESCATE 163',
    description: 'Unidad de rescate',
    kind: 'rescate',
    ownerSectionKey: 'maquinas',
  },
  {
    slug: 'auxiliar_163',
    label: 'AUXILIAR 163',
    description: 'Unidad auxiliar',
    kind: 'auxiliar',
    ownerSectionKey: 'maquinas',
  },
]

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

const BY_SLUG = new Map(MACHINES.map((m) => [m.slug, m]))
const BY_LABEL = new Map(MACHINES.map((m) => [m.label, m]))
const BY_LABEL_NORMALIZED = new Map(
  MACHINES.map((m) => [normalizeLabel(m.label), m])
)

export function getAllMachines(): Machine[] {
  return [...MACHINES]
}

export function getMachineBySlug(slug: string): Machine | undefined {
  return BY_SLUG.get(slug)
}

export function getMachineByLabel(label: string): Machine | undefined {
  return BY_LABEL.get(label) ?? BY_LABEL_NORMALIZED.get(normalizeLabel(label))
}

/** Convierte slug → label para mostrar en UI. Si el slug no existe, devuelve el slug tal cual. */
export function formatMachineLabel(slug: string | null | undefined): string {
  if (!slug) return ''
  return getMachineBySlug(slug)?.label ?? slug
}

/** Convierte label (tal como llega del Excel) → slug. Null si el label no matchea ninguna máquina. */
export function parseMachineLabel(label: string | null | undefined): string | null {
  if (!label) return null
  return getMachineByLabel(label)?.slug ?? null
}

/** Máquinas filtradas por sección responsable (útil para permisos de jefe de sección). */
export function getMachinesBySection(sectionKey: string): Machine[] {
  return MACHINES.filter((m) => m.ownerSectionKey === sectionKey)
}

/** Normaliza un label para comparación case-insensitive y tolerante a guiones/espacios. */
function normalizeLabel(s: string): string {
  return s
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[–—-]/g, '-')
}
