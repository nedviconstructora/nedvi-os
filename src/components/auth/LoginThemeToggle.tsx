'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'nedvi-theme'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const isDark = theme === 'dark'

  root.classList.toggle('dark', isDark)
  root.classList.toggle('theme-dark', isDark)
  root.classList.toggle('theme-light', !isDark)
  root.style.colorScheme = theme
}

export function LoginThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    const initial: Theme = saved === 'dark' ? 'dark' : 'light'
    setTheme(initial)
    applyTheme(initial)
  }, [])

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    window.localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="login-theme-toggle inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5DAAF2]"
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={isDark ? 'Tema claro' : 'Tema oscuro'}
    >
      {isDark ? <Sun size={18} strokeWidth={1.9} /> : <Moon size={18} strokeWidth={1.9} />}
    </button>
  )
}
