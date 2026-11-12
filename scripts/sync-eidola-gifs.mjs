// Reads the Eidōla folders from Cloudinary and updates data/eidola-gifs.json.
//
//   KBD/Eidola/SEZON/<season>/<folder>/             one page per folder
//   KBD/Eidola/SEZON/<season>/<folder>/<subfolder>  the pictures of the page's slider, in name order
//                                                   (a folder without subfolders uses its own pictures)
//
// A folder needs no GIF and is never skipped for lacking one. Animated GIFs are not listed: the site does not use them.
// Every per-item field already in the file (cardImageIndex, ...) is kept; only `images` is refreshed.
//
// Usage: node scripts/sync-eidola-gifs.mjs [--write] [S1 S2 S3/HALLOWEN ...]   (default sources: S1 S2 S3/HALLOWEN)
//   Default is a dry run: it prints what would change against the current file and writes nothing.
//   --write  writes data/eidola-gifs.json.
// Each source is a folder under KBD/Eidola/SEZON whose subfolders become pages; only those sources are refreshed.
// "S3/HALLOWEN" feeds the Halloween section, every other source the GIF section.
// Needs CLOUDINARY_URL in .env / .env.local (the Admin API calls here are read-only). The result is committed, so builds
// never need the API secret.
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
const write = process.argv.includes('--write')
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
    const subfolders = (await folders(folder.path)).sort((a, b) => collator.compare(a.name, b.name))
    // The slider holds the pictures of the subfolder(s); a folder without one uses its own pictures.
    const sliderAssets = subfolders.length
      ? (await Promise.all(subfolders.map(sub => assets(sub.path)))).flat()
      : own
    const images = sliderAssets.filter(asset => asset.format !== 'gif').sort((a, b) => collator.compare(sortName(a), sortName(b))).map(picture)
    if (!images.length) console.warn(`warning: ${folder.path} has no pictures`)
    const id = stableId(folder.path)
    const existing = previous.items.find(item => item.id === id)
    // An existing item keeps every field it has (cardImageIndex is set by hand); only its pictures are refreshed.
    items.push(existing ? { ...existing, images } : { id, group, source, season, folder: folder.path, title: titleOf(folder.name), images })
  }
}
items.sort((a, b) => a.season.localeCompare(b.season) || collator.compare(a.title, b.title))

const next = { source: base, items }
const describe = item => `${item.title} (${item.folder})`
const byId = list => new Map(list.map(item => [item.id, item]))
const before = byId(previous.items)
const after = byId(items)
const lines = []
for (const [id, item] of after) if (!before.has(id)) lines.push(`+ added   ${describe(item)}: ${item.images.length} pictures`)
for (const [id, item] of before) if (!after.has(id)) lines.push(`- removed ${describe(item)}`)
for (const [id, item] of after) {
  const old = before.get(id)
  if (!old) continue
  const fields = [...new Set([...Object.keys(old), ...Object.keys(item)])].filter(key => key !== 'images' && JSON.stringify(old[key]) !== JSON.stringify(item[key]))
  const oldUrls = old.images.map(image => image.url)
  const newUrls = item.images.map(image => image.url)
  const gone = oldUrls.filter(url => !newUrls.includes(url))
  const added = newUrls.filter(url => !oldUrls.includes(url))
  const reordered = !gone.length && !added.length && JSON.stringify(oldUrls) !== JSON.stringify(newUrls)
  const sizeChanged = !gone.length && !added.length && JSON.stringify(old.images) !== JSON.stringify(item.images) && !reordered
  if (!fields.length && !gone.length && !added.length && !reordered && !sizeChanged) continue
  lines.push(`~ changed ${describe(item)}`)
  for (const key of fields) lines.push(`    ${key}: ${JSON.stringify(old[key])} -> ${JSON.stringify(item[key])}`)
  for (const url of gone) lines.push(`    - picture ${url}`)
  for (const url of added) lines.push(`    + picture ${url}`)
  if (reordered) lines.push('    pictures reordered')
  if (sizeChanged) lines.push('    picture dimensions changed')
}
const text = `${JSON.stringify(next, null, 2)}\n`
const unchanged = text === `${JSON.stringify(previous, null, 2)}\n`
console.log(lines.length ? lines.join('\n') : 'No difference against data/eidola-gifs.json.')
console.log(`${items.length} pages (${items.reduce((sum, item) => sum + item.images.length, 0)} slider pictures); the file has ${previous.items.length}.`)
if (!write) console.log('Dry run: nothing written. Run again with --write to update data/eidola-gifs.json.')
else if (unchanged) console.log('data/eidola-gifs.json is already up to date.')
else { await writeFile(dataPath, text); console.log('data/eidola-gifs.json written.') }
