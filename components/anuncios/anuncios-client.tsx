"use client"

import { useState } from 'react'
import { Inbox, FileEdit, CheckSquare, Plus, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnunciosData, AnuncioView } from '@/lib/anuncios/get-anuncios-data'
import { AnuncioCard } from './anuncio-card'
import { AnuncioComposer } from './anuncio-composer'

interface SectionOption {
  id: string
  key: string
  name: string
}

interface ProfileOption {
  id: string
  fullName: string
  grade: string
  codigoCgbvp: string | null
}

type TabKey = 'buzon' | 'mis' | 'pendientes'

export function AnunciosClient({
  data,
  sections,
  profilesForDirect,
}: {
  data: AnunciosData
  sections: SectionOption[]
  profilesForDirect: ProfileOption[]
}) {
  const { capabilities, counts } = data

  // Default tab: si hay pendientes y es Primer Jefe, ir ahí; si puede crear y no hay buzón, ir a mis
  const defaultTab: TabKey =
    capabilities.canPublish && counts.pendientesTotal > 0
      ? 'pendientes'
      : 'buzon'

  const [tab, setTab] = useState<TabKey>(defaultTab)
  const [composerOpen, setComposerOpen] = useState(false)
  const [editing, setEditing] = useState<AnuncioView | null>(null)

  const handleOpenNew = () => {
    setEditing(null)
    setComposerOpen(true)
  }

  const handleEdit = (anuncio: AnuncioView) => {
    setEditing(anuncio)
    setComposerOpen(true)
  }

  // Mapeo para pasar al composer cuando se edita
  const editingForComposer = editing
    ? {
        id: editing.id,
        title: editing.title,
        content: editing.content,
        priority: editing.priority,
        // Estos campos no vienen en AnuncioView directo — por ahora enviamos null
        // y el composer usa valores por defecto. Para edición full-fidelity
        // tendríamos que traer la fila completa.
        originSectionId: editing.originSection?.id ?? null,
        audienceAllBomberos: editing.audienceSummary.includes('Todos los bomberos activos'),
        audienceGrades: [] as string[],
        audienceAspirantes: editing.audienceSummary.includes('Aspirantes'),
        audiencePostulantes: editing.audienceSummary.includes('Postulantes'),
        directToProfileId: editing.directRecipient ? '' : null, // simplificado
        isPinned: editing.isPinned,
        expiresAt: editing.expiresAt,
      }
    : null

  return (
    <>
      <div className="anuncios-toolbar">
        {capabilities.canCreate && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleOpenNew}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            Nuevo anuncio
          </button>
        )}
      </div>

      <nav className="anuncios-tabs">
        <TabBtn active={tab === 'buzon'} onClick={() => setTab('buzon')} icon={Inbox}>
          Buzón
          {counts.buzonUnread > 0 && (
            <span className="anuncios-tab-count anuncios-tab-count--urgent mono">
              {counts.buzonUnread}
            </span>
          )}
        </TabBtn>
        {capabilities.canCreate && (
          <TabBtn active={tab === 'mis'} onClick={() => setTab('mis')} icon={FileEdit}>
            Mis anuncios
            {(counts.misBorradores + counts.misPendientes + counts.misRechazados) > 0 && (
              <span className="anuncios-tab-count mono">
                {counts.misBorradores + counts.misPendientes + counts.misRechazados}
              </span>
            )}
          </TabBtn>
        )}
        {capabilities.canPublish && (
          <TabBtn active={tab === 'pendientes'} onClick={() => setTab('pendientes')} icon={CheckSquare}>
            Pendientes de aprobar
            {counts.pendientesTotal > 0 && (
              <span className="anuncios-tab-count anuncios-tab-count--urgent mono">
                {counts.pendientesTotal}
              </span>
            )}
          </TabBtn>
        )}
      </nav>

      {tab === 'buzon' && <BuzonView anuncios={data.buzon} />}
      {tab === 'mis' && (
        <MisAnunciosView anuncios={data.misAnuncios} onEdit={handleEdit} />
      )}
      {tab === 'pendientes' && <PendientesView anuncios={data.pendientesAprobacion} />}

      {capabilities.canCreate && (
        <AnuncioComposer
          open={composerOpen}
          onOpenChange={(open) => {
            setComposerOpen(open)
            if (!open) setEditing(null)
          }}
          sections={sections}
          profilesForDirect={profilesForDirect}
          editing={editingForComposer as any}
        />
      )}
    </>
  )
}

function TabBtn({
  active, onClick, icon: Icon, children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Inbox
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={cn('anuncios-tab', active && 'anuncios-tab--active')}
      onClick={onClick}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
      {children}
    </button>
  )
}

