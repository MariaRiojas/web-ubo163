import type React from "react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { IntranetSidebar } from "@/components/intranet/sidebar"

export default async function IntranetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <IntranetSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
