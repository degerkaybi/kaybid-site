// Still frames for animated pictures. Pure string work, so server pages and client components share it.

// Cloudinary renders the first frame with "pg_1"; the small width keeps it light and f_auto/q_auto pick a modern format.
// The extension is forced to .jpg so the result is always a single still, never an animated format.
export const cloudinaryStill = (url: string) => url.replace('/upload/', '/upload/pg_1,w_800,f_auto,q_auto/').replace(/\.\w+$/, '.jpg')

// Imgur serves the first frame of any GIF as a JPEG (up to 1024 px) when "h.jpg" is requested.
export function imgurStill(url: string): string | null {
  const match = url.match(/^(https:\/\/i\.imgur\.com\/\w+)\.gif$/)
  return match ? `${match[1]}h.jpg` : null
}
