// Whether an animated picture may play. Only a fine hover pointer (a mouse) may start it, and never under reduced motion.
// Checked when the pointer arrives, so nothing animated is requested before a hover and touch screens never ask for it at all.
export function canPlayGif(): boolean {
  if (typeof window === 'undefined') return false
  return !window.matchMedia('(hover: none), (pointer: coarse), (prefers-reduced-motion: reduce)').matches
}
