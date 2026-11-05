import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const exportPath = path.join(root, 'data', 'notion-export.json')
const data = JSON.parse(await readFile(exportPath, 'utf8'))
if (!process.env.NOTION_TOKEN) {
  try { process.loadEnvFile(path.join(root, '.env')) } catch {}
}
if (!process.env.NOTION_TOKEN) throw new Error('NOTION_TOKEN is missing from .env')

const targets = []
function findVideos(blocks, pageTitle) {
  for (const block of blocks) {
    if (block.type === 'video' && /(?:youtube\.com|youtu\.be)/.test(data.media[block.video?.mediaId]?.url || '')) {
      targets.push({ block, pageTitle })
    }
    findVideos(block.children || [], pageTitle)
  }
}
for (const page of Object.values(data.pages)) findVideos(page.blocks, page.title)

const updates = []
for (const [index, target] of targets.entries()) {
  const response = await fetch(`https://api.notion.com/v1/blocks/${target.block.id}`, {
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
    },
  })
  if (!response.ok) throw new Error(`Notion block ${target.block.id}: HTTP ${response.status}`)
  const original = await response.json()
  const url = original.video?.external?.url
  if (!url || !/(?:youtube\.com|youtu\.be)/.test(url)) throw new Error(`Not a YouTube external video: ${target.block.id}`)
  const id = createHash('sha256').update(url).digest('hex').slice(0, 20)
  updates.push({ blockId: target.block.id, pageTitle: target.pageTitle, id, url })
  if (index < targets.length - 1) await new Promise(resolve => setTimeout(resolve, 350))
}

console.log(JSON.stringify({
  blocks: targets.length,
  uniqueVideos: new Set(updates.map(item => item.url)).size,
  pages: [...new Set(updates.map(item => item.pageTitle))].length,
  examples: updates.slice(0, 5).map(item => ({ page: item.pageTitle, videoId: new URL(item.url).searchParams.get('v') || new URL(item.url).pathname.split('/').pop() })),
}, null, 2))
if (process.argv.includes('--dry-run')) process.exit(0)

const byBlockId = new Map(updates.map(item => [item.blockId, item]))
function fixBlocks(blocks) {
  for (const block of blocks) {
    const update = byBlockId.get(block.id)
    if (update) block.video.mediaId = update.id
    fixBlocks(block.children || [])
  }
}
for (const page of Object.values(data.pages)) fixBlocks(page.blocks)
for (const update of updates) {
  data.media[update.id] = { id: update.id, url: update.url, source: 'external', mimeType: 'text/html', localPath: null, error: null }
}
const used = new Set()
function collectMedia(blocks) {
  for (const block of blocks) {
    if (block[block.type]?.mediaId) used.add(block[block.type].mediaId)
    collectMedia(block.children || [])
  }
}
for (const page of Object.values(data.pages)) collectMedia(page.blocks)
for (const [id, item] of Object.entries(data.media)) {
  if (/(?:youtube\.com|youtu\.be)/.test(item.url || '') && !used.has(id)) delete data.media[id]
}
await writeFile(exportPath, JSON.stringify(data))
console.log('Raw snapshot updated. Run node scripts/export-notion-content.mjs --sanitize-only next.')
