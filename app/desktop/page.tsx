import type { Metadata } from 'next'
import WorkDesktop from '@/components/WorkDesktop'
import { desktopFilters, getDesktopWorks } from '@/lib/desktop'

export const metadata: Metadata = { title: 'Desktop' }

export default function DesktopPage() {
  return <WorkDesktop works={getDesktopWorks()} filters={desktopFilters} />
}
