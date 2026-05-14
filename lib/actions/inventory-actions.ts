'use server'

import { db } from '@/lib/db'
import { inventory, sections } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

const AREA_KEY_TO_ALMACEN: Record<string, string> = {
  maquinas:            'maquina',
  servicios_generales: 'servicios',
  instruccion:         'instruccion',
  prehospitalaria:     'sanidad',
  administracion:      'administracion',
  imagen:              'imagen',
}

const AREA_KEY_TO_SLUG: Record<string, string> = {
  maquinas:            'maquinas',
  servicios_generales: 'servicios-generales',
  instruccion:         'instruccion',
  prehospitalaria:     'prehospitalaria',
  administracion:      'administracion',
  imagen:              'imagen',
}

export async function createInventoryItemAction(areaKey: string, formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error('No autorizado')

  const name = (formData.get('name') as string | null)?.trim()
  const category = (formData.get('category') as string | null)?.trim()
  if (!name || !category) throw new Error('Nombre y categoría son obligatorios')

  const [section] = await db
    .select()
    .from(sections)
    .where(eq(sections.key, areaKey))
    .limit(1)

  const qty = parseInt((formData.get('quantity') as string) ?? '1', 10)

  await db.insert(inventory).values({
    name,
    category,
    subcategory:       (formData.get('subcategory') as string) || null,
    brand:             (formData.get('brand') as string) || null,
    model:             (formData.get('model') as string) || null,
    numeroSerie:       (formData.get('numeroSerie') as string) || null,
    codigoCbp:         (formData.get('codigoCbp') as string) || null,
    quantity:          isNaN(qty) || qty < 1 ? 1 : qty,
    unitMeasure:       (formData.get('unitMeasure') as string) || 'unidad',
    condition:         (formData.get('condition') as string) || 'operativo',
    almacenTipo:       AREA_KEY_TO_ALMACEN[areaKey] ?? 'servicios',
    ubicacionInterna:  (formData.get('ubicacionInterna') as string) || null,
    referenceValue:    (formData.get('referenceValue') as string) || null,
    notes:             (formData.get('notes') as string) || null,
    sectionId:         section?.id ?? null,
    createdBy:         (session.user.profileId as string) || null,
  })

  const slug = AREA_KEY_TO_SLUG[areaKey] ?? areaKey.replace('_', '-')
  redirect(`/areas/${slug}/inventario`)
}
