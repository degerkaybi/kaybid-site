import { notFound, redirect } from 'next/navigation'
import archive from '@/data/portfolio-content.json'
import { getPageHref, slugify, type PortfolioPage } from '@/lib/portfolio'

type Props = { params: Promise<{ slug: string }> }

// Every valid slug is prerendered at build time; unknown slugs are a static 404, never a function call.
export const dynamicParams = false

export function generateStaticParams() {
  const slugs = new Set<string>()
  for (const page of Object.values(archive.pages)) {
    slugs.add(slugify(page.title))
    slugs.add(page.id.replaceAll('-', ''))
  }
  return [...slugs].filter(Boolean).map(slug => ({ slug }))
}

export default async function LegacyPage({ params }: Props) {
  const { slug } = await params
  const page = (Object.values(archive.pages) as PortfolioPage[]).find(
    item => slugify(item.title) === slug || item.id.replaceAll('-', '') === slug
  )
  if (!page) notFound()
  redirect(getPageHref(page))
}
