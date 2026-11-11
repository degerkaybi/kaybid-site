import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const data = JSON.parse(await readFile(path.join(root, 'data', 'notion-export.json'), 'utf8'))
const pages = Object.values(data.pages)
const media = Object.values(data.media)
const publicFiles = await readdir(path.join(root, 'public', 'media'))
const sourceFiles = await readdir(path.join(root, '.media-source'))

async function totalBytes(dir, names) {
  let bytes = 0
  for (const name of names) bytes += (await stat(path.join(dir, name))).size
  return bytes
}

function host(url) {
  try { return new URL(url).hostname } catch { return 'unknown' }
}

const byHost = {}
for (const item of media) byHost[host(item.url)] = (byHost[host(item.url)] || 0) + 1
const failed = media.filter(item => item.error)
function findMedia(blocks, mediaId) {
  for (const block of blocks) {
    const value = block[block.type]
    if (value?.mediaId === mediaId) return { type: block.type, caption: value.caption?.map(part => part.plain_text).join('') || '' }
    const nested = findMedia(block.children || [], mediaId)
    if (nested) return nested
  }
  return null
}
const works = data.pages[data.roots.works]
const volta = pages.find(page => page.title.includes('Volta'))

console.log(JSON.stringify({
  pages: pages.length,
  mainWorks: works.blocks.filter(block => block.type === 'child_page').length,
  voltaChildren: volta?.blocks.filter(block => block.type === 'child_page').length,
  media: media.length,
  succeeded: media.length - failed.length,
  failed: failed.map(item => ({ id: item.id, host: host(item.url), error: item.error, pages: pages.map(page => ({ title: page.title, match: findMedia(page.blocks, item.id) })).filter(entry => entry.match) })),
  byHost: Object.entries(byHost).sort((a, b) => b[1] - a[1]).slice(0, 12),
  publicFiles: publicFiles.length,
  publicBytes: await totalBytes(path.join(root, 'public', 'media'), publicFiles),
  sourceFiles: sourceFiles.length,
  sourceBytes: await totalBytes(path.join(root, '.media-source'), sourceFiles),
}, null, 2))
