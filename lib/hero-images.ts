// Pool of photos for the home page hero. One is picked at random on every visit (components/HeroImage.tsx).
// h01-h16 are from the Silent Steps "On the streets" gallery, h17+ from the hand-picked photos in public/hero/hero_/. Files live in public/hero/<id>-<width>.webp.
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
  { id: 'h13', widths: [900, 1440] },
  { id: 'h14', widths: [900, 1600] },
  { id: 'h15', widths: [900, 1600] },
  { id: 'h16', widths: [900, 1600] },
  { id: 'h17', widths: [900, 1600, 2400] },
  { id: 'h18', widths: [900, 1600, 2400] },
  { id: 'h19', widths: [900, 1600, 2400] },
  { id: 'h20', widths: [900, 1600] },
  { id: 'h21', widths: [900, 1600, 2400] },
  { id: 'h22', widths: [900, 1600, 2400] },
  { id: 'h23', widths: [900, 1600, 2400] },
  { id: 'h24', widths: [900, 1600, 2400] },
  { id: 'h25', widths: [900, 1600, 2400] },
  { id: 'h26', widths: [900, 1600, 2400] },
  { id: 'h27', widths: [900, 1600, 2400] },
  { id: 'h28', widths: [900, 1600, 2400] },
  { id: 'h29', widths: [900, 1600, 2400] },
  { id: 'h30', widths: [900, 1600, 2400] },
  { id: 'h31', widths: [900, 1600, 2400] },
  { id: 'h32', widths: [900, 1600, 2400] },
  { id: 'h33', widths: [900, 1600, 2400] },
  { id: 'h34', widths: [900, 1600, 2400] },
  { id: 'h35', widths: [900, 1600, 2400] },
  { id: 'h36', widths: [900, 1600, 2400] },
  { id: 'h37', widths: [900, 1600, 2400] },
  { id: 'h38', widths: [900, 1600] },
  { id: 'h39', widths: [900, 1600] },
  { id: 'h40', widths: [900, 1600] },
  { id: 'h41', widths: [900, 1600] },
  { id: 'h42', widths: [900, 1600, 2400] },
  { id: 'h43', widths: [900, 1600, 2400] },
  { id: 'h44', widths: [900, 1600, 2400] },
  { id: 'h45', widths: [900, 1600, 2400] },
  { id: 'h46', widths: [900, 1600, 2400] },
  { id: 'h47', widths: [900, 1600, 2400] },
  { id: 'h48', widths: [900, 1600, 2400] },
  { id: 'h49', widths: [900, 1600, 2400] },
]

const file = (image: HeroImage, width: number) => `/hero/${image.id}-${width}.webp`

export function heroSrcSet(image: HeroImage): string {
  return image.widths.map(width => `${file(image, width)} ${width}w`).join(', ')
}

// Fallback src for browsers that ignore srcset: the largest variant.
export function heroSrc(image: HeroImage): string {
  return file(image, Math.max(...image.widths))
}
