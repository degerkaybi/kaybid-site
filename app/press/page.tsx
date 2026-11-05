import { permanentRedirect } from 'next/navigation'

// Press now lives under About; keep the old address working.
export default function PressRedirect() {
  permanentRedirect('/about/press')
}
