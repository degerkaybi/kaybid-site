'use client'

import { Moon, Square, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'brutal'

const order: Theme[] = ['brutal', 'dark', 'light']

function readTheme(): Theme {
  const current = document.documentElement.dataset.theme
  return current === 'dark' || current === 'light' ? current : 'brutal'
}

export default function PortfolioThemeToggle() {
  const [theme, setTheme] = useState<Theme>('brutal')

  useEffect(() => {
    setTheme(readTheme())
  }, [])

  const nextTheme = order[(order.indexOf(theme) + 1) % order.length]

  const toggleTheme = () => {
    const next = order[(order.indexOf(readTheme()) + 1) % order.length]
    document.documentElement.dataset.theme = next
    setTheme(next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      // The theme still works when browser storage is unavailable.
    }
  }

  // Show the icon of the *current* theme so dark mode reads as a moon.
  const Icon = theme === 'dark' ? Moon : theme === 'brutal' ? Square : Sun

  return (
    <button
      type="button"
      className="pf-theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  )
}
