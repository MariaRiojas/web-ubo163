"use client"

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  BookOpen, GraduationCap, Video, FileText, Link2, ClipboardList, Eye, EyeOff,
  Layers, HelpCircle, X, ChevronRight,
} from 'lucide-react'
import { getCourseModules } from '@/lib/db/schema/training'

const COURSE_CATEGORIES = [
  { value: 'escuela_tecnica', label: 'Escuela Técnica' },
  { value: 'esbas', label: 'ESBAS' },
  { value: 'workshop', label: 'Taller / Workshop' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'norma', label: 'Normativa' },
  { value: 'otro', label: 'Otro' },
]

const LESSON_TYPES = [
  { value: 'texto', label: 'Texto', icon: FileText },
  { value: 'video', label: 'Video (YouTube/Vimeo)', icon: Video },
  { value: 'lectura_archivo', label: 'Archivo (PDF/Doc)', icon: FileText },
  { value: 'practica', label: 'Práctica', icon: ClipboardList },
  { value: 'evaluacion', label: 'Evaluación', icon: GraduationCap },
]

const GRADES = [
  { value: '', label: 'Sin restricción' },
  { value: 'aspirante', label: 'Aspirante+' },
  { value: 'seccionario', label: 'Seccionario+' },
  { value: 'subteniente', label: 'Subteniente+' },
  { value: 'teniente', label: 'Teniente+' },
  { value: 'capitan', label: 'Capitán+' },
]

// Tipos de pregunta disponibles según contexto
const QUESTION_TYPES_MINI = [
  { value: 'multiple_choice', label: 'Opción múltiple' },
  { value: 'fill_blank', label: 'Completar frase' },
]
const QUESTION_TYPES_EVAL = [
  ...QUESTION_TYPES_MINI,
  { value: 'open_text', label: 'Redacción (revisión manual)' },
]

const CAT_LABEL: Record<string, string> = Object.fromEntries(COURSE_CATEGORIES.map(c => [c.value, c.label]))
const TYPE_LABEL: Record<string, string> = Object.fromEntries(LESSON_TYPES.map(t => [t.value, t.label]))

const field: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 13,
  background: 'var(--ink-black)', border: '1px solid var(--ink-line)',
  color: 'var(--bone)', borderRadius: 2, boxSizing: 'border-box',
}

function uid(): string {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isValidVideoUrl(url: string): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    return /(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/.test(u.hostname.toLowerCase())
  } catch {
    return false
  }
}

const emptyLesson = () => ({
  title: '', description: '', contentType: 'texto', content: '', videoUrl: '',
  materialKey: '', durationMinutes: '', required: true, quiz: [] as any[],
})

const emptyCourse = () => ({
  title: '', subtitle: '', description: '', category: 'escuela_tecnica',
  durationHours: '', minGrade: '', availableForAspirantes: true,
  availableForPostulantes: false, mandatoryForAspirantes: false, mandatoryForPostulantes: false,
})

