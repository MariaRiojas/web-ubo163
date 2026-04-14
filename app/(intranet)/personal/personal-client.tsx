"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, UserPlus, Filter } from "lucide-react"

const GRADE_LABELS: Record<string, string> = {
  aspirante: 'Aspirante', seccionario: 'Seccionario', subteniente: 'Subteniente',
  teniente: 'Teniente', capitan: 'Capitán', teniente_brigadier: 'Ten. Brigadier',
  brigadier: 'Brigadier', brigadier_mayor: 'Brig. Mayor', brigadier_general: 'Brig. General',
}

const GRADE_ORDER: Record<string, number> = {
  brigadier_general: 8, brigadier_mayor: 7, brigadier: 6, teniente_brigadier: 5,
  capitan: 4, teniente: 3, subteniente: 2, seccionario: 1, aspirante: 0,
}

const STATUS_COLORS: Record<string, string> = {
  activo: 'bg-green-500/10 text-green-700 border-green-500/20',
  aspirante_en_curso: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  reserva: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  licencia: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  retirado: 'bg-muted text-muted-foreground',
}

const STATUS_LABELS: Record<string, string> = {
  activo: 'Activo', aspirante_en_curso: 'En ESBAS',
  reserva: 'Reserva', licencia: 'Licencia', retirado: 'Retirado',
}

interface Profile {
  id: string
  fullName: string
  grade: string
  status: string
  gender: string
  section: string
  role: string
  specialties: string[]
  joinDate: string
}

export function PersonalClient({ profiles, canEdit }: { profiles: Profile[]; canEdit: boolean }) {
  const [search, setSearch] = useState('')
  const [filterSection, setFilterSection] = useState('all')
  const [filterGrade, setFilterGrade] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const sections = useMemo(() => {
    const s = new Set(profiles.map(p => p.section).filter(s => s !== '—'))
    return ['all', ...s]
  }, [profiles])

  const filtered = useMemo(() => {
    return profiles
      .filter(p => {
        if (search && !p.fullName.toLowerCase().includes(search.toLowerCase())) return false
        if (filterSection !== 'all' && p.section !== filterSection) return false
        if (filterGrade !== 'all' && p.grade !== filterGrade) return false
        if (filterStatus !== 'all' && p.status !== filterStatus) return false
        return true
      })
      .sort((a, b) => (GRADE_ORDER[b.grade] ?? 0) - (GRADE_ORDER[a.grade] ?? 0))
  }, [profiles, search, filterSection, filterGrade, filterStatus])

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterSection} onValueChange={setFilterSection}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sección" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las secciones</SelectItem>
            {sections.filter(s => s !== 'all').map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterGrade} onValueChange={setFilterGrade}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Grado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los grados</SelectItem>
            {Object.entries(GRADE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canEdit && (
          <Button className="bg-primary hover:bg-primary/90 text-white ml-auto">
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo efectivo
          </Button>
        )}
      </div>

      {/* Contador */}
      <p className="text-sm text-muted-foreground">
        Mostrando <span className="font-medium text-foreground">{filtered.length}</span> de {profiles.length} efectivos
      </p>

      {/* Tabla */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Efectivo</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Grado</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Sección</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden xl:table-cell">Especialidades</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Estado</th>
                {canEdit && <th className="text-right p-3 font-medium text-muted-foreground">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(profile => {
                const initials = profile.fullName.split(' ').slice(0, 2).map(n => n[0]).join('')
                const yearsService = new Date().getFullYear() - new Date(profile.joinDate).getFullYear()
                return (
                  <tr key={profile.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile.fullName}</p>
                          <p className="text-xs text-muted-foreground md:hidden">
                            {GRADE_LABELS[profile.grade]} · {profile.section}
                          </p>
                          <p className="text-xs text-muted-foreground hidden md:block">
                            {yearsService} año{yearsService !== 1 ? 's' : ''} de servicio
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <span className="font-medium">{GRADE_LABELS[profile.grade]}</span>
                    </td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">
                      {profile.section}
                    </td>
                    <td className="p-3 hidden xl:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {profile.specialties.slice(0, 2).map(s => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                        {profile.specialties.length > 2 && (
                          <Badge variant="outline" className="text-xs">+{profile.specialties.length - 2}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[profile.status]}`}>
                        {STATUS_LABELS[profile.status]}
                      </Badge>
                    </td>
                    {canEdit && (
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm">Ver</Button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No se encontraron efectivos con los filtros aplicados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
