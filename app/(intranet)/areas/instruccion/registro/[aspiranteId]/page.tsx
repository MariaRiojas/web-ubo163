import { Fragment } from 'react'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getAspiranteRegistro } from '@/lib/registro/get-registro-data'
import { PrintToolbar } from '@/components/registro/print-button'
import {
  EVAL_CATEGORIA_LABELS,
  type EvalCategoria,
} from '@/lib/db/schema/aspirante-evaluaciones'
import type { Permission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

function fmt(n: number | null | undefined): string {
  return typeof n === 'number' ? n.toFixed(2) : '—'
}
function fecha(s: string | null | undefined): string {
  return s ? s.split('T')[0] : '—'
}

export default async function InformeAspirantePage({
  params,
}: {
  params: Promise<{ aspiranteId: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes('area.instruction.view') && !perms.includes('area.instruction.manage')) {
    redirect('/areas')
  }

  const { aspiranteId } = await params
  const a = await getAspiranteRegistro(aspiranteId)
  if (!a) notFound()

  const hoy = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })

  const box: React.CSSProperties = { border: '1px solid var(--ink-line)', background: 'var(--ink-deep)', padding: 16, marginBottom: 16 }
  const sectionTitle: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brass)', marginBottom: 10, borderBottom: '1px solid var(--ink-line)', paddingBottom: 6 }
  const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--ink-line)', color: 'var(--steel)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase' }
  const td: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--ink-line)', color: 'var(--bone)', fontSize: 13 }
  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontWeight: 600 }

  const actitud = a.evaluaciones.filter((e) => e.categoria === 'actitud')
  const fisico = a.evaluaciones.filter((e) => e.categoria === 'fisico')

  return (
    <div className="max-w-[820px]" style={{ margin: '0 auto' }}>
      <style>{`@media print { .registro-print-toolbar { display: none !important; } #registro-informe { border: none !important; } }`}</style>
      <PrintToolbar backHref="/areas/instruccion/aspirantes-y-postulantes" />

      <div id="registro-informe" style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', padding: 28 }}>
        {/* Encabezado */}
        <header style={{ borderBottom: '2px solid var(--brass)', paddingBottom: 14, marginBottom: 20 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Cuerpo General de Bomberos Voluntarios del Perú
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Compañía de Bomberos Voluntarios Ancón N.° 163 · Área de Instrucción
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--bone)', fontSize: '1.5rem', marginTop: 10 }}>
            Informe de Evaluación del Aspirante
          </h1>
          <p style={{ color: 'var(--graphite)', fontSize: 11, marginTop: 4 }}>Emitido el {hoy}</p>
        </header>

        {/* Datos */}
        <div style={box}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <Dato label="Nombres completos" value={a.fullName} />
            <Dato label="Grado" value={a.gradeLabel} />
            <Dato label="Promoción" value={a.promocion || '—'} />
            <Dato label="Fecha de ingreso" value={fecha(a.fechaIngreso)} />
          </div>
        </div>

        {/* Resumen de notas */}
        <div style={box}>
          <div style={sectionTitle}>Resumen de calificaciones</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Categoría</th>
                <th style={th}>Promedio</th>
              </tr>
            </thead>
            <tbody>
              {(['academica', 'fisico', 'actitud', 'asistencia'] as EvalCategoria[]).map((cat) => (
                <tr key={cat}>
                  <td style={td}>{EVAL_CATEGORIA_LABELS[cat]}</td>
                  <td style={{ ...td, ...mono }}>{fmt(a[cat])}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...td, fontWeight: 700, color: 'var(--brass)' }}>PROMEDIO GENERAL</td>
                <td style={{ ...td, ...mono, fontSize: 16, color: 'var(--brass)' }}>{fmt(a.general)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Académica — ESBAS: módulos → lecciones */}
        <div style={box}>
          <div style={sectionTitle}>Académica — Escuela Básica (ESBAS)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={th}>Módulo / Lección</th><th style={th}>Nota</th><th style={th}>Fecha</th></tr>
            </thead>
            <tbody>
              {a.academicaModulos.map((mod) => (
                <Fragment key={mod.modulo}>
                  <tr>
                    <td style={{ ...td, fontWeight: 700 }}>Módulo {mod.modulo}</td>
                    <td style={{ ...td, ...mono, color: 'var(--brass)' }}>{fmt(mod.promedio)}</td>
                    <td style={td}></td>
                  </tr>
                  {mod.lecciones.length === 0 ? (
                    <tr key={`${mod.modulo}-empty`}>
                      <td style={{ ...td, paddingLeft: 24, color: 'var(--graphite)', fontSize: 12 }} colSpan={3}>Sin lecciones registradas.</td>
                    </tr>
                  ) : mod.lecciones.map((l) => (
                    <tr key={l.evalId}>
                      <td style={{ ...td, paddingLeft: 24, color: 'var(--steel)' }}>{l.titulo}</td>
                      <td style={{ ...td, ...mono }}>{fmt(l.nota)}</td>
                      <td style={{ ...td, color: 'var(--steel)', fontSize: 12 }}>{fecha(l.fecha)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Físico */}
        <div style={box}>
          <div style={sectionTitle}>Físico — métricas</div>
          {fisico.length === 0 ? (
            <p style={{ color: 'var(--graphite)', fontSize: 12 }}>Sin registros.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><th style={th}>Fecha</th><th style={th}>Nota</th><th style={th}>Métricas</th></tr>
              </thead>
              <tbody>
                {fisico.map((ev) => (
                  <tr key={ev.evalId}>
                    <td style={{ ...td, color: 'var(--steel)', fontSize: 12 }}>{fecha(ev.fecha || ev.createdAt)}</td>
                    <td style={{ ...td, ...mono }}>{fmt(ev.nota)}</td>
                    <td style={{ ...td, fontSize: 12, color: 'var(--steel)' }}>
                      {ev.metricas ? Object.entries(ev.metricas).map(([k, v]) => `${k}: ${v}`).join(' · ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Actitud */}
        <div style={box}>
          <div style={sectionTitle}>Actitud bomberil — comentarios</div>
          {actitud.length === 0 ? (
            <p style={{ color: 'var(--graphite)', fontSize: 12 }}>Sin comentarios.</p>
          ) : (
            actitud.map((ev) => (
              <div key={ev.evalId} style={{ borderBottom: '1px solid var(--ink-line)', padding: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ ...mono, color: 'var(--bone)' }}>Nota: {fmt(ev.nota)}</span>
                  <span style={{ color: 'var(--graphite)', fontSize: 11 }}>{fecha(ev.fecha || ev.createdAt)}</span>
                </div>
                {ev.comentario && <p style={{ color: 'var(--steel)', fontSize: 13, marginTop: 4 }}>{ev.comentario}</p>}
                {ev.evaluadoPorNombre && <p style={{ color: 'var(--graphite)', fontSize: 11, marginTop: 2, fontFamily: 'var(--font-mono)' }}>— {ev.evaluadoPorNombre}</p>}
              </div>
            ))
          )}
        </div>

        {/* Licencias */}
        <div style={box}>
          <div style={sectionTitle}>Licencias registradas</div>
          {a.licencias.length === 0 ? (
            <p style={{ color: 'var(--graphite)', fontSize: 12 }}>Sin licencias registradas.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><th style={th}>Periodo</th><th style={th}>Motivo</th><th style={th}>Estado</th><th style={th}>Documento</th></tr>
              </thead>
              <tbody>
                {a.licencias.map((l) => (
                  <tr key={l.tramiteId}>
                    <td style={{ ...td, ...mono, fontSize: 12 }}>{fecha(l.desde)}{l.hasta ? ` — ${fecha(l.hasta)}` : ''}</td>
                    <td style={{ ...td, color: 'var(--steel)' }}>{l.motivo || '—'}</td>
                    <td style={{ ...td, fontSize: 12, color: 'var(--steel)', textTransform: 'capitalize' }}>{l.estado || '—'}</td>
                    <td style={{ ...td, fontSize: 12, color: l.tieneDocumento ? 'var(--emerald-glow)' : 'var(--graphite)' }}>{l.tieneDocumento ? 'Adjunto en expediente' : 'Sin documento'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Firma */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48, gap: 40 }}>
          <Firma label="Jefe de Instrucción" />
          <Firma label="Instructor evaluador" />
        </div>
      </div>
    </div>
  )
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--steel)' }}>{label}</div>
      <div style={{ color: 'var(--bone)', fontSize: 14, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function Firma({ label }: { label: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ borderTop: '1px solid var(--steel)', paddingTop: 6, marginTop: 30 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--steel)' }}>{label}</span>
      </div>
    </div>
  )
}
