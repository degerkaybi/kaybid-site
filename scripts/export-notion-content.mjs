import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const outputDir = path.join(root, 'data')
const mediaDir = path.join(root, 'public', 'media')
const sourceDir = path.join(root, '.media-source')
const mediaOnly = process.argv.includes('--media-only')
const sanitizeOnly = process.argv.includes('--sanitize-only')
const addMissing = process.argv.includes('--add-missing')
const downloadMedia = process.argv.includes('--media') || mediaOnly

const pageSeeds = [
  ['home', '7479b648-3c7c-47d1-a4b1-6ec3c3b15060'],
  ['about', '8401785badf840e99bb988a5e63eacb8'],
  ['works', '302392488fe580d4824accf5851dfe96'],
  ['art-ideas', '32345bd70e2d4156a30b399acd23c897'],
  ['press', '226392488fe580429c7fd774798d9c8a'],
  ['contact', '22a392488fe580f9a70bffa187853f6d'],
]

function dashed(id) {
  const clean = id.replaceAll('-', '')
  return clean.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5')
}

function getTitle(page) {
  const titleProperty = Object.values(page.properties || {}).find(value => value.type === 'title')
  return titleProperty?.title?.map(part => part.plain_text).join('') || 'Untitled'
}

async function getToken() {
  if (process.env.NOTION_TOKEN) return process.env.NOTION_TOKEN
  const env = await readFile(path.join(root, '.env'), 'utf8')
  const match = env.match(/^NOTION_TOKEN=(.*)$/m)
  if (!match) throw new Error('NOTION_TOKEN is missing')
  return match[1].trim().replace(/^['"]|['"]$/g, '')
}

const token = await getToken()
let nextRequestAt = 0

async function notionGet(endpoint) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const pause = Math.max(0, nextRequestAt - Date.now())
    if (pause) await new Promise(resolve => setTimeout(resolve, pause))
    nextRequestAt = Date.now() + 380
    const response = await fetch(`https://api.notion.com/v1/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
      },
    })
    if (response.status === 429 || response.status >= 500) {
      const retryAfter = Number(response.headers.get('retry-after') || 1)
      await new Promise(resolve => setTimeout(resolve, Math.max(retryAfter * 1000, 1000 * 2 ** attempt)))
      continue
    }
    if (!response.ok) throw new Error(`${endpoint}: ${response.status} ${await response.text()}`)
    return response.json()
  }
  throw new Error(`${endpoint}: retry limit reached`)
}

async function listChildren(blockId) {
  const results = []
  let cursor
  do {
    const params = new URLSearchParams({ page_size: '100' })
    if (cursor) params.set('start_cursor', cursor)
    const response = await notionGet(`blocks/${dashed(blockId)}/children?${params}`)
    results.push(...response.results)
    cursor = response.next_cursor
  } while (cursor)
  return results
}

const pages = {}
const media = new Map()
const errors = []

function recordMedia(holder, key) {
  const value = holder?.[key]
  if (!value || !['file', 'external'].includes(value.type)) return
  const url = value[value.type]?.url
  if (!url) return
  const stableUrl = value.type === 'file' ? url.split('?')[0] : url
  const id = createHash('sha256').update(stableUrl).digest('hex').slice(0, 20)
  if (!media.has(id)) media.set(id, { id, url, source: value.type, mimeType: null, localPath: null, error: null })
  value.mediaId = id
  delete value.file
  delete value.external
}

function captureMedia(object) {
  if (!object) return
  if (object.cover) recordMedia(object, 'cover')
  if (object.icon?.type === 'file' || object.icon?.type === 'external') recordMedia(object, 'icon')
  if (['image', 'video', 'file', 'pdf', 'audio'].includes(object.type)) recordMedia(object, object.type)
}

async function hydrateBlocks(blockId) {
  const blocks = await listChildren(blockId)
  for (const block of blocks) {
    captureMedia(block)
    if (block.has_children && !['child_page', 'child_database'].includes(block.type)) {
      block.children = await hydrateBlocks(block.id)
    }
  }
  return blocks
}

function childPages(blocks) {
  return blocks.flatMap(block => [
    ...(block.type === 'child_page' ? [block.id] : []),
    ...childPages(block.children || []),
  ])
}

async function visitPage(pageId, parentId = null) {
  const id = dashed(pageId)
  if (pages[id]) return
  try {
    const page = await notionGet(`pages/${id}`)
    captureMedia(page)
    const blocks = await hydrateBlocks(id)
    pages[id] = {
      id,
      parentId,
      title: getTitle(page),
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
      cover: page.cover || null,
      icon: page.icon || null,
      blocks,
    }
    process.stdout.write(`page ${Object.keys(pages).length}: ${pages[id].title}\n`)
    for (const childId of childPages(blocks)) await visitPage(childId, id)
  } catch (error) {
    errors.push({ id, message: String(error) })
    process.stderr.write(`failed ${id}: ${error}\n`)
  }
}

if (mediaOnly || sanitizeOnly || addMissing) {
  const existing = JSON.parse(await readFile(path.join(outputDir, 'notion-export.json'), 'utf8'))
  Object.assign(pages, existing.pages)
  for (const [id, item] of Object.entries(existing.media)) media.set(id, item)
  errors.push(...existing.errors)
  if (addMissing) {
    // Pages nested inside columns/callouts were skipped by earlier exports; fetch just those.
    for (const page of Object.values({ ...pages })) {
      for (const childId of childPages(page.blocks)) await visitPage(childId, page.id)
    }
  }
} else {
  for (const [, id] of pageSeeds) await visitPage(id)
}

const suffixByMime = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
  'audio/mpeg': '.mp3',
  'application/pdf': '.pdf',
}

function detectMime(bytes, reported) {
  if (bytes.subarray(0, 3).toString() === 'GIF') return 'image/gif'
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg'
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png'
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp'
  if (bytes.subarray(0, 4).toString() === '%PDF') return 'application/pdf'
  if (bytes.subarray(4, 8).toString() === 'ftyp') return 'video/mp4'
  return reported
}

if (downloadMedia) {
  await mkdir(mediaDir, { recursive: true })
  await mkdir(sourceDir, { recursive: true })
  const items = [...media.values()].filter(item => !item.localPath)
  let cursor = 0
  let complete = 0
  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor++]
      try {
        const response = await fetch(item.url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const bytes = Buffer.from(await response.arrayBuffer())
        const reported = response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream'
        const mimeType = detectMime(bytes, reported)
        const ext = suffixByMime[mimeType] || path.extname(new URL(item.url).pathname) || '.bin'
        const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 24)
        await writeFile(path.join(sourceDir, `${hash}${ext}`), bytes)
        let publicBytes = bytes
        let publicExt = ext
        if (mimeType.startsWith('image/') && mimeType !== 'image/svg+xml') {
          try {
            publicBytes = await sharp(bytes, { animated: mimeType === 'image/gif', limitInputPixels: 268402689 })
              .resize({ width: 1600, withoutEnlargement: true })
              .webp({ quality: 82, effort: 3 })
              .toBuffer()
            publicExt = '.webp'
          } catch (error) {
            process.stderr.write(`using original for ${item.id}: ${error}\n`)
          }
        }
        const filename = `${hash}${publicExt}`
        await writeFile(path.join(mediaDir, filename), publicBytes)
        item.mimeType = mimeType
        item.localPath = `/media/${filename}`
        item.bytes = bytes.length
        item.publicBytes = publicBytes.length
        item.sourceFile = `${hash}${ext}`
        item.error = null
      } catch (error) {
        item.error = String(error)
        errors.push({ mediaId: item.id, message: String(error) })
        process.stderr.write(`media failed ${item.id}: ${error}\n`)
      }
      complete++
      if (complete % 20 === 0 || complete === items.length) process.stdout.write(`media ${complete}/${items.length}\n`)
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => worker()))
}

await mkdir(outputDir, { recursive: true })
const exportData = {
  exportedAt: new Date().toISOString(),
  roots: Object.fromEntries(pageSeeds.map(([slug, id]) => [slug, dashed(id)])),
  pages,
  media: Object.fromEntries(media),
  errors: [
    ...errors.filter(error => error.id),
    ...[...media.values()].filter(item => item.error).map(item => ({ mediaId: item.id, message: item.error })),
  ],
}
await writeFile(path.join(outputDir, 'notion-export.json'), JSON.stringify(exportData))
const siteData = structuredClone(exportData)
for (const item of Object.values(siteData.media)) {
  if (item.source === 'external' && /^https:\/\/i\.imgur\.com\//.test(item.url || '')) {
    item.localPath = null
    continue
  }
  if (item.mimeType === 'text/html' && item.source === 'external') {
    item.localPath = null
    continue
  }
  if (item.localPath || item.source === 'file') delete item.url
}
await writeFile(path.join(outputDir, 'portfolio-content.json'), JSON.stringify(siteData))
process.stdout.write(`done: ${Object.keys(pages).length} pages, ${media.size} media, ${exportData.errors.length} errors\n`)