function BuzonView({ anuncios }: { anuncios: AnuncioView[] }) {
  if (anuncios.length === 0) {
    return (
      <div className="anuncios-empty">
        <div className="anuncios-empty-icon">
          <Inbox className="w-7 h-7" strokeWidth={1.4} />
        </div>
        <h3 className="anuncios-empty-title">Su buzón está vacío</h3>
        <p className="anuncios-empty-text">
          Cuando se publique un anuncio dirigido a usted o a su grupo, aparecerá aquí.
        </p>
      </div>
    )
  }

  return (
    <div className="anuncios-feed">
      {anuncios.map((a) => (
        <AnuncioCard key={a.id} anuncio={a} mode="buzon" />
      ))}
    </div>
  )
}

function MisAnunciosView({
  anuncios, onEdit,
}: {
  anuncios: AnuncioView[]
  onEdit: (a: AnuncioView) => void
}) {
  if (anuncios.length === 0) {
    return (
      <div className="anuncios-empty">
        <div className="anuncios-empty-icon">
          <FileEdit className="w-7 h-7" strokeWidth={1.4} />
        </div>
        <h3 className="anuncios-empty-title">Aún no ha creado anuncios</h3>
        <p className="anuncios-empty-text">
          Use el botón "Nuevo anuncio" para redactar un borrador. Será enviado al Primer Jefe
          para aprobación antes de publicarse.
        </p>
      </div>
    )
  }

  // Agrupar por estado
  const borradores = anuncios.filter((a) => a.status === 'borrador')
  const pendientes = anuncios.filter((a) => a.status === 'pendiente_aprobacion')
  const rechazados = anuncios.filter((a) => a.status === 'rechazado')
  const aprobados = anuncios.filter((a) => a.status === 'aprobado')
  const archivados = anuncios.filter((a) => a.status === 'archivado')

  return (
    <div className="anuncios-feed">
      {pendientes.length > 0 && (
        <>
          <SectionHeader title="Pendientes de aprobación" count={pendientes.length} color="flame" />
          {pendientes.map((a) => <AnuncioCard key={a.id} anuncio={a} mode="mis" onEdit={onEdit} />)}
        </>
      )}
      {rechazados.length > 0 && (
        <>
          <SectionHeader title="Rechazados · pendientes de corregir" count={rechazados.length} color="red" />
          {rechazados.map((a) => <AnuncioCard key={a.id} anuncio={a} mode="mis" onEdit={onEdit} />)}
        </>
      )}
      {borradores.length > 0 && (
        <>
          <SectionHeader title="Borradores" count={borradores.length} color="steel" />
          {borradores.map((a) => <AnuncioCard key={a.id} anuncio={a} mode="mis" onEdit={onEdit} />)}
        </>
      )}
      {aprobados.length > 0 && (
        <>
          <SectionHeader title="Publicados" count={aprobados.length} color="emerald" />
          {aprobados.map((a) => <AnuncioCard key={a.id} anuncio={a} mode="mis" onEdit={onEdit} />)}
        </>
      )}
      {archivados.length > 0 && (
        <>
          <SectionHeader title="Archivados" count={archivados.length} color="graphite" />
          {archivados.map((a) => <AnuncioCard key={a.id} anuncio={a} mode="mis" onEdit={onEdit} />)}
        </>
      )}
    </div>
  )
}

function PendientesView({ anuncios }: { anuncios: AnuncioView[] }) {
  if (anuncios.length === 0) {
    return (
      <div className="anuncios-empty">
        <div className="anuncios-empty-icon">
          <CheckSquare className="w-7 h-7" strokeWidth={1.4} />
        </div>
        <h3 className="anuncios-empty-title">No hay anuncios pendientes</h3>
        <p className="anuncios-empty-text">
          Cuando un Jefe de Sección envíe un anuncio a aprobación, aparecerá aquí para su revisión.
        </p>
      </div>
    )
  }

  return (
    <div className="anuncios-feed">
      {anuncios.map((a) => (
        <AnuncioCard key={a.id} anuncio={a} mode="pendiente" />
      ))}
    </div>
  )
}

function SectionHeader({
  title, count, color,
}: {
  title: string
  count: number
  color: 'flame' | 'red' | 'steel' | 'emerald' | 'graphite'
}) {
  const colorVar = {
    flame: 'var(--flame)',
    red: 'var(--red-glow)',
    steel: 'var(--steel)',
    emerald: 'var(--emerald-glow)',
    graphite: 'var(--graphite)',
  }[color]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: colorVar,
        paddingTop: 16,
        marginBottom: 4,
      }}
    >
      <span style={{ fontWeight: 600 }}>{title}</span>
      <span
        style={{
          width: 20,
          height: 20,
          display: 'grid',
          placeItems: 'center',
          fontSize: 10,
          color: 'var(--bone)',
          background: colorVar,
          borderRadius: '50%',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
        }}
      >
        {count}
      </span>
      <span
        style={{
          flex: 1,
          height: 1,
          background: 'var(--ink-line-soft)',
        }}
      />
    </div>
  )
}
