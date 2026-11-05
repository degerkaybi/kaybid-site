import Link from 'next/link'

const tabs = [
  ['about', 'About', '/about'],
  ['exhibitions', 'Exhibitions', '/about/exhibitions'],
  ['press', 'Press', '/about/press'],
] as const

export default function AboutTabs({ current }: { current: (typeof tabs)[number][0] }) {
  return (
    <nav className="pf-subnav" aria-label="About sections">
      {tabs.map(([key, label, href]) => (
        <Link key={key} href={href} aria-current={key === current ? 'page' : undefined} className={key === current ? 'is-active' : ''}>{label}</Link>
      ))}
    </nav>
  )
}
