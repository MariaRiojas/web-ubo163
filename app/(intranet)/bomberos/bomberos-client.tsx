'use client'

import { useState, useMemo } from 'react'
import { Users, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Bombero = {
  id: string
  fullName: string
  grade: string
  gradeLabel: string
  codigoCgbvp: string | null
  dni: string | null
  status: string
  avatarUrl: string | null
  enTurno: boolean
  horas: number
  diasAsistidos: number
  guardias: number
  emergencias: number
  alMando: number
}

interface Props {
  bomberos: Bombero[]
  mes: number
  anio: number
  totalActivos: number
  totalEnTurno: number
  totalHoras: number
  totalEmergencias: number
  gradesOptions: string[]
  gradeLabels: Record<string, string>
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function BomberosClient({
  bomberos, mes, anio, totalActivos, totalEnTurno, totalHoras, totalEmergencias,
  gradesOptions, gradeLabels,
}: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [mesFilter, setMesFilter] = useState(`${anio}-${String(mes).padStart(2, '0')}`)
  const [gradeFilter, setGradeFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [sortCol, setSortCol] = useState<'horas' | 'emergencias' | 'alMando'>('horas')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const monthLabel = MESES[mes - 1]

  const maxHoras = useMemo(() => Math.max(...bomberos.map(b => b.horas), 1), [bomberos])

  const filtered = useMemo(() => {
    let list = bomberos
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.fullName.toLowerCase().includes(q) ||
        b.codigoCgbvp?.toLowerCase().includes(q) ||
        b.dni?.includes(q)
      )
    }
    if (gradeFilter) list = list.filter(b => b.grade === gradeFilter)
    if (estadoFilter === 'en_turno') list = list.filter(b => b.enTurno)
    if (estadoFilter === 'no_turno') list = list.filter(b => !b.enTurno)

    list = [...list].sort((a, b) => {
      const diff = (a[sortCol] ?? 0) - (b[sortCol] ?? 0)
      return sortDir === 'desc' ? -diff : diff
    })
    return list
  }, [bomberos, search, gradeFilter, estadoFilter, sortCol, sortDir])

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const handleMonthChange = (val: string) => {
    setMesFilter(val)
    router.push(`/bomberos?mes=${val}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Users className="h-7 w-7 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Bomberos</h1>
        </div>
        <p className="text-gray-500 ml-10">Actividad y asistencia — {monthLabel} {anio}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'BOMBEROS ACTIVOS', value: totalActivos, sub: 'en la compañía' },
          { label: 'EN TURNO AHORA', value: totalEnTurno, sub: 'estado actual' },
          { label: 'HORAS ACUMULADAS', value: totalHoras, sub: `${monthLabel} ${anio}` },
          { label: 'EMERGENCIAS ATENDIDAS', value: totalEmergencias, sub: 'participaciones totales' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border p-5">
            <p className="text-xs font-semibold text-gray-400 tracking-wide">{kpi.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{kpi.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3">
        <input
          type="month"
          value={mesFilter}
          onChange={e => handleMonthChange(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            placeholder="Apellidos, nombres, código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todos los grados</option>
          {gradesOptions.map(g => (
            <option key={g} value={g}>{gradeLabels[g] ?? g}</option>
          ))}
        </select>
        <select
          value={estadoFilter}
          onChange={e => setEstadoFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="en_turno">En turno</option>
          <option value="no_turno">Fuera de turno</option>
        </select>
        <button
          onClick={() => { setSearch(''); setGradeFilter(''); setEstadoFilter('') }}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Buscar
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <th className="px-4 py-3 w-10">#</th>
              <th className="px-4 py-3">Efectivo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('horas')}>
                Horas {sortCol === 'horas' && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
              <th className="px-4 py-3">Días asist.</th>
              <th className="px-4 py-3">Guardias</th>
              <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('emergencias')}>
                Emergencias {sortCol === 'emergencias' && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
              <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('alMando')}>
                Al mando {sortCol === 'alMando' && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((b, i) => (
              <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400 font-mono">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {initials(b.fullName)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 leading-tight">{b.fullName}</p>
                      <p className="text-xs text-gray-400">{b.gradeLabel} · {b.codigoCgbvp ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {b.enTurno ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> En turno
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all"
                        style={{ width: `${Math.min((b.horas / maxHoras) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-8 text-right">{b.horas}h</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">{b.diasAsistidos}</td>
                <td className="px-4 py-3 text-center">{b.guardias}</td>
                <td className="px-4 py-3 text-center">{b.emergencias}</td>
                <td className="px-4 py-3 text-center">
                  {b.alMando > 0 ? (
                    <span className="text-red-600 font-bold">{b.alMando}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/bomberos/${b.id}`}
                    className="text-red-600 hover:text-red-700 text-xs font-medium whitespace-nowrap"
                  >
                    Ver perfil →
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  No se encontraron bomberos con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
