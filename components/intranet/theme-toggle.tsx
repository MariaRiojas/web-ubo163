"use client"

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

const STORAGE_KEY = 'ubo163:intranet-theme'

export function IntranetThemeToggle({ collapsed }: { collapsed: boolean }) {
  const [light, setLight] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light') {
      document.documentElement.classList.add('intranet-light')
      setLight(true)
    }
    setMounted(true)
  }, [])

  if (!mounted) return null

  function toggle() {
    const next = !light
    setLight(next)
    if (next) {
      document.documentElement.classList.add('intranet-light')
      localStorage.setItem(STORAGE_KEY, 'light')
    } else {
      document.documentElement.classList.remove('intranet-light')
      localStorage.setItem(STORAGE_KEY, 'dark')
    }
  }

  return (
    <button
      onClick={toggle}
      title={light ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      aria-label={light ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      className="flex-shrink-0 w-8 h-8 grid place-items-center rounded-sm transition-colors"
      style={{ color: 'var(--steel)' }}
      onMouseEnter={e => {
        e.currentTarget.style.color = 'var(--brass)'
        e.currentTarget.style.background = 'rgba(196,160,98,0.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'var(--steel)'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {light
        ? <Moon className="w-4 h-4" strokeWidth={1.8} />
        : <Sun className="w-4 h-4" strokeWidth={1.8} />
      }
      {!collapsed && (
        <span className="sr-only">{light ? 'Modo oscuro' : 'Modo claro'}</span>
      )}
    </button>
  )
}
