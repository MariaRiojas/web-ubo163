import 'server-only'
import { ddb, TABLE, ScanCommand } from '@/lib/db/dynamodb'
import type { InventoryItem } from '@/lib/db/schema/inventory'

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
  expirationDate: string | null
  nextMaintenanceDate: string | null
  nextCertificationDate: string | null
  ubicacionInterna: string | null
  almacenReferencia: string | null
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
    expiringSoonCount: number
    maintenanceDueCount: number
    maintenanceOverdueCount: number
    certificationDueCount: number
  }
}

export async function getPrehospitalariaExtraData(): Promise<PrehospitalariaExtraData> {
  const { Items } = await ddb.send(new ScanCommand({
    TableName: TABLE.inventory,
    FilterExpression: 'category IN (:c1, :c2, :c3) OR almacenTipo = :at',
    ExpressionAttributeValues: {
      ':c1': 'medico',
      ':c2': 'medicamento',
      ':c3': 'insumo_medico',
      ':at': 'sanidad',
    },
    Limit: 300,
  }))
  const rows = (Items ?? []) as InventoryItem[]
  rows.sort((a, b) => `${a.category}${a.name}`.localeCompare(`${b.category}${b.name}`))

  const now = new Date()
  const in30 = new Date(now)
  in30.setDate(now.getDate() + 30)
  const in14 = new Date(now)
  in14.setDate(now.getDate() + 14)

  function expiryStatus(dateStr: string | null | undefined): MedicalItem['expiryStatus'] {
    if (!dateStr) return 'none'
    const d = new Date(dateStr)
    if (d < now) return 'expired'
    if (d <= in30) return 'soon'
    return 'ok'
  }

  function maintenanceStatus(dateStr: string | null | undefined): MedicalItem['maintenanceStatus'] {
    if (!dateStr) return 'none'
    const d = new Date(dateStr)
    if (d < now) return 'overdue'
    if (d <= in14) return 'due'
    return 'ok'
  }

  const medicalItems: MedicalItem[] = rows.map(r => ({
    id: r.itemId,
    name: r.name,
    category: r.category,
    subcategory: r.subcategory ?? null,
    brand: r.brand ?? null,
    model: r.model ?? null,
    codigoCbp: r.codigoCbp ?? null,
    lote: r.lote ?? null,
    quantity: r.quantity ?? 1,
    unitMeasure: r.unitMeasure ?? null,
    condition: r.condition,
    expirationDate: r.expirationDate ?? null,
    nextMaintenanceDate: r.nextMaintenanceDate ?? null,
    nextCertificationDate: r.nextCertificationDate ?? null,
    ubicacionInterna: r.ubicacionInterna ?? null,
    almacenReferencia: r.almacenReferencia ?? null,
    expiryStatus: expiryStatus(r.expirationDate),
    maintenanceStatus: maintenanceStatus(r.nextMaintenanceDate),
  }))

  const stats = {
    total: medicalItems.length,
    medicamentos: medicalItems.filter(i => i.category === 'medicamento').length,
    equipos: medicalItems.filter(i => i.category === 'medico').length,
    insumos: medicalItems.filter(i => i.category === 'insumo_medico').length,
    expiredCount: medicalItems.filter(i => i.expiryStatus === 'expired').length,
    expiringSoonCount: medicalItems.filter(i => i.expiryStatus === 'soon').length,
    maintenanceDueCount: medicalItems.filter(i => i.maintenanceStatus === 'due').length,
    maintenanceOverdueCount: medicalItems.filter(i => i.maintenanceStatus === 'overdue').length,
    certificationDueCount: medicalItems.filter(i => {
      if (!i.nextCertificationDate) return false
      return new Date(i.nextCertificationDate) <= in30
    }).length,
  }

  return { medicalItems, stats }
}
