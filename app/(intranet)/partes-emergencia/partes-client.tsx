'use client'

import { useState, useMemo, Fragment } from 'react'
import { Flame, Search, ChevronDown, ChevronRight, Clock, Users, Truck } from 'lucide-react'

type Parte = {
  id: number
  numeroParte: string
  tipo: string | null
  estado: string | null
  fechaDespacho: Date | null
  fechaRetorno: Date | null
  direccion: string | null
  distrito: string | null
  alMandoTexto: string | null
  observaciones: string | null
  tipoEmergencia: { id: number; descripcion: string } | null
  alMando: { id: string; apellidos: string | null; nombres: string | null } | null
  vehiculos: { id: number; codigoVehiculo: string; nombreVehiculo: string | null; horaSalida: Date | null; horaRetorno: Date | null }[]
  dotacion: { id: number; nombreTexto: string | null; rol: string | null }[]
}

interface Props {
  partes: Parte[]
  tiposOptions: string[]
  distritosOptions: string[]
}

function fmt(d: Date | null) {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtTime(d: Date | null) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function diffMin(a: Date | null, b: Date | null) {
  if (!a || !b) return null
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)
}

export function PartesClient({ partes, tiposOptions, distritosOptions }: Props) {
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [distritoFilter, setDistritoFilter] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const filtered = useMemo(() => {
    return partes.filter((p) => {
      if (search) {
        const q = search.toLowerCase()
        const hay =
          p.numeroParte?.toLowerCase().includes(q) ||
          p.direccion?.toLowerCase().includes(q) ||
          p.alMandoTexto?.toLowerCase().includes(q) ||
          p.alMando?.apellidos?.toLowerCase().includes(q) ||
          p.alMando?.nombres?.toLowerCase().includes(q)
        if (!hay) return false
      }
      if (tipoFilter && p.tipo !== tipoFilter) return false
      if (estadoFilter && p.estado !== estadoFilter) return false
      if (distritoFilter && p.distrito !== distritoFilter) return false
      if (categoriaFilter && p.tipoEmergencia?.descripcion !== categoriaFilter) return false
      if (fechaDesde && p.fechaDespacho) {
        const [d, m, y] = fechaDesde.split('/')
        if (d && m && y && y.length === 4) {
          const from = new Date(+y, +m - 1, +d)
          if (new Date(p.fechaDespacho) < from) return false
        }
      }
      if (fechaHasta && p.fechaDespacho) {
        const [d, m, y] = fechaHasta.split('/')
        if (d && m && y && y.length === 4) {
          const to = new Date(+y, +m - 1, +d, 23, 59, 59)
          if (new Date(p.fechaDespacho) > to) return false
        }
      }
      return true
    })
  }, [partes, search, tipoFilter, estadoFilter, distritoFilter, categoriaFilter, fechaDesde, fechaHasta])

  const estados = [...new Set(partes.map((p) => p.estado).filter(Boolean))] as string[]

  const selectCls = 'h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 bg-red-500/10 rounded-lg">
          <Flame className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Partes de Emergencia</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} partes registrados</p>
        </div>
      </div>

      {/* Filters row 1 */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="N.° parte, dirección, bombero..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)} className={selectCls}>
          <option value="">Todos los tipos</option>
          {['EMERGENCIA', 'COMISION'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} className={selectCls}>
          <option value="">Todos los estados</option>
          {estados.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* Filters row 2 */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={distritoFilter} onChange={(e) => setDistritoFilter(e.target.value)} className={selectCls}>
          <option value="">Todos los distritos</option>
          {distritosOptions.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={categoriaFilter} onChange={(e) => setCategoriaFilter(e.target.value)} className={selectCls}>
          <option value="">Todas las categorías</option>
          {tiposOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          placeholder="dd/mm/aaaa"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="h-9 w-[120px] rounded-md border border-input bg-background px-3 text-sm text-center"
        />
        <span className="text-muted-foreground text-sm">a</span>
        <input
          placeholder="dd/mm/aaaa"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          className="h-9 w-[120px] rounded-md border border-input bg-background px-3 text-sm text-center"
        />
        <button
          onClick={() => {}}
          className="h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Buscar
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-3 w-8" />
              <th className="p-3 font-medium">N.° PARTE</th>
              <th className="p-3 font-medium">TIPO / ESTADO</th>
              <th className="p-3 font-medium">DESCRIPCIÓN</th>
              <th className="p-3 font-medium">FECHA</th>
              <th className="p-3 font-medium">T. RESP.</th>
              <th className="p-3 font-medium">DURACIÓN</th>
              <th className="p-3 font-medium">AL MANDO</th>
              <th className="p-3 font-medium">UNIDADES</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const isOpen = expanded.has(p.id)
              const firstVehicleSalida = p.vehiculos[0]?.horaSalida
              const tResp = diffMin(p.fechaDespacho, firstVehicleSalida)
              const duracion = diffMin(p.fechaDespacho, p.fechaRetorno)
              const comandante = p.alMando
                ? `${p.alMando.apellidos ?? ''} ${p.alMando.nombres ?? ''}`.trim()
                : p.alMandoTexto ?? '—'

              return (
                <Fragment key={p.id}>
                  <tr className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => toggle(p.id)}>
                    <td className="p-3">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="p-3 font-mono font-medium">{p.numeroParte}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${p.tipo === 'EMERGENCIA' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {p.tipo ?? '—'}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${p.estado === 'CERRADO' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {p.estado ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 max-w-[250px]">
                      <div className="font-medium">{p.tipoEmergencia?.descripcion ?? '—'}</div>
                      <div className="text-muted-foreground text-xs truncate">{p.direccion ?? ''}</div>
                      {p.distrito && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {p.distrito}
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div>{fmt(p.fechaDespacho)}</div>
                      <div className="text-muted-foreground text-xs">{fmtTime(p.fechaDespacho)}</div>
                    </td>
                    <td className="p-3">
                      {tResp != null ? (
                        <div>
                          <span className="font-bold text-red-600 dark:text-red-400">{tResp} min</span>
                          <div className="text-muted-foreground text-xs">despacho→llegada</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="p-3">
                      {duracion != null ? (
                        <div>
                          <span className="font-bold text-green-600 dark:text-green-400">{duracion} min</span>
                          <div className="text-muted-foreground text-xs">duración total</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-xs">{comandante}</div>
                      <div className="text-muted-foreground text-xs">{p.dotacion.length} efectivos</div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {p.vehiculos.map((v) => (
                          <span key={v.id} className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-medium">
                            {v.nombreVehiculo ?? v.codigoVehiculo}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {isOpen && (
                    <tr className="border-b bg-muted/20">
                      <td colSpan={9} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          {/* TIMELINE */}
                          <div>
                            <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">Timeline</h4>
                            <div className="space-y-3">
                              {[
                                { label: 'Despacho', date: p.fechaDespacho, color: 'bg-yellow-400' },
                                { label: 'Salida', date: p.vehiculos[0]?.horaSalida, color: 'bg-blue-400' },
                                { label: 'Llegada', date: p.vehiculos[0]?.horaSalida, color: 'bg-red-400' },
                                { label: 'Retorno', date: p.fechaRetorno, color: 'bg-gray-400' },
                              ].map((step) => (
                                <div key={step.label} className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${step.color} shrink-0`} />
                                  <div>
                                    <div className="text-xs font-medium">{step.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {step.date ? `${fmt(step.date)} ${fmtTime(step.date)}` : '—'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* TIEMPOS */}
                          <div>
                            <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">Tiempos</h4>
                            <div className="space-y-3">
                              <div className="rounded-lg border p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-4 w-4 text-red-500" />
                                  <span className="text-xs text-muted-foreground">T. Respuesta</span>
                                </div>
                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                  {tResp != null ? `${tResp} min` : '—'}
                                </div>
                                <div className="text-xs text-muted-foreground">Despacho → Llegada</div>
                              </div>
                              <div className="rounded-lg border p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-4 w-4 text-green-500" />
                                  <span className="text-xs text-muted-foreground">Duración Total</span>
                                </div>
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                  {duracion != null ? `${duracion} min` : '—'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* PERSONAL */}
                          <div>
                            <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">Personal</h4>
                            <div className="rounded-lg border p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Users className="h-4 w-4 text-blue-500" />
                                <span className="text-xs text-muted-foreground">Efectivos</span>
                              </div>
                              <div className="text-2xl font-bold">{p.dotacion.length}</div>
                            </div>
                          </div>

                          {/* UNIDADES Y UBICACIÓN */}
                          <div>
                            <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-3">Unidades y Ubicación</h4>
                            <div className="space-y-2">
                              {p.distrito && <div className="font-bold text-sm">{p.distrito}</div>}
                              {p.direccion && <div className="text-xs text-muted-foreground">{p.direccion}</div>}
                              <div className="mt-2">
                                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                  <Truck className="h-3 w-3" /> Unidades despachadas
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {p.vehiculos.map((v) => (
                                    <span key={v.id} className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-medium">
                                      {v.nombreVehiculo ?? v.codigoVehiculo}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                  No se encontraron partes de emergencia
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

