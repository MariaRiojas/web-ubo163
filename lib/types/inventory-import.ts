export type ValidatedRowData = {
  name: string
  category: string
  subcategory: string | null
  almacenTipo: string
  almacenReferencia: string | null
  brand: string | null
  model: string | null
  numeroSerie: string | null
  codigoCbp: string | null
  quantity: number
  unitMeasure: string
  condition: string
  ubicacionInterna: string | null
  assignedCodigo: string | null
  lote: string | null
  expirationDate: string | null
  requiresCertification: boolean
  lastCertificationDate: string | null
  nextCertificationDate: string | null
  usefulLifeMonths: number | null
  referenceValue: string | null
  notes: string | null
}

export type ValidatedRow = {
  rowIndex: number
  status: 'ok' | 'warning' | 'error'
  errors: string[]
  warnings: string[]
  data: ValidatedRowData
}

export type ValidateResponse = {
  rows: ValidatedRow[]
  total: number
}
