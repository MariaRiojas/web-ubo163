import type React from 'react'
import { MainNav } from '@/components/main-nav'
import { MainFooter } from '@/components/main-footer'

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20">
      <MainNav />
      <main className="flex-1">{children}</main>
      <MainFooter />
    </div>
  )
}
