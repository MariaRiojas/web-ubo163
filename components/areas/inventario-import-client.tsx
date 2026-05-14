'use client'

import { useState, useRef } from 'react'
import { Upload, X, CheckCircle, AlertTriangle, AlertCircle, FileSpreadsheet, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { importInventoryRowsAction } from '@/lib/actions/inventory-bulk-actions'

interface ValidatedRow {
  rowNumber: number
  status: 'valid' | 'warning' | 'error'
  data: any
  issues: { field: string; message: string; severity: 'warning' | 'error' }[]
}

interface Props {
  areaKey: string
  onClose: () => void
  onSuccess: () => void
}

export function InventarioImportClient({ areaKey, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [validating, setValidating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ValidatedRow[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'warning' | 'error'>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    
    if (!selected.name.endsWith('.xlsx')) {
      toast.error('Por favor sube un archivo Excel (.xlsx)')
      return
    }

    setFile(selected)
    await validateFile(selected)
  }

  const validateFile = async (selected: File) => {
    setValidating(true)
    setResults([])
    
    const formData = new FormData()
    formData.append('file', selected)

    try {
      const res = await fetch('/api/inventory/validate', {
        method: 'POST',
        body: formData,
      })
      
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setResults(data.rows)
      toast.success(`Validación completada: ${data.rows.length} filas encontradas`)
    } catch (error: any) {
      toast.error('Error validando archivo: ' + error.message)
      setFile(null)
    } finally {
      setValidating(false)
    }
  }

  const handleImport = async () => {
    const validRows = results.filter(r => r.status !== 'error')
    if (validRows.length === 0) {
      toast.error('No hay filas válidas para importar')
      return
    }

    setImporting(true)
    try {
      const res = await importInventoryRowsAction(areaKey, validRows)
      if (res.success) {
        toast.success(`Se importaron ${res.count} ítems correctamente`)
        onSuccess()
      } else {
        throw new Error(res.error)
      }
    } catch (error: any) {
      toast.error('Error al importar: ' + error.message)
    } finally {
      setImporting(false)
    }
  }

  const filtered = results.filter(r => {
    if (activeTab === 'all') return true
    return r.status === activeTab
  })

  const stats = {
    total: results.length,
    valid: results.filter(r => r.status === 'valid').length,
    warning: results.filter(r => r.status === 'warning').length,
    error: results.filter(r => r.status === 'error').length,
  }

  return (
    <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--red-deep)', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--bone)', textTransform: 'uppercase' }}>
            Carga Masiva de Inventario
          </h3>
          <p style={{ fontSize: 11, color: 'var(--graphite)', marginTop: 4 }}>
            Sube tu archivo Excel para validar e importar ítems.
          </p>
        </div>
        <button onClick={onClose} style={{ color: 'var(--graphite)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {!file && (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--ink-line)',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx" style={{ display: 'none' }} />
          <Upload className="w-8 h-8 mx-auto mb-4" style={{ color: 'var(--graphite)' }} />
          <p style={{ color: 'var(--bone)', fontSize: 13, fontWeight: 500 }}>
            Click para seleccionar archivo Excel
          </p>
          <p style={{ color: 'var(--graphite)', fontSize: 11, marginTop: 4 }}>
            Asegúrate de usar la plantilla oficial (.xlsx)
          </p>
        </div>
      )}

      {validating && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: 'var(--red-163)' }} />
          <p style={{ color: 'var(--bone)', fontSize: 13 }}>Validando datos...</p>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Stats & Tabs */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Todos', count: stats.total, color: 'var(--bone)' },
              { id: 'valid', label: 'Válidos', count: stats.valid, color: 'var(--emerald-glow)' },
              { id: 'warning', label: 'Advertencias', count: stats.warning, color: 'var(--flame)' },
              { id: 'error', label: 'Errores', count: stats.error, color: 'var(--red-glow)' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '6px 12px',
                  background: activeTab === tab.id ? 'var(--ink-surface)' : 'transparent',
                  border: `1px solid ${activeTab === tab.id ? 'var(--ink-line)' : 'transparent'}`,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: activeTab === tab.id ? tab.color : 'var(--graphite)' }}>
                  {tab.label}
                </span>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--graphite)' }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Table Preview */}
          <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--ink-line)', background: 'var(--ink-deep)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--ink-deep)', boxShadow: '0 1px 0 var(--ink-line)' }}>
                <tr>
                  <th style={thStyle}>Fila</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Categoría</th>
                  <th style={thStyle}>Detalles / Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.rowNumber} style={{ borderBottom: '1px solid var(--ink-line-soft)' }}>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{row.rowNumber}</td>
                    <td style={tdStyle}>
                      {row.status === 'valid' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                      {row.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      {row.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--bone)' }}>{row.data.name}</td>
                    <td style={tdStyle}>{row.data.category}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {row.issues.map((issue: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', color: issue.severity === 'error' ? 'var(--red-glow)' : 'var(--flame)' }}>
                            <span style={{ fontWeight: 700, fontSize: 9 }}>{issue.field.toUpperCase()}:</span>
                            <span>{issue.message}</span>
                          </div>
                        ))}
                        {row.issues.length === 0 && <span style={{ color: 'var(--graphite)' }}>Sin observaciones</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <button
              onClick={() => { setFile(null); setResults([]); }}
              style={{ fontSize: 12, color: 'var(--graphite)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Cambiar archivo
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                disabled={importing}
                onClick={handleImport}
                style={{
                  height: 36,
                  padding: '0 20px',
                  background: stats.error > 0 ? 'var(--ink-surface)' : 'var(--red-163)',
                  color: stats.error > 0 ? 'var(--graphite)' : '#fff',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: stats.error > 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: importing ? 0.7 : 1,
                }}
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Importar {stats.valid + stats.warning} válidos
              </button>
            </div>
          </div>
          {stats.error > 0 && (
            <p style={{ fontSize: 11, color: 'var(--red-glow)', textAlign: 'right', marginTop: -8 }}>
              Corregir los errores en el archivo para poder importar.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  letterSpacing: '0.1em',
  color: 'var(--graphite)',
  textTransform: 'uppercase',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'top',
}
