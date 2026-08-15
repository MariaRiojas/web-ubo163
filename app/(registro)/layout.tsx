import type React from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function RegistroLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    const base = (process.env.AUTH_URL ?? 'https://d1bno1kyerz6hk.cloudfront.net').replace(/\/$/, '')
    redirect(`${base}/login`)
  }
  return (
    <div className="intranet-theme min-h-screen relative">
      <div className="bg-grid" aria-hidden />
      <div className="bg-noise" aria-hidden />
      <div className="bg-glow-red" aria-hidden />
      <div className="bg-glow-brass" aria-hidden />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
