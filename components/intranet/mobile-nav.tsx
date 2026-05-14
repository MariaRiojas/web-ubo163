"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu, LogOut, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { companyConfig } from '@/company.config'
import { buildMenu, isMenuItemActive, type MenuSection } from '@/lib/navigation/menu-builder'
import type { Permission } from '@/lib/auth/permissions'
import { MENU_ICON_MAP, GRADE_LABELS, getInitials, formatShortName } from './_shared'

export function IntranetMobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  const permissions = (session?.user?.permissions as Permission[]) ?? []
  const grade = (session?.user?.grade as string) ?? ''
  const status = (session?.user?.status as string) ?? ''
  const fullName = session?.user?.name ?? ''

  const sections: MenuSection[] = buildMenu({
    permissions,
    grade,
    status,
    counts: {},
  })

  const initials = getInitials(fullName)
  const displayName = formatShortName(fullName)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          style={{ color: 'var(--bone)' }}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[300px] p-0 flex flex-col border-r-0"
        style={{
          background: 'linear-gradient(180deg, var(--ink-deep), #0E131B 100%)',
          color: 'var(--bone)',
        }}
      >
        <SheetHeader
          className="flex flex-row items-center gap-3 px-5 py-5 border-b text-left"
          style={{ borderColor: 'var(--ink-line)' }}
        >
          <div className="w-[48px] h-[48px] flex-shrink-0 grid place-items-center">
            <div
              className="w-full h-full rounded grid place-items-center"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(220,38,38,0.2), transparent), var(--ink-elevated)',
                border: '1px solid var(--red-deep)',
              }}
            >
              <Shield className="w-6 h-6" style={{ color: 'var(--red-glow)' }} />
            </div>
          </div>
          <SheetTitle asChild>
            <div className="min-w-0 flex-1 leading-tight">
              <div
                className="text-[14px] font-semibold truncate"
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
          </SheetTitle>
        </SheetHeader>

        {/* User card */}
        <div
          className="flex items-center gap-3 mx-3 mt-3 p-3 rounded-sm"
          style={{
            background: 'rgba(220, 38, 38, 0.04)',
            border: '1px solid var(--ink-line)',
          }}
        >
          <div
            className="w-9 h-9 flex-shrink-0 grid place-items-center rounded-sm text-[11px] font-semibold"
            style={{
              background: 'rgba(220, 38, 38, 0.1)',
              color: 'var(--red-glow)',
              border: '1px solid var(--red-163)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {initials}
          </div>
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
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {sections.map((section, idx) => (
            <MobileNavSection
              key={`${section.label}-${idx}`}
              section={section}
              pathname={pathname ?? '/'}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </nav>

        {/* Cerrar sesión */}
        <div
          className="border-t px-3 py-3"
          style={{ borderColor: 'var(--ink-line)' }}
        >
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-sm text-[13px] font-medium transition-colors"
            style={{ color: 'var(--steel)' }}
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MobileNavSection({
  section,
  pathname,
  onNavigate,
}: {
  section: MenuSection
  pathname: string
  onNavigate: () => void
}) {
  const isAreaSection = !!section.areaSeal
  const sealIsBrass = section.areaSealVariant === 'brass'

  return (
    <div
      className={cn('flex flex-col mt-4 first:mt-0', isAreaSection && 'pt-3 pb-2 -mx-3 px-3')}
      style={
        isAreaSection
          ? {
              background: 'linear-gradient(180deg, rgba(220, 38, 38, 0.06), transparent)',
              borderTop: `1px solid ${sealIsBrass ? 'var(--brass-deep)' : 'var(--red-deep)'}`,
            }
          : undefined
      }
    >
      <div
        className="px-3 pb-2 flex items-center gap-2"
        style={{
          fontFamily: isAreaSection ? 'var(--font-display)' : 'var(--font-ui)',
          fontSize: isAreaSection ? '12px' : '10px',
          fontWeight: 600,
          letterSpacing: isAreaSection ? '0.02em' : '0.12em',
          textTransform: isAreaSection ? 'none' : 'uppercase',
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

      {section.items.map((item) => {
        const Icon = MENU_ICON_MAP[item.icon]
        const active = isMenuItemActive(item.href, pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13px] font-medium transition-colors"
            style={{
              color: active ? 'var(--bone)' : 'var(--steel)',
              background: active
                ? 'linear-gradient(90deg, rgba(220, 38, 38, 0.12), rgba(220, 38, 38, 0.02))'
                : 'transparent',
              boxShadow: active ? 'inset 2px 0 0 var(--red-163)' : 'none',
            }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.6} />
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
                className="min-w-[22px] h-[18px] px-1.5 grid place-items-center rounded-[10px] font-mono text-[10px] font-bold"
                style={{
                  background:
                    item.badgeStyle === 'urgent' ? 'var(--red-163)' : 'var(--brass)',
                  color: item.badgeStyle === 'urgent' ? 'var(--bone)' : 'var(--ink-black)',
                }}
              >
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
