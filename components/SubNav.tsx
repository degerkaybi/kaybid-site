import Link from 'next/link'

export type SubNavTab = { key: string; label: string; href: string }

// The tab row used under a page title: About / Exhibitions / Press, Silent Steps / More about the series.
export default function SubNav({ tabs, current, label }: { tabs: SubNavTab[]; current: string; label: string }) {
  return (
    <nav className="pf-subnav" aria-label={label}>
      {tabs.map(tab => (
        <Link key={tab.key} href={tab.href} aria-current={tab.key === current ? 'page' : undefined} className={tab.key === current ? 'is-active' : ''}>{tab.label}</Link>
      ))}
    </nav>
  )
}
