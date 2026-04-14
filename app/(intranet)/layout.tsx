import type React from "react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { IntranetSidebar } from "@/components/intranet/sidebar"
import { IntranetMobileNav } from "@/components/intranet/mobile-nav"

export default async function IntranetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — sólo visible en desktop */}
      <div className="hidden md:flex">
        <IntranetSidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header móvil — sólo visible en mobile */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-card shrink-0">
          <IntranetMobileNav />
          <span className="font-semibold text-sm truncate flex-1">
            {session.user.name}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
