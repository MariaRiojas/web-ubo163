import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Construction, AlertTriangle, FileText, Send } from 'lucide-react'
import { AREAS_META, type AreaKey } from '@/lib/areas/get-areas-hub'
import { getAreaBaseData } from '@/lib/areas/get-area-base-data'
import { BandejaIncidenciasStandalone, BandejaSolicitudesStandalone } from '@/components/areas/bandeja-standalone'
import { BandejaRequerimientosStandalone } from '@/components/areas/bandeja-requerimientos'

export const dynamic = 'force-dynamic'

const SUBPAGE_LABELS: Record<string, string> = {
  vehiculos:              'Vehículos y Documentación',
  gabinetes:             'Gabinetes y QRs',
  mantenimientos:        'Programa de Mantenimiento',
  combustible:           'Control de Combustible',
  insumos:               'Stock de Insumos',
  epp:                   'EPP en Reserva',
  instalaciones:         'Instalaciones del Cuartel',
  cursos:                'Catálogo de Cursos',
  lecciones:             'Editor de Lecciones',
  biblioteca:            'Biblioteca Digital',
  progreso:              'Progreso del Personal',
  certificados:          'Certificados',
  postulantes:           'Gestión de Postulantes',
  aspirantes:            'Gestión de Aspirantes',
  webinars:              'Webinars y Talleres',
  medicamentos:          'Medicamentos y Control de Lotes',
  'insumos-medicos':     'Insumos Médicos',
  ambulancia:            'Inventario AMBULANCIA 163',
  checklists:            'Checklists de la Sección',
  legajos:               'Legajos del Personal',
  documentos:            'Archivo Documental',
  licencias:             'Control de Licencias',
  ascensos:              'Procesos de Ascenso',
  'reportes-normativa':  'Reportes Normativos',
  calendario:            'Calendario de Publicaciones',
  galeria:               'Galería Fotográfica',
  comunicados:           'Comunicados Institucionales',
  ceremonias:            'Gestión de Ceremonias',
  'bandeja-incidencias': 'Bandeja de Incidencias',
  'bandeja-solicitudes': 'Bandeja de Solicitudes',
  requerimientos:        'Bandeja de Requerimientos',
  personal:              'Personal de la Sección',
}

