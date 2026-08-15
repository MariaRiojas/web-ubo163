'use client'

import { useState } from 'react'
import { BookOpen, BarChart3, ClipboardCheck } from 'lucide-react'
import { InstruccionCursosClient } from './instruccion-cursos-client'
import { ProgresoClient } from './progreso-client'
import { InstruccionEvaluacionesClient } from './instruccion-evaluaciones-client'
import type { ProgresoData } from '@/lib/areas/get-progreso-data'
import type { EvaluacionesData } from '@/lib/areas/get-evaluaciones-data'

export type FormacionTab = 'cursos' | 'progreso' | 'evaluaciones'

const TABS: { key: FormacionTab; label: string; icon: typeof BookOpen }[] = [
  { key: 'cursos', label: 'Cursos', icon: BookOpen },
  { key: 'progreso', label: 'Progreso de efectivos', icon: BarChart3 },
  { key: 'evaluaciones', label: 'Evaluaciones', icon: ClipboardCheck },
]

export function FormacionWorkspace({
  initialTab,
  courses,
  progreso,
  evaluaciones,
  canManageCursos,
  canManageProgreso,
  canGrade,
}: {
  initialTab: FormacionTab
  courses: any[]
  progreso: ProgresoData
  evaluaciones: EvaluacionesData
  canManageCursos: boolean
  canManageProgreso: boolean
  canGrade: boolean
}) {
  const [tab, setTab] = useState<FormacionTab>(initialTab)

  const counts: Record<FormacionTab, number> = {
    cursos: courses.length,
    progreso: progreso.entries.length,
    evaluaciones: evaluaciones.pending.length,
  }

  return (
    <div>
      <header className="area-hero" style={{ marginBottom: 18 }}>
        <div className="area-hero-seal"><BookOpen className="w-6 h-6" strokeWidth={1.6} /></div>
        <div className="area-hero-body">
          <div className="area-hero-ref">ÁREA DE INSTRUCCIÓN · CAPACITACIÓN</div>
          <h1 className="area-hero-title">Formación y Cursos</h1>
          <p className="area-hero-desc">Gestiona los cursos, sigue el progreso de cada efectivo y califica las evaluaciones pendientes desde una sola vista.</p>
        </div>
      </header>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--ink-line)', marginBottom: 20 }}>
        {TABS.map(t => {
          const active = tab === t.key
          const count = counts[t.key]
          const urgent = t.key === 'evaluaciones' && count > 0
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              style={{
                position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12.5, letterSpacing: '0.02em',
                color: active ? 'var(--bone)' : 'var(--steel)',
                borderBottom: active ? '2px solid var(--red-163)' : '2px solid transparent', marginBottom: -1,
              }}>
              <t.icon className="w-4 h-4" strokeWidth={1.8} />
              {t.label}
              {count > 0 && (
                <span style={{
                  fontSize: 10, minWidth: 18, textAlign: 'center', borderRadius: 9, padding: '1px 6px',
                  background: urgent ? 'var(--red-163)' : active ? 'color-mix(in srgb, var(--brass) 22%, transparent)' : 'var(--ink-surface)',
                  color: urgent ? 'var(--bone)' : active ? 'var(--brass)' : 'var(--graphite)',
                  fontFamily: 'var(--font-mono)',
                }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Panel activo */}
      {tab === 'cursos' && <InstruccionCursosClient initialCourses={courses} canManage={canManageCursos} embedded />}
      {tab === 'progreso' && <ProgresoClient data={progreso} canManage={canManageProgreso} />}
      {tab === 'evaluaciones' && <InstruccionEvaluacionesClient data={evaluaciones} canGrade={canGrade} />}
    </div>
  )
}
