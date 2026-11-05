'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import PortfolioThemeToggle from '@/components/PortfolioThemeToggle'

const links = [
  ['Works', '/works'],
  ['About', '/about'],
  ['Editions', '/editions'],
  ['Contact', '/hello'],
] as const

export default function PortfolioHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="pf-header">
      <div className="pf-header-inner">
        <Link href="/" className="pf-wordmark" onClick={() => setOpen(false)} aria-label="Kaybid, home">
          Kaybid
        </Link>
        <nav id="pf-main-navigation" className={`pf-nav ${open ? 'is-open' : ''}`} aria-label="Main navigation">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={pathname === href || (href === '/works' && pathname.startsWith('/works/')) || (href === '/about' && pathname.startsWith('/about/')) ? 'is-active' : ''}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="pf-header-actions">
          <PortfolioThemeToggle />
          <button
            type="button"
            className="pf-menu-toggle"
            aria-expanded={open}
            aria-controls="pf-main-navigation"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen(value => !value)}
          >
            <span className="pf-burger" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}
