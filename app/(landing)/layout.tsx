import type React from 'react'
import { MainNav } from '@/components/main-nav'
import { MainFooter } from '@/components/main-footer'
import { SiteContentProvider } from '@/components/site-content/site-content-provider'
import { getAllSiteContent } from '@/lib/site-content/get-content'

export const dynamic = 'force-dynamic'

export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const content = await getAllSiteContent()
  return (
    <SiteContentProvider value={content}>
      <div className="flex flex-col min-h-screen bg-black">
        <MainNav />
        <main className="flex-1">{children}</main>
        <MainFooter />
      </div>
    </SiteContentProvider>
  )
}
