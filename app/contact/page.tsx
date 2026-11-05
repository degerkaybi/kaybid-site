import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SectionLayout from '@/components/SectionLayout'
import { getSection } from '@/lib/portfolio'

export const metadata: Metadata = { title: 'Contact' }

export default function ContactPage() {
  const page = getSection('contact')
  if (!page) notFound()
  return <SectionLayout page={page} eyebrow="EIDŌLA" title="Contact" portrait />
}
