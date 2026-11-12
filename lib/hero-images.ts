// Pool of photos for the home page hero. One is picked at random on every visit (components/HeroImage.tsx).
// All are from the Silent Steps "On the streets" gallery. Files live in public/hero/<id>-<width>.webp.
// To add a photo: put its webp variants in public/hero and add a line below, listing only the widths that exist
// (never upscale: a 1600 px original gets [900, 1600]). To remove one: delete its line.

export type HeroImage = { id: string; widths: number[] }

export const heroImages: HeroImage[] = [
  { id: 'h01', widths: [900, 1600] },
  { id: 'h02', widths: [900, 1600] },
  { id: 'h03', widths: [900, 1600] },
  { id: 'h04', widths: [900, 1600] },
  { id: 'h05', widths: [900, 1600] },
  { id: 'h06', widths: [900, 1600] },
  { id: 'h07', widths: [900, 1600] },
  { id: 'h08', widths: [900, 1600] },
  { id: 'h09', widths: [900, 1600] },
  { id: 'h10', widths: [900, 1600] },
  { id: 'h11', widths: [900, 1600] },
  { id: 'h12', widths: [900, 1600] },
]

const file = (image: HeroImage, width: number) => `/hero/${image.id}-${width}.webp`

export function heroSrcSet(image: HeroImage): string {
  return image.widths.map(width => `${file(image, width)} ${width}w`).join(', ')
}

// Fallback src for browsers that ignore srcset: the largest variant.
export function heroSrc(image: HeroImage): string {
  return file(image, Math.max(...image.widths))
}
