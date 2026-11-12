// First frame of a Cloudinary-hosted video as a small JPEG, used as the <video> poster so the file itself is never
// fetched before the visitor presses play. Returns undefined for anything that is not a Cloudinary video upload.
export function videoPoster(src: string): string | undefined {
  const match = src.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/)(.+)\.[a-z0-9]+(?:[?#].*)?$/i)
  return match ? `${match[1]}so_0,w_1000,f_jpg,q_auto/${match[2]}.jpg` : undefined
}
