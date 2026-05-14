'use server'

import { db } from '@/lib/db'
import { inventory, NewInventoryItem } from '@/lib/db/schema/inventory'
import { sections } from '@/lib/db/schema/sections'
import { profiles } from '@/lib/db/schema/profiles'
import { hiredDrivers } from '@/lib/db/schema/emergencies'
import { eq, or, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function importInventoryRowsAction(areaKey: string, rows: any[]) {
  try {
    // 1. Obtener la sección
    const section = await db.query.sections.findFirst({
      where: eq(sections.key, areaKey)
    })
    
    if (!section) {
      throw new Error(`No se encontró la sección para el área: ${areaKey}`)
    }

    // 2. Resolver asignaciones (Profiles y Hired Drivers)
    const codigos = rows
      .map(r => r.data.assignedCodigo)
      .filter(Boolean) as string[]
    
    let profileMap: Record<string, string> = {}
    let driverMap: Record<string, number> = {}

    if (codigos.length > 0) {
      // Buscar en profiles (por codigoCgbvp o DNI)
      const foundProfiles = await db.select({
        id: profiles.id,
        codigoCgbvp: profiles.codigoCgbvp,
        dni: profiles.dni
      })
      .from(profiles)
      .where(
        or(
          inArray(profiles.codigoCgbvp, codigos),
          inArray(profiles.dni, codigos)
        )
      )

      foundProfiles.forEach(p => {
        if (p.codigoCgbvp) profileMap[p.codigoCgbvp] = p.id
        if (p.dni) profileMap[p.dni] = p.id
      })

      // Buscar en hiredDrivers
      const foundDrivers = await db.select({
        id: hiredDrivers.id,
        codigoCgbvp: hiredDrivers.codigoCgbvp,
        dni: hiredDrivers.dni
      })
      .from(hiredDrivers)
      .where(
        or(
          inArray(hiredDrivers.codigoCgbvp, codigos),
          inArray(hiredDrivers.dni, codigos)
        )
      )

      foundDrivers.forEach(d => {
        if (d.codigoCgbvp) driverMap[d.codigoCgbvp] = d.id
        if (d.dni) driverMap[d.dni] = d.id
      })
    }

    // 3. Preparar los datos de inserción
    const toInsert: NewInventoryItem[] = rows.map(r => {
      const d = r.data
      const assignedProfileId = d.assignedCodigo ? profileMap[d.assignedCodigo] : null
      const assignedHiredDriverId = d.assignedCodigo ? driverMap[d.assignedCodigo] : null

      return {
        name: d.name,
        category: d.category,
        subcategory: d.subcategory,
        brand: d.brand,
        model: d.model,
        numeroSerie: d.numeroSerie,
        codigoCbp: d.codigoCbp,
        almacenTipo: d.almacenTipo,
        almacenReferencia: d.almacenReferencia,
        ubicacionInterna: d.ubicacionInterna,
        sectionId: section.id,
        assignedCodigo: d.assignedCodigo,
        assignedProfileId,
        assignedHiredDriverId,
        quantity: d.quantity,
        unitMeasure: d.unitMeasure,
        condition: d.condition,
        lote: d.lote,
        expirationDate: d.expirationDate,
        requiresCertification: d.requiresCertification,
        lastCertificationDate: d.lastCertificationDate,
        nextCertificationDate: d.nextCertificationDate,
        usefulLifeMonths: d.usefulLifeMonths,
        referenceValue: d.referenceValue,
        notes: d.notes,
      }
    })

    // 4. Insertar en chunks para evitar límites
    const chunkSize = 50
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize)
      await db.insert(inventory).values(chunk)
    }

    revalidatePath(`/areas/${areaKey}/inventario`)
    return { success: true, count: toInsert.length }
  } catch (error: any) {
    console.error('Error en importInventoryRowsAction:', error)
    return { success: false, error: error.message }
  }
}
