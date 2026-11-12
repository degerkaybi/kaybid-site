// Reads the Eidōla GIF folders from Cloudinary and writes data/eidola-gifs.json.
//
//   KBD/Eidola/SEZON/<season>/<gif folder>/            the GIF (cover + top of the page)
//   KBD/Eidola/SEZON/<season>/<gif folder>/<subfolder>  the pictures of the page's slider, in name order
//
// Usage: node scripts/sync-eidola-gifs.mjs [S1 S2 S3/HALLOWEN ...]   (default: S1 S2 S3/HALLOWEN)
// Each argument is a folder under KBD/Eidola/SEZON whose subfolders become pages; only those sources are refreshed.
// "S3/HALLOWEN" feeds the Halloween section, every other source the GIF section.
// Needs CLOUDINARY_URL in .env / .env.local. The result is committed, so builds never need the API secret.
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { v2 as cloudinary } from 'cloudinary'

// Cloudinary's errors carry the request, API key and secret included: print the message only.
process.on('uncaughtException', error => {
  console.error('Sync failed:', error?.error?.message || error?.message || 'unknown error')
  process.exit(1)
})

const root = process.cwd()
const base = 'KBD/Eidola/SEZON'
const groups = { 'S3/HALLOWEN': 'halloween' }
const sources = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
if (!sources.length) sources.push('S1', 'S2', 'S3/HALLOWEN')

if (!process.env.CLOUDINARY_URL) {
  for (const name of ['.env.local', '.env']) {
    try { process.loadEnvFile(path.join(root, name)) } catch {}
    if (process.env.CLOUDINARY_URL) break
  }
}
if (!process.env.CLOUDINARY_URL) throw new Error('CLOUDINARY_URL is missing. Put it in the ignored .env file.')
const cloudinaryUrl = new URL(process.env.CLOUDINARY_URL)
cloudinary.config({
  cloud_name: cloudinaryUrl.hostname,
  api_key: decodeURIComponent(cloudinaryUrl.username),
  api_secret: decodeURIComponent(cloudinaryUrl.password),
  secure: true,
})

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })
// "Eidola_16_f3kfpb" -> "Eidola_16": Cloudinary appends a random suffix to every upload.
const sortName = asset => (asset.display_name || asset.public_id).replace(/_[a-z0-9]{6}$/, '')
const picture = asset => ({ url: asset.secure_url, width: asset.width, height: asset.height })

async function folders(folder) {
  const found = []
  let next
  do {
    const page = await cloudinary.api.sub_folders(folder, { max_results: 500, ...(next ? { next_cursor: next } : {}) })
    found.push(...page.folders)
    next = page.next_cursor
  } while (next)
  return found
}

async function assets(folder) {
  const found = []
  let next
  do {
    const page = await cloudinary.api.resources_by_asset_folder(folder, { max_results: 500, ...(next ? { next_cursor: next } : {}) })
    found.push(...page.resources.filter(asset => asset.resource_type === 'image'))
    next = page.next_cursor
  } while (next)
  return found
}

const stableId = folder => {
  const hash = createHash('sha1').update(folder).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}
// "-Charm" -> "Charm", "zz-Skull" -> "Skull", "xxx-Anger_By_Kaybid" -> "Anger", "Love_Heart_by_Kaybid" -> "Love Heart":
// the dash and the zz-/xxx- prefixes only sort the folders in Cloudinary, and "By Kaybid" is the credit on every film.
const titleOf = name => {
  const title = name
    .replace(/^(?:x{2,}|z{2,})[-_\s]+/i, '')
    .replace(/^[\s\-–_]+/, '')
    .replace(/[_\s]*by[_\s]*kaybid$/i, '')
    .replace(/_+/g, ' ')
    .trim()
  return title || name
}

const dataPath = path.join(root, 'data', 'eidola-gifs.json')
const previous = JSON.parse(await readFile(dataPath, 'utf8').catch(() => '{"items":[]}'))
// Only the requested sources are fetched again; everything already in the file stays as it is.
const items = previous.items.filter(item => !sources.includes(item.source || item.season))
for (const source of sources) {
  const season = source.split('/')[0]
  const group = groups[source] || 'gif'
  for (const folder of await folders(`${base}/${source}`)) {
    const own = await assets(folder.path)
    const gifs = own.filter(asset => asset.format === 'gif').sort((a, b) => b.created_at.localeCompare(a.created_at))
    const subfolders = (await folders(folder.path)).sort((a, b) => collator.compare(a.name, b.name))
    // The slider holds the pictures of the subfolder(s); a folder without one uses its own pictures.
    const sliderAssets = subfolders.length
      ? (await Promise.all(subfolders.map(sub => assets(sub.path)))).flat()
      : own.filter(asset => asset.format !== 'gif')
    const images = sliderAssets.filter(asset => asset.format !== 'gif').sort((a, b) => collator.compare(sortName(a), sortName(b))).map(picture)
    const gif = gifs[0] ? picture(gifs[0]) : null
    // A folder without a GIF has no cover to show, so it gets no page (for now).
    if (!gif) { console.warn(`skipped ${folder.path}: no GIF`); continue }
    if (gifs.length > 1) console.warn(`${folder.path}: ${gifs.length} GIFs, using the newest (${gifs[0].display_name})`)
    const id = stableId(folder.path)
    // cardImageIndex is set by hand in the file: keep it when a source is refreshed.
    const cardImageIndex = previous.items.find(item => item.id === id)?.cardImageIndex
    items.push({ id, group, source, season, folder: folder.path, title: titleOf(folder.name), ...(cardImageIndex === undefined ? {} : { cardImageIndex }), gif, images })
  }
}
items.sort((a, b) => a.season.localeCompare(b.season) || collator.compare(a.title, b.title))

await writeFile(dataPath, `${JSON.stringify({ source: base, items }, null, 2)}\n`)
console.log(`${items.length} pages written to data/eidola-gifs.json (${items.reduce((sum, item) => sum + item.images.length, 0)} slider pictures)`)
