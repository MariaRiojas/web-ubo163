import type React from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { IntranetSidebar } from '@/components/intranet/sidebar'
import { IntranetMobileNav } from '@/components/intranet/mobile-nav'
import { getGreeting, GRADE_LABELS, formatShortName } from '@/components/intranet/_shared'

export default async function IntranetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const greeting = getGreeting()
  const fullName = session.user.name ?? ''
  const shortName = formatShortName(fullName).split(',')[0]?.trim() ?? ''
  const grade = (session.user as any).grade as string
  const gradeLabel = GRADE_LABELS[grade] ?? grade

  return (
    <div className="intranet-theme min-h-screen flex relative">
      {/* Fondos atmosféricos — posición fixed, se renderizan detrás */}
      <div className="bg-grid" aria-hidden />
      <div className="bg-noise" aria-hidden />
      <div className="bg-glow-red" aria-hidden />
      <div className="bg-glow-brass" aria-hidden />

      {/* Sidebar desktop (≥ md) */}
      <div className="hidden md:flex relative z-10">
        <IntranetSidebar />
      </div>

      {/* Columna principal */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header mobile con hamburguesa */}
        <header
          className="md:hidden flex items-center gap-3 px-4 h-14 border-b shrink-0"
          style={{
            borderColor: 'var(--ink-line)',
            background: 'var(--ink-deep)',
          }}
        >
          <IntranetMobileNav />
          <div className="min-w-0 flex-1 leading-tight">
            <div
              className="text-[11px]"
              style={{ color: 'var(--steel)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
            >
              {greeting}
            </div>
            <div
              className="text-[13px] font-semibold truncate"
              style={{ color: 'var(--bone)' }}
            >
              {gradeLabel} {shortName}
            </div>
          </div>
        </header>

        {/* Contenido + footer con lema */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 md:px-8 py-6 md:py-8 max-w-[1400px] mx-auto w-full">
            {children}

            <footer className="footer-motto">
              <div className="motto-line" />
              <div className="motto-text">Dios · Patria · Humanidad</div>
              <div className="motto-line" />
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
