import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Say hello' }

const channels = [
  { label: 'EMAIL', value: 'degerkaybi@gmail.com', href: 'mailto:degerkaybi@gmail.com' },
  { label: 'INSTAGRAM', value: '@kaybid', href: 'https://www.instagram.com/kaybid' },
  { label: 'YOUTUBE', value: '@kaybidlive', href: 'https://www.youtube.com/@kaybidlive' },
] as const

export default function HelloPage() {
  return (
    <div className="pf-page-shell pf-section-page">
      <div className="pf-page-hero">
        <p className="pf-eyebrow">GET IN TOUCH</p>
        <h1>Contact</h1>
        <p>For exhibitions, projects, collaborations or questions.</p>
      </div>
      <div className="pf-section-body">
        <ul className="pf-contact-list">
          {channels.map(channel => (
            <li key={channel.label}>
              <a href={channel.href} {...(channel.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                <span>{channel.label}</span>
                <strong>{channel.value}</strong>
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
