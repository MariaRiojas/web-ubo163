import { eq } from 'drizzle-orm'
import { db } from '../index'
import { sections, sectionRoles } from '../schema'

/** Todas las secciones ordenadas por display_order */
export async function getAllSections() {
  return db.query.sections.findMany({
    orderBy: sections.displayOrder,
  })
}

/** Sección por key (ej: 'maquinas') con personal asignado */
export async function getSectionWithPersonnel(key: string) {
  return db.query.sections.findFirst({
    where: eq(sections.key, key),
    with: {
      sectionRoles: {
        where: eq(sectionRoles.isActive, true),
        with: { profile: true },
      },
    },
  })
}