const SUBPAGE_FEATURES: Record<string, string[]> = {
  vehiculos:              ['SOAT, revisión técnica y tarjeta de propiedad', 'Historial de mantenimientos por vehículo', 'Documentación fotográfica'],
  gabinetes:             ['Crear gabinetes por máquina con QR único', 'Generar etiquetas QR imprimibles', 'Definir inventario esperado por compartimiento'],
  mantenimientos:        ['Programa de mantenimiento preventivo', 'Alertas de vencimientos y fechas críticas', 'Historial de intervenciones técnicas'],
  combustible:           ['Registro de cargas y consumo por vehículo', 'Stock en cisterna interna', 'Reportes de consumo mensual'],
  insumos:               ['Stock de consumibles del almacén', 'Alertas de reposición por mínimo configurado', 'Historial de salidas y entradas'],
  epp:                   ['EPP asignado a cada efectivo', 'Control de vida útil y vencimiento', 'Actas de entrega firmadas'],
  instalaciones:         ['Registro de novedades en instalaciones', 'Seguimiento de reparaciones pendientes', 'Historial de mantenimientos del cuartel'],
  cursos:                ['Catálogo de cursos (crear y editar)', 'Editor de lecciones con texto y video', 'Material descargable adjunto por lección'],
  lecciones:             ['Editor visual de lecciones', 'Adjuntar presentaciones y videos', 'Evaluaciones y calificación automática'],
  biblioteca:            ['Subir documentos institucionales', 'Control de visibilidad por grado', 'Versionado y reemplazo de archivos'],
  progreso:              ['Progreso de cada efectivo por curso', 'Exportar reportes de avance', 'Identificar efectivos sin completar ESBAS'],
  certificados:          ['Emitir certificados internos por curso aprobado', 'Registrar certificados externos del personal', 'Descargar e imprimir certificados'],
  postulantes:           ['Seguimiento del proceso de postulación', 'Estado por etapa del proceso interno', 'Asignación a instructores'],
  aspirantes:            ['Aspirantes cursando ESBAS', 'Progreso por lección y evaluación', 'Asistencia a prácticas presenciales'],
  webinars:              ['Programar webinars con fecha y enlace', 'Inscripciones y asistencia', 'Grabaciones y material de apoyo'],
  medicamentos:          ['Control de lotes y fechas de vencimiento', 'Alertas automáticas de caducidad', 'Historial de uso y reposición'],
  'insumos-medicos':     ['Gasas, sueros, vendas y otros insumos', 'Stock por tipo y control de consumo', 'Pedidos de reposición automáticos'],
  ambulancia:            ['Inventario completo de la AMBULANCIA 163', 'Estado de equipos médicos embarcados', 'Checklists de ingreso por turno'],
  checklists:            ['Checklists de la sección pendientes y completados', 'Tasa de cumplimiento por turno', 'Alertas de checklists atrasados'],
  legajos:               ['Legajos completos del personal activo', 'Historial de grados y ascensos', 'Documentos adjuntos por efectivo'],
  documentos:            ['Archivo documental institucional', 'Resoluciones y actos administrativos', 'Control de versiones y vigencia'],
  licencias:             ['Licencias y permisos activos', 'Calendario de ausencias', 'Aprobación del Primer Jefe'],
  ascensos:              ['Candidatos en proceso de ascenso', 'Seguimiento de requisitos NDR', 'Documentación para la junta calificadora'],
  'reportes-normativa':  ['Reportes de horas de servicio por trimestre', 'Cumplimiento reglamentario del personal', 'Exportación para el CGBVP'],
  calendario:            ['Calendario de publicaciones en redes sociales', 'Programación de contenido institucional', 'Recordatorios y fechas importantes'],
  galeria:               ['Repositorio fotográfico de actividades', 'Clasificación por evento y fecha', 'Descarga de alta resolución'],
  comunicados:           ['Redactar comunicados y notas de prensa', 'Flujo de aprobación del Primer Jefe', 'Historial de publicaciones'],
  ceremonias:            ['Gestión de paradas y desfiles', 'Lista de asistentes por ceremonia', 'Material y logística ceremonial'],
  'bandeja-incidencias': ['Incidencias recibidas del personal', 'Asignar a responsable y hacer seguimiento', 'Cambio de estado con notificaciones automáticas'],
  'bandeja-solicitudes': ['Solicitudes formales recibidas', 'Aprobar, rechazar o derivar', 'Historial de solicitudes gestionadas'],
  requerimientos:        ['Requerimientos formales de compra o servicio entre secciones', 'Aprobar, rechazar o marcar en proceso', 'Historial de requerimientos gestionados'],
  personal:              ['Efectivos con cargo en esta sección', 'Jefe, adjuntos y miembros', 'Historial de asignaciones de cargo'],
}

const VALID_AREA_KEYS = Object.keys(AREAS_META) as AreaKey[]

const AREA_SLUG_TO_KEY: Record<string, AreaKey> = {
  maquinas:              'maquinas',
  'servicios-generales': 'servicios_generales',
  instruccion:           'instruccion',
  prehospitalaria:       'prehospitalaria',
  administracion:        'administracion',
  imagen:                'imagen',
  jefatura:              'jefatura',
}

const AREA_KEY_TO_SLUG: Record<AreaKey, string> = {
  maquinas:              'maquinas',
  servicios_generales:   'servicios-generales',
  instruccion:           'instruccion',
  prehospitalaria:       'prehospitalaria',
  administracion:        'administracion',
  imagen:                'imagen',
  jefatura:              'jefatura',
}

