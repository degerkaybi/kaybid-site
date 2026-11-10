import type { Metadata } from 'next'
import Link from 'next/link'
import { Globe, Instagram, Sticker, Youtube } from 'lucide-react'
import { Archivo, Inter } from 'next/font/google'
import PortfolioHeader from '@/components/PortfolioHeader'
import { getLocale } from '@/lib/locale'
import '@/styles/globals.css'
import '@/styles/portfolio.css'

const display = Archivo({ subsets: ['latin', 'latin-ext'], axes: ['wdth'], variable: '--font-display', display: 'swap' })
const body = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-body', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Kaybid — Artist Portfolio', template: '%s — Kaybid' },
  description: 'Street art, collage, animation, sculpture, painting and sound by Kaybid.',
}

const siteLinks = [
  ['Works', '/works'],
  ['Editions', '/editions'],
  ['About', '/about'],
  ['Exhibitions', '/about/exhibitions'],
  ['Press', '/about/press'],
  ['Contact', '/hello'],
] as const

const followLinks = [
  ['Instagram — @kaybid', 'https://www.instagram.com/kaybid', Instagram],
  ['YouTube — @kaybidlive', 'https://www.youtube.com/@kaybidlive', Youtube],
  ['GIPHY', 'https://giphy.com/Kaybid', Sticker],
  ['kaybid.live', 'http://www.kaybid.live/', Globe],
] as const

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()} className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const savedTheme = localStorage.getItem('theme');
            document.documentElement.dataset.theme =
              savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'brutal' ? savedTheme : 'brutal';
          } catch (error) {
            document.documentElement.dataset.theme = 'brutal';
          }
        ` }} />
      </head>
      <body className="pf-site">
        <a className="pf-skip-link" href="#main-content">Skip to content</a>
        <PortfolioHeader />
        <main id="main-content">{children}</main>
        <footer className="pf-footer">
          <div className="pf-footer-top">
            <Link href="/" className="pf-footer-logo">Kaybid</Link>
            <Link href="/hello" className="pf-footer-contact">Contact <span aria-hidden="true">→</span></Link>
          </div>
          <div className="pf-footer-links">
            <nav aria-label="Site">
              {siteLinks.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
            </nav>
            <nav aria-label="Follow">
              {followLinks.map(([label, href, Icon]) => <a key={href} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></a>)}
            </nav>
          </div>
          <div className="pf-footer-bottom">
            <span>© {new Date().getFullYear()} Kaybid</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
