"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { ChevronLeft, LogOut, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { companyConfig } from '@/company.config'
import { buildMenu, isMenuItemActive, type MenuSection } from '@/lib/navigation/menu-builder'
import type { Permission } from '@/lib/auth/permissions'
import { MENU_ICON_MAP, GRADE_LABELS, getInitials, formatShortName } from './_shared'

const COLLAPSED_KEY = 'ubo163:sidebar:collapsed'

export function IntranetSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Restaurar estado colapsado desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY)
    if (saved === 'true') setCollapsed(true)
    setMounted(true)
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(COLLAPSED_KEY, next ? 'true' : 'false')
  }

  const permissions = (session?.user?.permissions as Permission[]) ?? []
  const grade = (session?.user?.grade as string) ?? ''
  const status = (session?.user?.status as string) ?? ''
  const fullName = session?.user?.name ?? ''

  const sections: MenuSection[] = buildMenu({
    permissions,
    grade,
    status,
    counts: {
      // TODO: estos counts vienen del layout server component via props futuro
      unreadAnnouncements: 0,
      pendingChecklists: 0,
      pendingIncidentsForMe: 0,
      pendingRequestsForMe: 0,
    },
  })

  const initials = getInitials(fullName)
  const displayName = formatShortName(fullName)

  return (
    <aside
      className={cn(
        'relative h-screen flex-shrink-0 transition-[width] duration-240 border-r',
        'flex flex-col',
        collapsed ? 'w-[72px]' : 'w-[280px]',
      )}
      style={{
        background: 'linear-gradient(180deg, var(--ink-deep), #0E131B 100%)',
        borderColor: 'var(--ink-line)',
      }}
    >
      {/* Línea roja sutil al borde derecho */}
      <div
        aria-hidden
        className="absolute top-0 right-0 w-px h-full opacity-[0.15] pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, transparent, var(--red-163) 20%, var(--red-163) 80%, transparent)',
        }}
      />

      {/* Brand / escudo */}
      <div
        className="flex items-center gap-3 px-5 py-6 border-b"
        style={{ borderColor: 'var(--ink-line)' }}
      >
        <div className="w-[56px] h-[56px] flex-shrink-0 grid place-items-center">
          {/* TODO: reemplazar con /public/escudo-163.svg cuando se suba */}
          <div
            className="w-full h-full rounded grid place-items-center"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(220,38,38,0.2), transparent), var(--ink-elevated)',
              border: '1px solid var(--red-deep)',
            }}
          >
            <Shield className="w-7 h-7" style={{ color: 'var(--red-glow)' }} />
          </div>
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <div
              className="text-[15px] font-semibold truncate"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--bone)' }}
            >
              {companyConfig.shortName}
            </div>
            <div
              className="flex items-center gap-1.5 text-[10px] mt-1 uppercase"
              style={{
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em',
                color: 'var(--brass)',
              }}
            >
              <span>Cía. N.° {companyConfig.id}</span>
              <span style={{ color: 'var(--graphite)' }}>·</span>
              <span style={{ color: 'var(--steel)' }}>CGBVP</span>
            </div>
          </div>
        )}
      </div>

      {/* Toggle button */}
      {mounted && (
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
          className="absolute top-20 w-7 h-7 grid place-items-center rounded-full cursor-pointer transition-all z-20"
          style={{
            right: '-14px',
            background: 'var(--ink-deep)',
            border: '1px solid var(--ink-line)',
            color: 'var(--steel)',
            boxShadow: '2px 2px 8px rgba(0,0,0,0.4)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--red-glow)'
            e.currentTarget.style.borderColor = 'var(--red-163)'
            e.currentTarget.style.transform = 'scale(1.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--steel)'
            e.currentTarget.style.borderColor = 'var(--ink-line)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <ChevronLeft
            className="w-3.5 h-3.5 transition-transform duration-240"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}
          />
        </button>
      )}

      {/* Nav — scroll vertical con scrollbar discreto */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 flex flex-col gap-1">
        {sections.map((section, idx) => (
          <SidebarSection
            key={`${section.label}-${idx}`}
            section={section}
            pathname={pathname ?? '/'}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* User card */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-t"
        style={{
          borderColor: 'var(--ink-line)',
          background: 'rgba(220, 38, 38, 0.04)',
        }}
      >
        <div
          className={cn(
            'w-9 h-9 flex-shrink-0 grid place-items-center rounded-sm text-[11px] font-semibold',
            'font-mono tracking-tight',
          )}
          style={{
            background: 'rgba(220, 38, 38, 0.1)',
            color: 'var(--red-glow)',
            border: '1px solid var(--red-163)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {initials}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div
                className="text-[12px] font-semibold truncate leading-tight"
                style={{ color: 'var(--bone)' }}
              >
                {displayName}
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--steel)',
                  letterSpacing: '0.02em',
                }}
              >
                {GRADE_LABELS[grade] ?? grade}
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              title="Cerrar sesión"
              className="w-8 h-8 grid place-items-center rounded-sm transition-colors"
              style={{ color: 'var(--steel)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--red-glow)'
                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--steel)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </aside>
  )
}

// ════════════════════════════════════════════════════════════════════
// SUB-COMPONENTES
// ════════════════════════════════════════════════════════════════════

function SidebarSection({
  section,
  pathname,
  collapsed,
}: {
  section: MenuSection
  pathname: string
  collapsed: boolean
}) {
  const isAreaSection = !!section.areaSeal
  const sealIsBrass = section.areaSealVariant === 'brass'

  return (
    <div
      className={cn('flex flex-col mt-5 first:mt-0', isAreaSection && 'pt-3 pb-2 -mx-3 px-3')}
      style={
        isAreaSection
          ? {
              background: 'linear-gradient(180deg, rgba(220, 38, 38, 0.06), transparent)',
              borderTop: `1px solid ${sealIsBrass ? 'var(--brass-deep)' : 'var(--red-deep)'}`,
              borderBottom: '1px solid var(--ink-line-soft)',
            }
          : undefined
      }
    >
      {/* Label de sección */}
      {!collapsed && (
        <div
          className={cn(
            'px-3 pb-2 flex items-center gap-2',
            isAreaSection ? '' : 'uppercase',
          )}
          style={{
            fontFamily: isAreaSection ? 'var(--font-display)' : 'var(--font-ui)',
            fontSize: isAreaSection ? '12px' : '10px',
            fontWeight: 600,
            letterSpacing: isAreaSection ? '0.02em' : '0.12em',
            color: isAreaSection
              ? sealIsBrass
                ? 'var(--brass)'
                : 'var(--red-glow)'
              : 'var(--graphite)',
          }}
        >
          {section.areaSeal && (
            <span
              className="w-[22px] h-[22px] grid place-items-center rounded-sm font-bold flex-shrink-0"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '10px',
                letterSpacing: '0.04em',
                color: sealIsBrass ? 'var(--brass)' : 'var(--red-glow)',
                border: `1px solid ${sealIsBrass ? 'var(--brass-deep)' : 'var(--red-163)'}`,
                background: sealIsBrass ? 'rgba(196, 160, 98, 0.1)' : 'rgba(220, 38, 38, 0.1)',
              }}
            >
              {section.areaSeal}
            </span>
          )}
          <span>{section.label}</span>
        </div>
      )}

      {collapsed && section.areaSeal && (
        <div className="h-2" />
      )}

      {/* Items */}
      {section.items.map((item) => {
        const Icon = MENU_ICON_MAP[item.icon]
        const active = isMenuItemActive(item.href, pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={cn(
              'group relative flex items-center gap-3 px-3 rounded-sm text-[13px] font-medium transition-colors',
              collapsed ? 'justify-center py-3' : 'py-2.5',
            )}
            style={{
              color: active ? 'var(--bone)' : 'var(--steel)',
              background: active
                ? 'linear-gradient(90deg, rgba(220, 38, 38, 0.12), rgba(220, 38, 38, 0.02))'
                : 'transparent',
              boxShadow: active && !collapsed ? 'inset 2px 0 0 var(--red-163)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.color = 'var(--bone)'
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.color = 'var(--steel)'
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.6} />
            {!collapsed && (
              <>
                <span className="truncate flex-1">{item.label}</span>
                {item.live && (
                  <span
                    className="text-[9px] font-mono uppercase tracking-wider flex items-center gap-1"
                    style={{ color: 'var(--emerald-glow)' }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: 'var(--emerald-glow)',
                        boxShadow: '0 0 6px var(--emerald-glow)',
                      }}
                    />
                    LIVE
                  </span>
                )}
                {item.badge != null && !item.live && (
                  <span
                    className={cn(
                      'min-w-[22px] h-[18px] px-1.5 grid place-items-center rounded-[10px] font-mono text-[10px] font-bold',
                    )}
                    style={{
                      background:
                        item.badgeStyle === 'urgent' ? 'var(--red-163)' : 'var(--brass)',
                      color: item.badgeStyle === 'urgent' ? 'var(--bone)' : 'var(--ink-black)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                {active && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: 'var(--red-163)',
                      boxShadow: '0 0 8px var(--red-glow)',
                    }}
                  />
                )}
              </>
            )}
          </Link>
        )
      })}
    </div>
  )
}
