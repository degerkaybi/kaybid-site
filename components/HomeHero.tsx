import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import DocumentaryButton from '@/components/DocumentaryButton'
import HeroImage from '@/components/HeroImage'

export default function HomeHero() {
  return (
    <section className="pf-home-hero" aria-labelledby="home-hero-title">
      <HeroImage />
      <div className="pf-home-hero-shade" aria-hidden="true" />
      <div className="pf-home-hero-content">
        <h1 id="home-hero-title">KAYBID</h1>
        <p className="pf-home-hero-subtitle">Street Art | Animation | Traditional Collage</p>
        <p className="pf-home-hero-description">
          Known for the Silent Steps Series, a longterm street art project featuring hand-cut collages of endangered animals, installed across cities worldwide since 2018. Featured: Straat Museum Amsterdam, Paris Olympics 2024, Times Square NYC, WWF partnership.
        </p>
        <div className="pf-home-hero-actions">
          <Link href="/works" className="pf-home-hero-works">Explore All Works <span aria-hidden="true">→</span></Link>
          <DocumentaryButton />
        </div>
      </div>

      <a className="pf-home-hero-scroll" href="#featured-work" aria-label="Scroll down to selected works">
        <ChevronDown size={34} strokeWidth={1.6} aria-hidden="true" />
      </a>
    </section>
  )
}
