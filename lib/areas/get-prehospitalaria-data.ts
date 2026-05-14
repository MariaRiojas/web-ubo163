import 'server-only'
import { db } from '@/lib/db'
import { inventory, profiles } from '@/lib/db/schema'
import { eq, inArray, isNotNull, or, and, asc } from 'drizzle-orm'

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

export interface MedicalItem {
  id: string
  name: string
  category: string
  subcategory: string | null
  brand: string | null
  model: string | null
  codigoCbp: string | null
  lote: string | null
  quantity: number
  unitMeasure: string | null
  condition: string
  expirationDate: string | null          // ISO date
  nextMaintenanceDate: string | null
  nextCertificationDate: string | null
  ubicacionInterna: string | null
  almacenReferencia: string | null       // 'ambulancia_163', etc.
  expiryStatus: 'ok' | 'soon' | 'expired' | 'none'
  maintenanceStatus: 'ok' | 'due' | 'overdue' | 'none'
}

export interface PrehospitalariaExtraData {
  medicalItems: MedicalItem[]
  stats: {
    total: number
    medicamentos: number
    equipos: number
    insumos: number
    expiredCount: number
    expiringSoonCount: number         // ≤30 días
    maintenanceDueCount: number       // mantenimiento en ≤14 días
    maintenanceOverdueCount: number
    certificationDueCount: number
  }
}

// ═══════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════

export async function getPrehospitalariaExtraData(): Promise<PrehospitalariaExtraData> {
  const MEDICAL_CATEGORIES = ['medico', 'medicamento', 'insumo_medico'] as const

  // Traer ítems médicos: ya sea por categoría o por almacén sanidad
  const rows = await db
    .select()
    .from(inventory)
    .where(
      or(
        inArray(inventory.category, [...MEDICAL_CATEGORIES]),
        eq(inventory.almacenTipo, 'sanidad'),
      ),
    )
    .orderBy(asc(inventory.category), asc(inventory.name))
    .limit(300)

  const now = new Date()
  const in30 = new Date(now)
  in30.setDate(now.getDate() + 30)
  const in14 = new Date(now)
  in14.setDate(now.getDate() + 14)

  function expiryStatus(dateStr: string | null): MedicalItem['expiryStatus'] {
    if (!dateStr) return 'none'
    const d = new Date(dateStr)
    if (d < now) return 'expired'
    if (d <= in30) return 'soon'
    return 'ok'
  }

  function maintenanceStatus(dateStr: string | null): MedicalItem['maintenanceStatus'] {
    if (!dateStr) return 'none'
    const d = new Date(dateStr)
    if (d < now) return 'overdue'
    if (d <= in14) return 'due'
    return 'ok'
  }

  const medicalItems: MedicalItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    subcategory: r.subcategory,
    brand: r.brand,
    model: r.model,
    codigoCbp: r.codigoCbp,
    lote: r.lote,
    quantity: r.quantity ?? 1,
    unitMeasure: r.unitMeasure,
    condition: r.condition,
    expirationDate: r.expirationDate,
    nextMaintenanceDate: r.nextMaintenanceDate,
    nextCertificationDate: r.nextCertificationDate,
    ubicacionInterna: r.ubicacionInterna,
    almacenReferencia: r.almacenReferencia,
    expiryStatus: expiryStatus(r.expirationDate),
    maintenanceStatus: maintenanceStatus(r.nextMaintenanceDate),
  }))

  const stats = {
    total: medicalItems.length,
    medicamentos: medicalItems.filter((i) => i.category === 'medicamento').length,
    equipos: medicalItems.filter((i) => i.category === 'medico').length,
    insumos: medicalItems.filter((i) => i.category === 'insumo_medico').length,
    expiredCount: medicalItems.filter((i) => i.expiryStatus === 'expired').length,
    expiringSoonCount: medicalItems.filter((i) => i.expiryStatus === 'soon').length,
    maintenanceDueCount: medicalItems.filter((i) => i.maintenanceStatus === 'due').length,
    maintenanceOverdueCount: medicalItems.filter((i) => i.maintenanceStatus === 'overdue').length,
    certificationDueCount: medicalItems.filter((i) => {
      if (!i.nextCertificationDate) return false
      return new Date(i.nextCertificationDate) <= in30
    }).length,
  }

  return { medicalItems, stats }
}
