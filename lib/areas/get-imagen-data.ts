import 'server-only'
import { db } from '@/lib/db'
import { contentCalendar, announcements, profiles } from '@/lib/db/schema'
import { eq, gte, lte, and, desc, asc, or, count } from 'drizzle-orm'

// ═══════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════

export interface CalendarEntry {
  id: string
  title: string
  date: string                   // ISO date
  type: string | null
  platform: string[] | null
  category: string | null
  status: string
  assignedToName: string | null
  templateUrl: string | null
  caption: string | null
  notes: string | null
  isUpcoming: boolean            // fecha >= hoy
}

export interface PublishedAnnouncement {
  id: string
  title: string
  priority: string
  authorName: string | null
  publishedAt: Date | null
  audienceSummary: string
}

export interface ImagenExtraData {
  upcomingContent: CalendarEntry[]    // próximas 30 publicaciones (hoy en adelante)
  recentContent: CalendarEntry[]      // últimas 10 publicadas
  publishedAnnouncements: PublishedAnnouncement[]
  stats: {
    totalThisMonth: number
    publishedThisMonth: number
    plannedThisMonth: number
    inProgressThisMonth: number
    totalAnnouncements: number
    byPlatform: Record<string, number>
    byCategory: Record<string, number>
  }
}

// ═══════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════

export async function getImagenExtraData(): Promise<ImagenExtraData> {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10)
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10)
  const in30Str = new Date(now.getTime() + 30 * 86400000)
    .toISOString()
    .slice(0, 10)

  // ── Contenido próximo (hoy → +30 días) ───────────────────────
  const upcomingRows = await db
    .select({
      item: contentCalendar,
      assignedName: profiles.fullName,
    })
    .from(contentCalendar)
    .leftJoin(profiles, eq(contentCalendar.assignedTo, profiles.id))
    .where(
      and(
        gte(contentCalendar.date, todayStr),
        lte(contentCalendar.date, in30Str),
      ),
    )
    .orderBy(asc(contentCalendar.date))
    .limit(30)

  // ── Contenido publicado reciente ──────────────────────────────
  const recentRows = await db
    .select({
      item: contentCalendar,
      assignedName: profiles.fullName,
    })
    .from(contentCalendar)
    .leftJoin(profiles, eq(contentCalendar.assignedTo, profiles.id))
    .where(eq(contentCalendar.status, 'publicado'))
    .orderBy(desc(contentCalendar.date))
    .limit(10)

  function mapEntry(r: typeof upcomingRows[number], upcoming: boolean): CalendarEntry {
    return {
      id: r.item.id,
      title: r.item.title,
      date: r.item.date,
      type: r.item.type,
      platform: r.item.platform,
      category: r.item.category,
      status: r.item.status ?? 'planificado',
      assignedToName: r.assignedName,
      templateUrl: r.item.templateUrl,
      caption: r.item.caption,
      notes: r.item.notes,
      isUpcoming: upcoming,
    }
  }

  const upcomingContent = upcomingRows.map((r) => mapEntry(r, true))
  const recentContent = recentRows.map((r) => mapEntry(r, false))

  // ── Anuncios publicados (últimos 15) ─────────────────────────
  const announcementRows = await db
    .select({
      ann: announcements,
      authorName: profiles.fullName,
    })
    .from(announcements)
    .leftJoin(profiles, eq(announcements.authorId, profiles.id))
    .where(eq(announcements.status, 'aprobado'))
    .orderBy(desc(announcements.publishedAt))
    .limit(15)

  const publishedAnnouncements: PublishedAnnouncement[] = announcementRows.map((r) => {
    let audienceSummary = 'Todos los bomberos'
    if (r.ann.audienceAllBomberos) audienceSummary = 'Todos los bomberos'
    else if (r.ann.audienceAspirantes && r.ann.audiencePostulantes) audienceSummary = 'Aspirantes y postulantes'
    else if (r.ann.audienceAspirantes) audienceSummary = 'Aspirantes'
    else if (r.ann.audiencePostulantes) audienceSummary = 'Postulantes'
    else audienceSummary = 'Audiencia específica'

    return {
      id: r.ann.id,
      title: r.ann.title,
      priority: r.ann.priority,
      authorName: r.authorName,
      publishedAt: r.ann.publishedAt,
      audienceSummary,
    }
  })

  // ── Stats del mes ─────────────────────────────────────────────
  const monthRows = await db
    .select({
      status: contentCalendar.status,
      platform: contentCalendar.platform,
      category: contentCalendar.category,
    })
    .from(contentCalendar)
    .where(
      and(
        gte(contentCalendar.date, firstOfMonth),
        lte(contentCalendar.date, lastOfMonth),
      ),
    )

  const byPlatform: Record<string, number> = {}
  const byCategory: Record<string, number> = {}
  let publishedThisMonth = 0
  let plannedThisMonth = 0
  let inProgressThisMonth = 0

  for (const r of monthRows) {
    if (r.status === 'publicado') publishedThisMonth++
    else if (r.status === 'planificado') plannedThisMonth++
    else if (r.status === 'en_proceso') inProgressThisMonth++

    if (r.platform) {
      for (const p of r.platform) {
        byPlatform[p] = (byPlatform[p] ?? 0) + 1
      }
    }
    if (r.category) {
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1
    }
  }

  const totalAnnouncements = await db
    .select({ count: count() })
    .from(announcements)
    .where(eq(announcements.status, 'aprobado'))
    .then((r) => Number(r[0]?.count ?? 0))

  return {
    upcomingContent,
    recentContent,
    publishedAnnouncements,
    stats: {
      totalThisMonth: monthRows.length,
      publishedThisMonth,
      plannedThisMonth,
      inProgressThisMonth,
      totalAnnouncements,
      byPlatform,
      byCategory,
    },
  }
}