export function InstruccionCursosClient({
  initialCourses,
  canManage,
  embedded = false,
}: {
  initialCourses: any[]
  canManage: boolean
  /** Cuando se usa dentro del workspace de Formación: oculta el encabezado propio. */
  embedded?: boolean
}) {
  const [courses, setCourses] = useState<any[]>(initialCourses)
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState(emptyCourse())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [openModuleId, setOpenModuleId] = useState<string | null>(null)
  // Formulario de módulo: { courseId, moduleId?, title, description } | null
  const [moduleForm, setModuleForm] = useState<any | null>(null)
  // Formulario de lección: incluye moduleId destino. editingLessonId cuando se edita.
  const [lessonForm, setLessonForm] = useState<any | null>(null)
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // ── Course CRUD ────────────────────────────────────────────────

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (view === 'create') {
        const res = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            durationHours: form.durationHours ? Number(form.durationHours) : null,
            minGrade: form.minGrade || undefined,
          }),
        })
        if (!res.ok) { alert('Error al crear el curso'); return }
        const { courseId, slug } = await res.json()
        const newCourse = { courseId, slug, ...form, modules: [], lessons: [], active: true, createdAt: new Date().toISOString() }
        setCourses(prev => [newCourse, ...prev])
      } else if (editing) {
        const res = await fetch(`/api/courses/${editing.courseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            durationHours: form.durationHours ? Number(form.durationHours) : null,
            minGrade: form.minGrade || undefined,
          }),
        })
        if (!res.ok) { alert('Error al guardar'); return }
        setCourses(prev => prev.map(c => c.courseId === editing.courseId ? { ...c, ...form } : c))
      }
      setView('list')
      setEditing(null)
      setForm(emptyCourse())
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCourse(courseId: string, title: string) {
    if (!confirm(`¿Eliminar el curso "${title}"? Se eliminarán todos sus módulos y lecciones.`)) return
    const res = await fetch(`/api/courses/${courseId}`, { method: 'DELETE' })
    if (res.ok) setCourses(prev => prev.filter(c => c.courseId !== courseId))
  }

  async function toggleActive(course: any) {
    await fetch(`/api/courses/${course.courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !course.active }),
    })
    setCourses(prev => prev.map(c => c.courseId === course.courseId ? { ...c, active: !c.active } : c))
  }

  function startEdit(course: any) {
    setEditing(course)
    setForm({
      title: course.title ?? '', subtitle: course.subtitle ?? '',
      description: course.description ?? '', category: course.category ?? 'escuela_tecnica',
      durationHours: course.durationHours ?? '', minGrade: course.minGrade ?? '',
      availableForAspirantes: course.availableForAspirantes ?? true,
      availableForPostulantes: course.availableForPostulantes ?? false,
      mandatoryForAspirantes: course.mandatoryForAspirantes ?? false,
      mandatoryForPostulantes: course.mandatoryForPostulantes ?? false,
    })
    setView('edit')
  }

  // ── Persistencia de módulos ────────────────────────────────────
  // Toda mutación de módulos/lecciones/quizzes reescribe el array completo
  // `modules[]` dentro del item Course en DynamoDB (PUT /api/courses/[id]).
  // Un curso legacy con lecciones planas se migra silenciosamente a modules[]
  // en el primer guardado (getCourseModules envuelve las lecciones legacy).

  async function commitModules(course: any, newModules: any[]): Promise<boolean> {
    setSaving(true)
    try {
      const res = await fetch(`/api/courses/${course.courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: newModules }),
      })
      if (!res.ok) { alert('Error al guardar'); return false }
      setCourses(prev => prev.map(c => c.courseId === course.courseId ? { ...c, modules: newModules } : c))
      return true
    } finally {
      setSaving(false)
    }
  }

  // ── Module CRUD ────────────────────────────────────────────────

  async function handleSaveModule(course: any) {
    if (!moduleForm?.title?.trim()) return
    const modules = getCourseModules(course)
    let newModules: any[]
    if (moduleForm.moduleId) {
      newModules = modules.map(m => m.moduleId === moduleForm.moduleId
        ? { ...m, title: moduleForm.title.trim(), description: moduleForm.description?.trim() || undefined }
        : m)
    } else {
      newModules = [...modules, {
        moduleId: uid(),
        displayOrder: modules.length,
        title: moduleForm.title.trim(),
        description: moduleForm.description?.trim() || undefined,
        lessons: [],
      }]
    }
    if (await commitModules(course, newModules)) setModuleForm(null)
  }

  async function handleDeleteModule(course: any, moduleId: string, title: string) {
    if (!confirm(`¿Eliminar el módulo "${title}" y todas sus lecciones?`)) return
    const modules = getCourseModules(course)
    const newModules = modules
      .filter(m => m.moduleId !== moduleId)
      .map((m, i) => ({ ...m, displayOrder: i }))
    await commitModules(course, newModules)
    if (openModuleId === moduleId) setOpenModuleId(null)
  }

  async function moveModule(course: any, moduleId: string, dir: -1 | 1) {
    const modules = [...getCourseModules(course)]
    const idx = modules.findIndex(m => m.moduleId === moduleId)
    const target = idx + dir
    if (idx < 0 || target < 0 || target >= modules.length) return
    ;[modules[idx], modules[target]] = [modules[target], modules[idx]]
    const reordered = modules.map((m, i) => ({ ...m, displayOrder: i }))
    await commitModules(course, reordered)
  }

  // ── Lesson CRUD (dentro de un módulo) ──────────────────────────

  function buildLesson(f: any, courseId: string): any {
    const isVideo = f.contentType === 'video'
    const hasContent = ['texto', 'practica', 'evaluacion'].includes(f.contentType)
    const quiz = Array.isArray(f.quiz) ? f.quiz.filter((q: any) => q.prompt?.trim()) : []
    return {
      courseId,
      title: f.title.trim(),
      description: f.description?.trim() || undefined,
      contentType: f.contentType,
      content: hasContent ? (f.content || undefined) : undefined,
      videoUrl: isVideo ? (f.videoUrl || undefined) : undefined,
      materialKey: f.contentType === 'lectura_archivo' ? (f.materialKey || undefined) : undefined,
      durationMinutes: f.durationMinutes ? Number(f.durationMinutes) : undefined,
      required: f.required ?? true,
      quiz: quiz.length ? quiz : undefined,
    }
  }

  async function handleSaveLesson(course: any, moduleId: string) {
    if (!lessonForm?.title?.trim() || !lessonForm?.contentType) return
    if (lessonForm.contentType === 'video' && lessonForm.videoUrl && !isValidVideoUrl(lessonForm.videoUrl)) {
      alert('La URL del video debe ser de YouTube o Vimeo.')
      return
    }
    const modules = getCourseModules(course)
    const lessonData = buildLesson(lessonForm, course.courseId)
    const newModules = modules.map(m => {
      if (m.moduleId !== moduleId) return m
      let lessons = [...m.lessons]
      if (editingLessonId) {
        lessons = lessons.map(l => l.lessonId === editingLessonId
          ? { ...l, ...lessonData, lessonId: editingLessonId }
          : l)
      } else {
        lessons = [...lessons, { ...lessonData, lessonId: uid(), displayOrder: lessons.length }]
      }
      return { ...m, lessons }
    })
    if (await commitModules(course, newModules)) {
      setLessonForm(null)
      setLessonModuleId(null)
      setEditingLessonId(null)
    }
  }

  async function handleDeleteLesson(course: any, moduleId: string, lessonId: string, title: string) {
    if (!confirm(`¿Eliminar la lección "${title}"?`)) return
    const modules = getCourseModules(course)
    const newModules = modules.map(m => {
      if (m.moduleId !== moduleId) return m
      const lessons = m.lessons
        .filter(l => l.lessonId !== lessonId)
        .map((l, i) => ({ ...l, displayOrder: i }))
      return { ...m, lessons }
    })
    await commitModules(course, newModules)
  }

  async function moveLesson(course: any, moduleId: string, lessonId: string, dir: -1 | 1) {
    const modules = getCourseModules(course)
    const newModules = modules.map(m => {
      if (m.moduleId !== moduleId) return m
      const lessons = [...m.lessons]
      const idx = lessons.findIndex(l => l.lessonId === lessonId)
      const target = idx + dir
      if (idx < 0 || target < 0 || target >= lessons.length) return m
      ;[lessons[idx], lessons[target]] = [lessons[target], lessons[idx]]
      return { ...m, lessons: lessons.map((l, i) => ({ ...l, displayOrder: i })) }
    })
    await commitModules(course, newModules)
  }

  function resetLessonForm() {
    setLessonForm(null)
    setLessonModuleId(null)
    setEditingLessonId(null)
  }

  // ── Render: formulario de curso ────────────────────────────────

  if (view === 'create' || view === 'edit') {
    return (
      <div>
        <header style={{ marginBottom: 24 }}>
          <button onClick={() => { setView('list'); setEditing(null); setForm(emptyCourse()) }}
            className="btn btn--ghost btn--sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
            Volver a cursos
          </button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: 'var(--bone)' }}>
            {view === 'create' ? 'Nuevo curso' : 'Editar curso'}
          </h1>
        </header>

        <form onSubmit={handleSaveCourse} style={{
          background: 'var(--ink-deep)', border: '1px solid var(--ink-line)',
          borderRadius: 4, padding: 24, maxWidth: 720,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>TÍTULO *</label>
              <input style={field} required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nombre del curso" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>SUBTÍTULO</label>
              <input style={field} value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Ej. Nivel 1 · 40 horas" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>CATEGORÍA *</label>
              <select style={field} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {COURSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>DURACIÓN (horas)</label>
              <input style={field} type="number" min={1} value={form.durationHours} onChange={e => setForm(f => ({ ...f, durationHours: e.target.value }))} placeholder="Ej. 40" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>GRADO MÍNIMO</label>
              <select style={field} value={form.minGrade} onChange={e => setForm(f => ({ ...f, minGrade: e.target.value }))}>
                {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>DESCRIPCIÓN</label>
              <textarea style={{ ...field, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción del curso (opcional)" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { key: 'availableForAspirantes', label: 'Disponible para Aspirantes' },
              { key: 'availableForPostulantes', label: 'Disponible para Postulantes' },
              { key: 'mandatoryForAspirantes', label: 'Obligatorio Aspirantes' },
              { key: 'mandatoryForPostulantes', label: 'Obligatorio Postulantes' },
            ].map(opt => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--bone)' }}>
                <input type="checkbox" checked={(form as any)[opt.key]} onChange={e => setForm(f => ({ ...f, [opt.key]: e.target.checked }))} />
                {opt.label}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} className="btn btn--primary btn--sm">
              {saving ? 'Guardando…' : view === 'create' ? 'Crear curso' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={() => { setView('list'); setEditing(null); setForm(emptyCourse()) }} className="btn btn--ghost btn--sm">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    )
  }

  // ── Render: lista de cursos ────────────────────────────────────

  return (
    <div>
      <header style={{ marginBottom: embedded ? 12 : 24 }}>
        {!embedded && (
          <div style={{ marginBottom: 12 }}>
            <Link href="/areas/instruccion" className="btn btn--ghost btn--sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
              Volver a Instrucción
            </Link>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {embedded ? (
            <p style={{ color: 'var(--steel)', fontSize: 13, margin: 0 }}>
              {courses.length} curso{courses.length !== 1 ? 's' : ''} — escuela técnica, talleres, webinars y más
            </p>
          ) : (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--graphite)', textTransform: 'uppercase', marginBottom: 4 }}>
              INSTRUCCIÓN · CURSOS
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, color: 'var(--bone)', letterSpacing: '-0.015em' }}>
              Gestión de cursos
            </h1>
            <p style={{ color: 'var(--steel)', fontSize: 13, marginTop: 4 }}>
              {courses.length} curso{courses.length !== 1 ? 's' : ''} — escuela técnica, talleres, webinars y más
            </p>
          </div>
          )}
          {canManage && (
            <button onClick={() => setView('create')} className="btn btn--primary btn--sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              Nuevo curso
            </button>
          )}
        </div>
      </header>

      {courses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--steel)', fontSize: 13 }}>
          Aún no hay cursos. {canManage && 'Crea el primero con el botón de arriba.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {courses.map(course => {
            const expanded = expandedId === course.courseId
            const modules = getCourseModules(course)
            const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0)

            return (
              <div key={course.courseId} style={{
                background: 'var(--ink-deep)', border: '1px solid var(--ink-line)',
                borderRadius: 4, overflow: 'hidden',
                opacity: course.active ? 1 : 0.6,
              }}>
                {/* Course header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <BookOpen className="w-4 h-4 flex-shrink-0" strokeWidth={1.6} style={{ color: 'var(--brass)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--brass)', textTransform: 'uppercase' }}>
                        {CAT_LABEL[course.category] ?? course.category}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)' }}>
                        {modules.length} módulo{modules.length !== 1 ? 's' : ''} · {totalLessons} lección{totalLessons !== 1 ? 'es' : ''}{course.durationHours ? ` · ${course.durationHours}h` : ''}
                      </span>
                    </div>
                    <div style={{ color: 'var(--bone)', fontSize: 15, fontWeight: 500 }}>{course.title}</div>
                    {course.subtitle && <div style={{ color: 'var(--steel)', fontSize: 12 }}>{course.subtitle}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {canManage && (
                      <>
                        <button onClick={() => toggleActive(course)} title={course.active ? 'Desactivar' : 'Activar'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: course.active ? 'var(--emerald-glow)' : 'var(--graphite)', borderRadius: 3 }}>
                          {course.active ? <Eye className="w-4 h-4" strokeWidth={1.8} /> : <EyeOff className="w-4 h-4" strokeWidth={1.8} />}
                        </button>
                        <button onClick={() => startEdit(course)} title="Editar curso"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--bone)', borderRadius: 3 }}>
                          <Pencil className="w-4 h-4" strokeWidth={1.8} />
                        </button>
                        <button onClick={() => handleDeleteCourse(course.courseId, course.title)} title="Eliminar curso"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--red-163)', borderRadius: 3 }}>
                          <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                        </button>
                      </>
                    )}
                    <Link href={`/capacitacion/${course.slug}`} target="_blank" title="Ver en plataforma"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--steel)', borderRadius: 3, display: 'flex' }}>
                      <Link2 className="w-4 h-4" strokeWidth={1.8} />
                    </Link>
                    <button onClick={() => {
                      setExpandedId(expanded ? null : course.courseId)
                      setOpenModuleId(null); setModuleForm(null); resetLessonForm()
                    }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--steel)', borderRadius: 3 }}>
                      {expanded ? <ChevronUp className="w-4 h-4" strokeWidth={1.8} /> : <ChevronDown className="w-4 h-4" strokeWidth={1.8} />}
                    </button>
                  </div>
                </div>

                {/* Modules panel */}
                {expanded && (
                  <div style={{ borderTop: '1px solid var(--ink-line)', padding: '12px 16px' }}>
                    {modules.length === 0 && !moduleForm && (
                      <div style={{ color: 'var(--steel)', fontSize: 12, marginBottom: 12 }}>Sin módulos aún.</div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {modules.map((mod, mIdx) => {
                        const modOpen = openModuleId === mod.moduleId
                        const editingThisModule = moduleForm && moduleForm.moduleId === mod.moduleId
                        const lessons = [...mod.lessons].sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                        const showLessonFormHere = lessonModuleId === mod.moduleId && lessonForm

                        return (
                          <div key={mod.moduleId} style={{
                            border: '1px solid var(--ink-line)', borderRadius: 3, background: 'var(--ink-black)', overflow: 'hidden',
                          }}>
                            {/* Module header */}
                            {editingThisModule ? (
                              <ModuleForm
                                form={moduleForm}
                                onChange={setModuleForm}
                                onSave={() => handleSaveModule(course)}
                                onCancel={() => setModuleForm(null)}
                                saving={saving}
                                isEdit
                              />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                                <button onClick={() => { setOpenModuleId(modOpen ? null : mod.moduleId); resetLessonForm() }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--steel)', display: 'flex' }}>
                                  {modOpen ? <ChevronDown className="w-4 h-4" strokeWidth={1.8} /> : <ChevronRight className="w-4 h-4" strokeWidth={1.8} />}
                                </button>
                                <Layers className="w-4 h-4 flex-shrink-0" strokeWidth={1.6} style={{ color: 'var(--brass)' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)' }}>
                                      MÓDULO {mIdx + 1}
                                    </span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)' }}>
                                      {mod.lessons.length} lección{mod.lessons.length !== 1 ? 'es' : ''}
                                    </span>
                                  </div>
                                  <div style={{ color: 'var(--bone)', fontSize: 13, fontWeight: 500 }}>{mod.title}</div>
                                  {mod.description && <div style={{ color: 'var(--steel)', fontSize: 11 }}>{mod.description}</div>}
                                </div>
                                {canManage && (
                                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                                    <button onClick={() => moveModule(course, mod.moduleId, -1)} disabled={mIdx === 0} title="Subir"
                                      style={{ background: 'none', border: 'none', cursor: mIdx === 0 ? 'default' : 'pointer', padding: 4, color: mIdx === 0 ? 'var(--graphite)' : 'var(--steel)', borderRadius: 2, opacity: mIdx === 0 ? 0.4 : 1 }}>
                                      <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.8} />
                                    </button>
                                    <button onClick={() => moveModule(course, mod.moduleId, 1)} disabled={mIdx === modules.length - 1} title="Bajar"
                                      style={{ background: 'none', border: 'none', cursor: mIdx === modules.length - 1 ? 'default' : 'pointer', padding: 4, color: mIdx === modules.length - 1 ? 'var(--graphite)' : 'var(--steel)', borderRadius: 2, opacity: mIdx === modules.length - 1 ? 0.4 : 1 }}>
                                      <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.8} />
                                    </button>
                                    <button onClick={() => { setModuleForm({ courseId: course.courseId, moduleId: mod.moduleId, title: mod.title, description: mod.description ?? '' }); resetLessonForm() }} title="Editar módulo"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--bone)', borderRadius: 2 }}>
                                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                                    </button>
                                    <button onClick={() => handleDeleteModule(course, mod.moduleId, mod.title)} title="Eliminar módulo"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--red-163)', borderRadius: 2 }}>
                                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Lessons inside module */}
                            {modOpen && !editingThisModule && (
                              <div style={{ borderTop: '1px solid var(--ink-line)', padding: '10px 12px 12px' }}>
                                {lessons.length === 0 && !showLessonFormHere && (
                                  <div style={{ color: 'var(--steel)', fontSize: 12, marginBottom: 10 }}>Sin lecciones en este módulo.</div>
                                )}
                                {lessons.map((lesson: any, idx: number) => (
                                  <div key={lesson.lessonId}>
                                    {showLessonFormHere && editingLessonId === lesson.lessonId ? (
                                      <LessonForm
                                        form={lessonForm}
                                        onChange={setLessonForm}
                                        onSave={() => handleSaveLesson(course, mod.moduleId)}
                                        onCancel={resetLessonForm}
                                        saving={saving}
                                        isEdit
                                      />
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: idx < lessons.length - 1 ? '1px solid var(--ink-line-soft)' : 'none' }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', width: 24, textAlign: 'right', flexShrink: 0 }}>
                                          {mIdx + 1}.{idx + 1}
                                        </span>
                                        <LessonTypeIcon type={lesson.contentType} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ color: 'var(--bone)', fontSize: 13 }}>{lesson.title}</div>
                                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)', textTransform: 'uppercase', marginTop: 1 }}>
                                            {TYPE_LABEL[lesson.contentType] ?? lesson.contentType}
                                            {lesson.durationMinutes ? ` · ${lesson.durationMinutes} min` : ''}
                                            {lesson.quiz?.length ? ` · ${lesson.quiz.length} pregunta${lesson.quiz.length !== 1 ? 's' : ''}` : ''}
                                          </div>
                                        </div>
                                        {canManage && (
                                          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                                            <button onClick={() => moveLesson(course, mod.moduleId, lesson.lessonId, -1)} disabled={idx === 0} title="Subir"
                                              style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', padding: 4, color: idx === 0 ? 'var(--graphite)' : 'var(--steel)', borderRadius: 2, opacity: idx === 0 ? 0.4 : 1 }}>
                                              <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.8} />
                                            </button>
                                            <button onClick={() => moveLesson(course, mod.moduleId, lesson.lessonId, 1)} disabled={idx === lessons.length - 1} title="Bajar"
                                              style={{ background: 'none', border: 'none', cursor: idx === lessons.length - 1 ? 'default' : 'pointer', padding: 4, color: idx === lessons.length - 1 ? 'var(--graphite)' : 'var(--steel)', borderRadius: 2, opacity: idx === lessons.length - 1 ? 0.4 : 1 }}>
                                              <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.8} />
                                            </button>
                                            <button onClick={() => { setLessonModuleId(mod.moduleId); setEditingLessonId(lesson.lessonId); setLessonForm(normalizeLessonForm(lesson)) }} title="Editar lección"
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--bone)', borderRadius: 2 }}>
                                              <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                                            </button>
                                            <button onClick={() => handleDeleteLesson(course, mod.moduleId, lesson.lessonId, lesson.title)} title="Eliminar lección"
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--red-163)', borderRadius: 2 }}>
                                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {/* Nueva lección en este módulo */}
                                {showLessonFormHere && !editingLessonId && (
                                  <div style={{ marginTop: 10 }}>
                                    <LessonForm
                                      form={lessonForm}
                                      onChange={setLessonForm}
                                      onSave={() => handleSaveLesson(course, mod.moduleId)}
                                      onCancel={resetLessonForm}
                                      saving={saving}
                                      isEdit={false}
                                    />
                                  </div>
                                )}

                                {canManage && lessonModuleId !== mod.moduleId && (
                                  <button onClick={() => { setLessonModuleId(mod.moduleId); setEditingLessonId(null); setLessonForm(emptyLesson()) }}
                                    className="btn btn--ghost btn--sm" style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                    <Plus className="w-3 h-3" strokeWidth={2} />
                                    Agregar lección
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Formulario nuevo módulo */}
                    {moduleForm && !moduleForm.moduleId && (
                      <div style={{ marginTop: 10 }}>
                        <ModuleForm
                          form={moduleForm}
                          onChange={setModuleForm}
                          onSave={() => handleSaveModule(course)}
                          onCancel={() => setModuleForm(null)}
                          saving={saving}
                          isEdit={false}
                        />
                      </div>
                    )}

                    {canManage && !moduleForm && (
                      <button onClick={() => { setModuleForm({ courseId: course.courseId, title: '', description: '' }); resetLessonForm() }}
                        className="btn btn--ghost btn--sm" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <Plus className="w-3 h-3" strokeWidth={2} />
                        Agregar módulo
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Normaliza una lección persistida al shape del formulario editable
function normalizeLessonForm(lesson: any) {
  return {
    title: lesson.title ?? '',
    description: lesson.description ?? '',
    contentType: lesson.contentType ?? 'texto',
    content: lesson.content ?? '',
    videoUrl: lesson.videoUrl ?? '',
    materialKey: lesson.materialKey ?? '',
    durationMinutes: lesson.durationMinutes ?? '',
    required: lesson.required ?? true,
    quiz: Array.isArray(lesson.quiz) ? lesson.quiz.map((q: any) => ({ ...q })) : [],
  }
}

function LessonTypeIcon({ type }: { type: string }) {
  const style: React.CSSProperties = { width: 14, height: 14, flexShrink: 0, color: 'var(--graphite)' }
  if (type === 'video') return <Video style={style} strokeWidth={1.6} />
  if (type === 'evaluacion') return <GraduationCap style={style} strokeWidth={1.6} />
  if (type === 'practica') return <ClipboardList style={style} strokeWidth={1.6} />
  return <FileText style={style} strokeWidth={1.6} />
}

// ── Formulario de módulo ─────────────────────────────────────────

function ModuleForm({ form, onChange, onSave, onCancel, saving, isEdit }: {
  form: any
  onChange: (v: any) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isEdit: boolean
}) {
  const f: React.CSSProperties = {
    padding: '7px 10px', fontSize: 12,
    background: 'var(--ink-deep)', border: '1px solid var(--ink-line)',
    color: 'var(--bone)', borderRadius: 2, width: '100%', boxSizing: 'border-box',
  }
  return (
    <div style={{ background: 'var(--ink-black)', padding: 12 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--brass)', textTransform: 'uppercase', marginBottom: 10 }}>
        {isEdit ? 'EDITAR MÓDULO' : 'NUEVO MÓDULO'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>TÍTULO DEL MÓDULO *</label>
          <input style={f} required value={form.title} onChange={e => onChange({ ...form, title: e.target.value })} placeholder="Ej. Módulo I · Fundamentos" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>DESCRIPCIÓN</label>
          <input style={f} value={form.description} onChange={e => onChange({ ...form, description: e.target.value })} placeholder="Descripción breve (opcional)" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={onSave} disabled={saving || !form.title?.trim()} className="btn btn--primary btn--sm" style={{ fontSize: 12 }}>
          {saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Agregar módulo'}
        </button>
        <button onClick={onCancel} className="btn btn--ghost btn--sm" style={{ fontSize: 12 }}>Cancelar</button>
      </div>
    </div>
  )
}

// ── Formulario de lección ────────────────────────────────────────

function LessonForm({ form, onChange, onSave, onCancel, saving, isEdit }: {
  form: any
  onChange: (v: any) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isEdit: boolean
}) {
  const f: React.CSSProperties = {
    padding: '7px 10px', fontSize: 12,
    background: 'var(--ink-deep)', border: '1px solid var(--ink-line)',
    color: 'var(--bone)', borderRadius: 2, width: '100%', boxSizing: 'border-box',
  }

  const isEval = form.contentType === 'evaluacion'
  const isVideo = form.contentType === 'video'
  const isTexto = form.contentType === 'texto'
  const isPractica = form.contentType === 'practica'
  const isFile = form.contentType === 'lectura_archivo'
  const supportsMiniQuiz = isTexto || isVideo || isFile

  const videoUrlInvalid = isVideo && !!form.videoUrl && !isValidVideoUrl(form.videoUrl)

  async function handleMaterialUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const tempId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()
    const presignRes = await fetch('/api/storage/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'course-material',
        filename: file.name,
        contentType: file.type,
        resourceId: tempId,
        resourceId2: 'lesson',
        sizeBytes: file.size,
      }),
    })
    if (!presignRes.ok) { alert('Error al preparar subida'); return }
    const { presignedUrl, key } = await presignRes.json()
    await fetch(presignedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    onChange({ ...form, materialKey: key, content: file.name })
  }

  return (
    <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', borderRadius: 3, padding: 14 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--brass)', textTransform: 'uppercase', marginBottom: 12 }}>
        {isEdit ? 'EDITAR LECCIÓN' : 'NUEVA LECCIÓN'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1/-1' }}>
          <label style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>TÍTULO *</label>
          <input style={f} required value={form.title} onChange={e => onChange({ ...form, title: e.target.value })} placeholder="Título de la lección" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>TIPO *</label>
          <select style={f} value={form.contentType} onChange={e => onChange({ ...form, contentType: e.target.value, content: '', videoUrl: '', materialKey: '' })}>
            {LESSON_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>DURACIÓN (min)</label>
          <input style={f} type="number" min={1} value={form.durationMinutes} onChange={e => onChange({ ...form, durationMinutes: e.target.value })} placeholder="Ej. 45" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1/-1' }}>
          <label style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>DESCRIPCIÓN</label>
          <input style={f} value={form.description} onChange={e => onChange({ ...form, description: e.target.value })} placeholder="Descripción breve (opcional)" />
        </div>

        {isVideo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1/-1' }}>
            <label style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>URL DEL VIDEO (YouTube / Vimeo) *</label>
            <input style={{ ...f, borderColor: videoUrlInvalid ? 'var(--red-163)' : 'var(--ink-line)' }} value={form.videoUrl} onChange={e => onChange({ ...form, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
            {videoUrlInvalid && <div style={{ fontSize: 10, color: 'var(--red-163)' }}>La URL debe ser de YouTube o Vimeo.</div>}
          </div>
        )}

        {isTexto && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1/-1' }}>
            <label style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>CONTENIDO HTML</label>
            <textarea style={{ ...f, minHeight: 90, resize: 'vertical', fontFamily: 'var(--font-mono)' }} value={form.content} onChange={e => onChange({ ...form, content: e.target.value })} placeholder="Contenido de la lección (HTML / texto). El editor enriquecido llegará más adelante." />
          </div>
        )}

        {isPractica && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1/-1' }}>
            <label style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>INSTRUCCIONES DE LA PRÁCTICA</label>
            <textarea style={{ ...f, minHeight: 80, resize: 'vertical' }} value={form.content} onChange={e => onChange({ ...form, content: e.target.value })} placeholder="Descripción de la actividad presencial (el instructor la marca como asistida)" />
          </div>
        )}

        {isEval && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1/-1' }}>
            <label style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>INSTRUCCIONES (opcional)</label>
            <textarea style={{ ...f, minHeight: 60, resize: 'vertical' }} value={form.content} onChange={e => onChange({ ...form, content: e.target.value })} placeholder="Indicaciones para el examen (opcional)" />
          </div>
        )}

        {isFile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1/-1' }}>
            <label style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>ARCHIVO (PDF/Doc · máx 20 MB)</label>
            {form.materialKey && <div style={{ fontSize: 11, color: 'var(--emerald-glow)', marginBottom: 4 }}>✓ {form.content || 'Archivo subido'}</div>}
            <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={handleMaterialUpload} style={{ ...f, cursor: 'pointer' }} />
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--bone)', gridColumn: '1/-1' }}>
          <input type="checkbox" checked={form.required} onChange={e => onChange({ ...form, required: e.target.checked })} />
          Lección obligatoria
        </label>
      </div>

      {/* Quiz / banco de preguntas */}
      {(supportsMiniQuiz || isEval) && (
        <QuizBuilder
          questions={form.quiz ?? []}
          onChange={(q) => onChange({ ...form, quiz: q })}
          allowOpenText={isEval}
          maxQuestions={isEval ? null : 3}
          title={isEval ? 'Banco de preguntas' : 'Mini-quiz (1-3 preguntas)'}
          note={isEval ? 'Nota mínima 14/20' : undefined}
        />
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onSave} disabled={saving || !form.title?.trim() || videoUrlInvalid} className="btn btn--primary btn--sm" style={{ fontSize: 12 }}>
          {saving ? 'Guardando…' : isEdit ? 'Guardar' : 'Agregar'}
        </button>
        <button onClick={onCancel} className="btn btn--ghost btn--sm" style={{ fontSize: 12 }}>Cancelar</button>
      </div>
    </div>
  )
}

// ── Constructor de quiz / banco de preguntas ─────────────────────

function QuizBuilder({ questions, onChange, allowOpenText, maxQuestions, title, note }: {
  questions: any[]
  onChange: (q: any[]) => void
  allowOpenText: boolean
  maxQuestions: number | null
  title: string
  note?: string
}) {
  const [open, setOpen] = useState(questions.length > 0)
  const types = allowOpenText ? QUESTION_TYPES_EVAL : QUESTION_TYPES_MINI
  const atCap = maxQuestions != null && questions.length >= maxQuestions

  const f: React.CSSProperties = {
    padding: '6px 9px', fontSize: 12,
    background: 'var(--ink-black)', border: '1px solid var(--ink-line)',
    color: 'var(--bone)', borderRadius: 2, width: '100%', boxSizing: 'border-box',
  }

  function addQuestion() {
    if (atCap) return
    onChange([...questions, {
      questionId: uid(), type: 'multiple_choice', prompt: '',
      options: ['', ''], correctAnswer: '', points: 1,
    }])
    setOpen(true)
  }

  function updateQuestion(i: number, patch: any) {
    onChange(questions.map((q, idx) => idx === i ? { ...q, ...patch } : q))
  }

  function removeQuestion(i: number) {
    onChange(questions.filter((_, idx) => idx !== i))
  }

  function changeType(i: number, type: string) {
    const q = questions[i]
    const patch: any = { type }
    if (type === 'multiple_choice') {
      patch.options = q.options && q.options.length >= 2 ? q.options : ['', '']
    } else {
      patch.options = undefined
    }
    if (type === 'open_text') patch.correctAnswer = undefined
    updateQuestion(i, patch)
  }

  function updateOption(i: number, optIdx: number, value: string) {
    const q = questions[i]
    const options = [...(q.options ?? [])]
    const wasCorrect = q.correctAnswer != null && q.correctAnswer === options[optIdx]
    options[optIdx] = value
    updateQuestion(i, { options, ...(wasCorrect ? { correctAnswer: value } : {}) })
  }

  function addOption(i: number) {
    const q = questions[i]
    const options = [...(q.options ?? [])]
    if (options.length >= 5) return
    options.push('')
    updateQuestion(i, { options })
  }

  function removeOption(i: number, optIdx: number) {
    const q = questions[i]
    const options = [...(q.options ?? [])]
    if (options.length <= 2) return
    const removed = options[optIdx]
    options.splice(optIdx, 1)
    updateQuestion(i, { options, ...(q.correctAnswer === removed ? { correctAnswer: '' } : {}) })
  }

  return (
    <div style={{ marginTop: 12, border: '1px solid var(--ink-line)', borderRadius: 3, background: 'var(--ink-black)' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bone)' }}>
        <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.8} style={{ color: 'var(--brass)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', flex: 1, textAlign: 'left' }}>
          {title} {questions.length > 0 ? `· ${questions.length}` : ''}
        </span>
        {note && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--brass)' }}>{note}</span>}
        {open ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.8} /> : <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.8} />}
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--ink-line)', padding: '10px 12px' }}>
          {questions.length === 0 && (
            <div style={{ color: 'var(--steel)', fontSize: 11, marginBottom: 10 }}>Sin preguntas aún.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questions.map((q, i) => (
              <div key={q.questionId ?? i} style={{ border: '1px solid var(--ink-line)', borderRadius: 2, padding: 10, background: 'var(--ink-deep)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>P{i + 1}</span>
                  <select style={{ ...f, width: 'auto', flex: 1 }} value={q.type} onChange={e => changeType(i, e.target.value)}>
                    {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <label style={{ fontSize: 9, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>PTS</label>
                    <input type="number" min={1} style={{ ...f, width: 52 }} value={q.points ?? 1} onChange={e => updateQuestion(i, { points: Number(e.target.value) || 1 })} />
                  </div>
                  <button type="button" onClick={() => removeQuestion(i)} title="Eliminar pregunta"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'var(--red-163)', display: 'flex' }}>
                    <X className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                </div>

                <textarea style={{ ...f, minHeight: 44, resize: 'vertical', marginBottom: 8 }} value={q.prompt ?? ''} onChange={e => updateQuestion(i, { prompt: e.target.value })} placeholder="Enunciado de la pregunta" />

                {q.type === 'multiple_choice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(q.options ?? []).map((opt: string, optIdx: number) => (
                      <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="radio" name={`correct-${q.questionId ?? i}`} title="Respuesta correcta"
                          checked={opt !== '' && q.correctAnswer === opt}
                          onChange={() => updateQuestion(i, { correctAnswer: opt })} />
                        <input style={{ ...f, flex: 1 }} value={opt} onChange={e => updateOption(i, optIdx, e.target.value)} placeholder={`Opción ${optIdx + 1}`} />
                        <button type="button" onClick={() => removeOption(i, optIdx)} disabled={(q.options?.length ?? 0) <= 2} title="Quitar opción"
                          style={{ background: 'none', border: 'none', cursor: (q.options?.length ?? 0) <= 2 ? 'default' : 'pointer', padding: 3, color: (q.options?.length ?? 0) <= 2 ? 'var(--graphite)' : 'var(--steel)', display: 'flex', opacity: (q.options?.length ?? 0) <= 2 ? 0.4 : 1 }}>
                          <Trash2 className="w-3 h-3" strokeWidth={1.8} />
                        </button>
                      </div>
                    ))}
                    {(q.options?.length ?? 0) < 5 && (
                      <button type="button" onClick={() => addOption(i)} className="btn btn--ghost btn--sm"
                        style={{ fontSize: 11, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Plus className="w-3 h-3" strokeWidth={2} /> Opción
                      </button>
                    )}
                    <div style={{ fontSize: 9, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
                      Marca el círculo de la opción correcta.
                    </div>
                  </div>
                )}

                {q.type === 'fill_blank' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 9, color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}>RESPUESTA CORRECTA</label>
                    <input style={f} value={q.correctAnswer ?? ''} onChange={e => updateQuestion(i, { correctAnswer: e.target.value })} placeholder="Texto exacto esperado" />
                  </div>
                )}

                {q.type === 'open_text' && (
                  <div style={{ fontSize: 10, color: 'var(--steel)', fontStyle: 'italic' }}>
                    Redacción — se califica manualmente en la cola de revisión.
                  </div>
                )}
              </div>
            ))}
          </div>

          {!atCap && (
            <button type="button" onClick={addQuestion} className="btn btn--ghost btn--sm"
              style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Plus className="w-3 h-3" strokeWidth={2} />
              Agregar pregunta
            </button>
          )}
          {atCap && (
            <div style={{ marginTop: 10, fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
              Máximo {maxQuestions} preguntas para este tipo de lección.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
