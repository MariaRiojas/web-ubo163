import 'server-only'
import { ddb, TABLE, QueryCommand, ScanCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { ContentCalendarItem } from '@/lib/db/schema/content-calendar'
import type { Announcement } from '@/lib/db/schema/announcements'
import type { Profile } from '@/lib/db/schema/profiles'

export interface CalendarEntry {
  id: string
  title: string
  date: string
  type: string | null
  platform: string[] | null
  category: string | null
  status: string
  assignedToName: string | null
  templateUrl: string | null
  caption: string | null
  notes: string | null
  isUpcoming: boolean
}

export interface PublishedAnnouncement {
  id: string
  title: string
  priority: string
  authorName: string | null
  publishedAt: string | null
  audienceSummary: string
}

export interface ImagenExtraData {
  upcomingContent: CalendarEntry[]
  recentContent: CalendarEntry[]
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

export async function getImagenExtraData(): Promise<ImagenExtraData> {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const in30Str = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10)

  // All calendar items for the month + upcoming
  const { Items: calItems } = await ddb.send(new ScanCommand({
    TableName: TABLE.contentCalendar,
    FilterExpression: '#d >= :start',
    ExpressionAttributeNames: { '#d': 'date' },
    ExpressionAttributeValues: { ':start': firstOfMonth },
  }))
  const allItems = (calItems ?? []) as ContentCalendarItem[]

  // Resolve assignedTo profiles
  const assigneeIds = [...new Set(
    allItems.filter(i => i.assignedTo).map(i => i.assignedTo!),
  )]
  const assigneeNames = new Map<string, string>()
  if (assigneeIds.length > 0) {
    const { Responses } = await ddb.send(new BatchGetCommand({
      RequestItems: {
        [TABLE.profiles]: {
          Keys: assigneeIds.map(pid => ({ profileId: pid })),
          ProjectionExpression: 'profileId, fullName',
        },
      },
    }))
    for (const p of Responses?.[TABLE.profiles] ?? []) {
      assigneeNames.set(p.profileId as string, p.fullName as string)
    }
  }

  function mapEntry(item: ContentCalendarItem, upcoming: boolean): CalendarEntry {
    return {
      id: item.eventId,
      title: item.title,
      date: item.date,
      type: item.type ?? null,
      platform: item.platform ?? null,
      category: item.category ?? null,
      status: item.status ?? 'planificado',
      assignedToName: item.assignedTo ? (assigneeNames.get(item.assignedTo) ?? null) : null,
      templateUrl: item.templateUrl ?? null,
      caption: item.caption ?? null,
      notes: item.notes ?? null,
      isUpcoming: upcoming,
    }
  }

  const upcomingContent = allItems
    .filter(i => i.date >= todayStr && i.date <= in30Str)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 30)
    .map(i => mapEntry(i, true))

  const recentContent = allItems
    .filter(i => i.status === 'publicado')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)
    .map(i => mapEntry(i, false))

  // Published announcements (last 15)
  const { Items: annItems } = await ddb.send(new QueryCommand({
    TableName: TABLE.announcements,
    IndexName: 'status-createdAt-index',
    KeyConditionExpression: '#s = :aprobado',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':aprobado': 'aprobado' },
    ScanIndexForward: false,
    Limit: 15,
  }))
  const announcements = (annItems ?? []) as Announcement[]

  const authorIds = [...new Set(announcements.map(a => a.authorId).filter(Boolean))]
  const authorNames = new Map<string, string>()
  if (authorIds.length > 0) {
    const { Responses } = await ddb.send(new BatchGetCommand({
      RequestItems: {
        [TABLE.profiles]: {
          Keys: authorIds.map(pid => ({ profileId: pid })),
          ProjectionExpression: 'profileId, fullName',
        },
      },
    }))
    for (const p of Responses?.[TABLE.profiles] ?? []) {
      authorNames.set(p.profileId as string, p.fullName as string)
    }
  }

  const publishedAnnouncements: PublishedAnnouncement[] = announcements.map(a => {
    let audienceSummary = 'Todos los bomberos'
    if (a.audienceAllBomberos) audienceSummary = 'Todos los bomberos'
    else if (a.audienceAspirantes && a.audiencePostulantes) audienceSummary = 'Aspirantes y postulantes'
    else if (a.audienceAspirantes) audienceSummary = 'Aspirantes'
    else if (a.audiencePostulantes) audienceSummary = 'Postulantes'
    else audienceSummary = 'Audiencia específica'
    return {
      id: a.announcementId,
      title: a.title,
      priority: a.priority,
      authorName: a.authorId ? (authorNames.get(a.authorId) ?? null) : null,
      publishedAt: a.publishedAt ?? null,
      audienceSummary,
    }
  })

  // Month stats
  const monthItems = allItems.filter(i => i.date >= firstOfMonth && i.date <= lastOfMonth)
  const byPlatform: Record<string, number> = {}
  const byCategory: Record<string, number> = {}
  let publishedThisMonth = 0; let plannedThisMonth = 0; let inProgressThisMonth = 0

  for (const r of monthItems) {
    if (r.status === 'publicado') publishedThisMonth++
    else if (r.status === 'planificado') plannedThisMonth++
    else if (r.status === 'en_proceso') inProgressThisMonth++
    if (r.platform) {
      for (const p of r.platform) byPlatform[p] = (byPlatform[p] ?? 0) + 1
    }
    if (r.category) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1
  }

  return {
    upcomingContent,
    recentContent,
    publishedAnnouncements,
    stats: {
      totalThisMonth: monthItems.length,
      publishedThisMonth,
      plannedThisMonth,
      inProgressThisMonth,
      totalAnnouncements: announcements.length,
      byPlatform,
      byCategory,
    },
  }
}