export default async function AreaSubpagePage({
  params,
}: {
  params: Promise<{ key: string; subpage: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { key: rawKey, subpage } = await params

  const areaKey = AREA_SLUG_TO_KEY[rawKey] ?? (VALID_AREA_KEYS.includes(rawKey as AreaKey) ? (rawKey as AreaKey) : null)
  if (!areaKey) notFound()

  const meta = AREAS_META[areaKey]
  const subpageLabel = SUBPAGE_LABELS[subpage] ?? subpage.replace(/-/g, ' ')
  const areaSlug = AREA_KEY_TO_SLUG[areaKey]
  const heroClass = meta.type === 'asesoramiento' ? 'area-hero area-hero--asesoramiento' : 'area-hero'

  const isBandeja = subpage === 'bandeja-incidencias' || subpage === 'bandeja-solicitudes' || subpage === 'requerimientos'

  // ─── Bandeja pages: fetch real data and render ────────────────────
  if (isBandeja) {
    const data = await getAreaBaseData(areaKey)
    const perms = (session.user.permissions ?? []) as string[]
    const canManage = perms.some(p => p.startsWith('area.') && p.endsWith('.manage'))

    const isSolicitudes = subpage === 'bandeja-solicitudes'
    const isRequerimientos = subpage === 'requerimientos'
    const Icon = isRequerimientos ? Send : isSolicitudes ? FileText : AlertTriangle
    const count = isRequerimientos
      ? data.requerimientosInbox.length
      : isSolicitudes ? data.requestsInbox.length : data.incidentsInbox.length
    const openCount = isRequerimientos
      ? data.stats.openRequerimientosCount
      : isSolicitudes ? data.stats.openRequestsCount : data.stats.openIncidentsCount

    return (
      <div className="max-w-[1400px]">
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href={`/areas/${areaSlug}`}
            className="btn btn--ghost btn--sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
            Volver al tablero
          </Link>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>·</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {subpageLabel}
          </span>
        </div>

        <header className={heroClass}>
          <div className="area-hero-seal">{meta.seal}</div>
          <div className="area-hero-body">
            <div className="area-hero-ref">{meta.normativeRef}</div>
            <h1 className="area-hero-title">{meta.name}</h1>
            <p className="area-hero-desc">{subpageLabel}</p>
          </div>
          <div className="area-hero-jefe">
            <span className="area-hero-jefe-label">TOTAL RECIBIDAS</span>
            <span className="area-hero-jefe-name mono" style={{ fontSize: 28 }}>{count}</span>
            {openCount > 0 && (
              <span style={{ fontSize: 11, color: 'var(--flame)', fontFamily: 'var(--font-mono)' }}>
                {openCount} pendiente{openCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </header>

        {isRequerimientos
          ? <BandejaRequerimientosStandalone requerimientos={data.requerimientosInbox} canManage={canManage} />
          : isSolicitudes
            ? <BandejaSolicitudesStandalone requests={data.requestsInbox} canManage={canManage} />
            : <BandejaIncidenciasStandalone incidents={data.incidentsInbox} canManage={canManage} />
        }
      </div>
    )
  }

  // ─── Construction placeholder for all other sub-pages ────────────
  const features = SUBPAGE_FEATURES[subpage] ?? ['Funcionalidad planificada para próximas versiones']

  return (
    <div className="max-w-[1400px]">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link
          href={`/areas/${areaSlug}`}
          className="btn btn--ghost btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.8} />
          Volver al tablero
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)' }}>·</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {subpageLabel}
        </span>
      </div>

      <header className={heroClass}>
        <div className="area-hero-seal">{meta.seal}</div>
        <div className="area-hero-body">
          <div className="area-hero-ref">{meta.normativeRef}</div>
          <h1 className="area-hero-title">{meta.name}</h1>
          <p className="area-hero-desc">{subpageLabel}</p>
        </div>
      </header>

      <div className="area-placeholder">
        <div className="area-placeholder-icon">
          <Construction className="w-8 h-8" strokeWidth={1.4} />
        </div>
        <h3 className="area-placeholder-title">Vista en construcción</h3>
        <p className="area-placeholder-text">
          Esta vista está planificada y se implementará próximamente.
        </p>

        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--ink-line)' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--graphite)',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Funcionalidad prevista
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
              maxWidth: 720,
              margin: '0 auto',
              textAlign: 'left',
            }}
          >
            {features.map((feature, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  background: 'var(--ink-black)',
                  border: '1px solid var(--ink-line)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: 12,
                  color: 'var(--steel)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--brass)',
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
