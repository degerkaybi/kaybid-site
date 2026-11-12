// Cloudinary migration: uploads the "hazır" records of upload-manifest.json to the NEW account.
//
//   node scripts/migrate-cloudinary.mjs                 dry run (default): lists the pilot set and summarises --all, uploads nothing
//   node scripts/migrate-cloudinary.mjs --pilot         uploads the pilot records, then runs the delivery tests
//   node scripts/migrate-cloudinary.mjs --all --yes     uploads every "hazır" record not already "ok" in the log (restartable)
//   add --dry-run to --pilot / --all to only list what would be uploaded; --verbose prints every line of a dry run
//
// Credentials: ONLY CLOUDINARY_NEW_URL from .env.local. This script never reads .env and never contacts the old account.
// Nothing secret (key, secret, cloud name) is printed or written to the log; every output line goes through redact().
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

const OLD_CLOUD_NAME = 'dlyp8lb1b' // the old account: public in the repo data files; uploads to it are refused
const MiB = 1048576
const CHUNK_SIZE = 20_000_000
const CONCURRENCY = 3
const BASE = path.join(os.homedir(), 'Documents', 'kaybid-yedek', 'cloudinary-eslesme')
const MANIFEST = path.join(BASE, 'upload-manifest.json')
const LOG = path.join(BASE, 'yukleme-gunlugu.json')

const args = new Set(process.argv.slice(2))
const known = new Set(['--pilot', '--all', '--dry-run', '--yes', '--verbose'])
for (const a of args) if (!known.has(a)) { console.error(`Unknown flag: ${a}`); process.exit(2) }
if (args.has('--pilot') && args.has('--all')) { console.error('Use --pilot or --all, not both.'); process.exit(2) }
const mode = args.has('--all') ? 'all' : args.has('--pilot') ? 'pilot' : 'dry'
const dryRun = mode === 'dry' || args.has('--dry-run')
if (mode === 'all' && !dryRun && !args.has('--yes')) { console.error('--all uploads every pending record. Add --yes to confirm (or --dry-run to preview).'); process.exit(2) }

// The pilot set: one record for each risk the full run could hit.
const PILOT = [
  'YIKIM_EKİBİv3-c_fjxkzu',                          // 1 largest video (~58 MB)
  'Persona_By_Kaybid_qzeicj',                        // 2 video ~52 MB
  'Evil_By_Kaybid_soawwp',                           // 3 video ~40 MB
  'IMG_20210711_0046_ti5fl2',                        // 4 image above 25 MP
  '5-04_jd4zzk',                                     // 5 image near the 10 MB limit
  'Up4K_h3uyie',                                     // 6 gif
  'Ekran_görüntüsü_2026-11-05_182012_ysdgc1',        // 7 png screenshot (also a Turkish character)
  'kaybid-portfolio/media/008a0d56b7c147a31b38e033', // 8 webp, "/" in the public_id
  'Yıkım_başlıyor_oqnuki',                           // 9 Turkish characters (ı), video
  '20260310_170913_nszbsc',                          // 10 Monk/Kimo image
]
const POSTER_VIDEOS = ['YIKIM_EKİBİv3-c_fjxkzu', 'Persona_By_Kaybid_qzeicj', 'Evil_By_Kaybid_soawwp']
const MP_IMAGE = 'IMG_20210711_0046_ti5fl2'
const WEBP_ORIGINAL = 'kaybid-portfolio/media/008a0d56b7c147a31b38e033'

// ---------------------------------------------------------------- credentials (CLOUDINARY_NEW_URL only)
function readNewUrl() {
  let text
  try { text = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8') } catch { throw new Error('.env.local not found in the working directory') }
  const line = text.split(/\r?\n/).find(l => /^\s*CLOUDINARY_NEW_URL\s*=/.test(l))
  if (!line) throw new Error('CLOUDINARY_NEW_URL is missing from .env.local')
  const raw = line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
  let url
  try { url = new URL(raw) } catch { throw new Error('CLOUDINARY_NEW_URL is not a valid cloudinary:// URL') }
  if (url.protocol !== 'cloudinary:' || !url.hostname || !url.username || !url.password) throw new Error('CLOUDINARY_NEW_URL must look like cloudinary://<key>:<secret>@<cloud_name>')
  return { cloud_name: url.hostname, api_key: decodeURIComponent(url.username), api_secret: decodeURIComponent(url.password) }
}

let secrets = []
const redact = value => {
  let s = typeof value === 'string' ? value : value instanceof Error ? value.message : JSON.stringify(value)
  for (const secret of secrets) if (secret) s = s.split(secret).join('***')
  return s
}
const say = (...parts) => console.log(redact(parts.join(' ')))

// ---------------------------------------------------------------- manifest + log
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const ready = manifest.items.filter(item => item.durum === 'hazır')
const deferred = manifest.items.filter(item => item.durum === 'ertelendi')
const byId = new Map(ready.map(item => [item.public_id, item]))

function loadLog() {
  try { return JSON.parse(fs.readFileSync(LOG, 'utf8')) } catch { return { version: 1, entries: {} } }
}
const logData = loadLog()
const keyOf = item => `${item.resource_type}/${item.target_public_id}`
function saveLog() {
  logData.updated = new Date().toISOString()
  const tmp = LOG + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(logData, null, 1), 'utf8')
  fs.renameSync(tmp, LOG)
}

const md5File = file => new Promise((resolve, reject) => {
  const hash = crypto.createHash('md5')
  fs.createReadStream(file).on('data', chunk => hash.update(chunk)).on('end', () => resolve(hash.digest('hex'))).on('error', reject)
})

// ---------------------------------------------------------------- selection
let selection
if (mode === 'pilot' || mode === 'dry') {
  selection = PILOT.map(id => {
    const item = byId.get(id)
    if (!item) throw new Error(`Pilot record is not a "hazır" manifest record: ${id}`)
    return item
  })
}
const pending = mode === 'all' ? ready.filter(item => logData.entries[keyOf(item)]?.status !== 'ok') : (selection || []).filter(item => logData.entries[keyOf(item)]?.status !== 'ok')

// ---------------------------------------------------------------- dry run
function describe(item) {
  let size = '-'
  try { const st = fs.statSync(item.local_path); size = st.size === item.bytes ? 'size ok' : `SIZE MISMATCH (local ${st.size})` } catch { size = 'LOCAL FILE MISSING' }
  const method = item.resource_type === 'video' ? 'upload_large 20 MB' : 'upload'
  return `${item.target_public_id} | ${item.resource_type} | folder="${item.target_asset_folder}" | ${(item.bytes / MiB).toFixed(2)} MiB | ${method} | ${size}${item.limit && item.limit !== 'ok' ? ' | ' + item.limit : ''}`
}
function printPlan(items, label) {
  const total = items.reduce((s, i) => s + i.bytes, 0)
  const problems = items.filter(i => { try { return fs.statSync(i.local_path).size !== i.bytes } catch { return true } })
  say(`${label}: ${items.length} records, ${(total / MiB).toFixed(1)} MiB, ${items.filter(i => i.resource_type === 'video').length} via upload_large, local problems: ${problems.length}`)
  if (args.has('--verbose') || items.length <= 12) for (const item of items) say('  ' + describe(item))
  else for (const item of items.slice(0, 5)) say('  ' + describe(item))
}
if (dryRun) {
  say(`DRY RUN — nothing is uploaded. Manifest: ${ready.length} "hazır" (uploadable), ${deferred.length} "ertelendi" (never uploaded).`)
  const done = ready.filter(i => logData.entries[keyOf(i)]?.status === 'ok').length
  say(`Log: ${done} records already "ok".`)
  if (mode === 'dry') { printPlan(selection, 'Pilot set'); printPlan(ready.filter(i => logData.entries[keyOf(i)]?.status !== 'ok'), '--all would upload') }
  else printPlan(pending, mode === 'pilot' ? 'Pilot would upload' : '--all would upload')
  say('Options for every upload: overwrite=false, unique_filename=false, use_filename=false, type=upload; no eager, preset, notification or tagging.')
  process.exit(0)
}

// ---------------------------------------------------------------- real run: configure the NEW account only
delete process.env.CLOUDINARY_URL // the SDK would otherwise pick up whatever account the shell points at
const creds = readNewUrl()
secrets = [creds.api_secret, creds.api_key, creds.cloud_name]
if (creds.cloud_name === OLD_CLOUD_NAME) { console.error('CLOUDINARY_NEW_URL points to the OLD account. Refusing to upload.'); process.exit(3) }
const { v2: cloudinary } = await import('cloudinary')
cloudinary.config({ ...creds, secure: true })

function uploadOnce(item) {
  const options = {
    public_id: item.target_public_id,
    resource_type: item.resource_type,
    type: 'upload',
    overwrite: false,
    unique_filename: false,
    use_filename: false,
  }
  if (item.target_asset_folder) options.asset_folder = item.target_asset_folder
  if (item.resource_type === 'video') {
    return new Promise((resolve, reject) => cloudinary.uploader.upload_large(item.local_path, { ...options, chunk_size: CHUNK_SIZE }, (error, result) => error ? reject(error) : resolve(result)))
  }
  return cloudinary.uploader.upload(item.local_path, options)
}

const retryable = error => { const code = error?.http_code; return !code || code >= 500 || code === 420 || code === 429 }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const errorText = error => redact(`${error?.http_code ? `HTTP ${error.http_code}: ` : ''}${error?.error?.message || error?.message || String(error)}`)

let folderMode = null // 'dynamic' once any response carries asset_folder
async function processItem(item, position, total) {
  const started = Date.now()
  const key = keyOf(item)
  const entry = { public_id: item.target_public_id, resource_type: item.resource_type, asset_folder: item.target_asset_folder, bytes: item.bytes, at: new Date().toISOString() }
  try {
    const st = fs.statSync(item.local_path)
    if (st.size !== item.bytes) throw new Error(`local size ${st.size} differs from manifest ${item.bytes}`)
    const localMd5 = await md5File(item.local_path)
    if (localMd5 !== item.etag_md5) throw new Error('local MD5 differs from the manifest etag')
    let result, lastError
    for (let attempt = 0; attempt < 3; attempt++) {
      try { result = await uploadOnce(item); lastError = null; break } catch (error) {
        lastError = error
        if (!retryable(error) || attempt === 2) break
        await sleep(attempt === 0 ? 3000 : 10000)
      }
    }
    if (lastError) throw lastError
    if ('asset_folder' in result) folderMode = 'dynamic'
    const checks = {
      public_id: result.public_id === item.target_public_id,
      resource_type: result.resource_type === item.resource_type,
      asset_folder: 'asset_folder' in result ? (result.asset_folder || '') === (item.target_asset_folder || '') : (item.target_asset_folder || '') === '',
      bytes: result.bytes === st.size,
      etag: result.etag === localMd5,
    }
    Object.assign(entry, { status: Object.values(checks).every(Boolean) ? 'ok' : 'dogrulama-hatasi', checks, existing: result.existing === true, version: result.version, format: result.format, asset_id: result.asset_id,
      remote_bytes: result.bytes, remote_asset_folder: 'asset_folder' in result ? result.asset_folder : '(alan yok: klasör modu dynamic olmayabilir)', width: result.width, height: result.height })
    if (entry.status !== 'ok') entry.error = 'mismatch: ' + Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name).join(', ')
  } catch (error) {
    Object.assign(entry, { status: 'hata', error: errorText(error) })
  }
  entry.seconds = +((Date.now() - started) / 1000).toFixed(1)
  logData.entries[key] = entry
  saveLog()
  say(`[${position}/${total}] ${entry.status === 'ok' ? 'OK   ' : entry.status === 'hata' ? 'ERROR' : 'CHECK'} ${item.target_public_id} (${(item.bytes / MiB).toFixed(2)} MiB, ${entry.seconds}s)${entry.error ? ' — ' + entry.error : ''}${entry.existing ? ' [already existed]' : ''}`)
  return entry
}

async function runPool(items) {
  let next = 0
  const results = []
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await processItem(items[index], index + 1, items.length)
    }
  }))
  return results
}

say(`${mode === 'pilot' ? 'PILOT' : 'ALL'}: uploading ${pending.length} record(s) (${(pending.reduce((s, i) => s + i.bytes, 0) / MiB).toFixed(1)} MiB), concurrency ${CONCURRENCY}, chunk ${CHUNK_SIZE / 1e6} MB for videos.`)
const results = await runPool(pending)

// ---------------------------------------------------------------- pilot: delivery tests on the new account
async function probe(url) {
  try {
    const response = await fetch(url, { redirect: 'follow' })
    const out = { status: response.status, contentType: response.headers.get('content-type'), length: response.headers.get('content-length'), cldError: response.headers.get('x-cld-error') }
    await response.body?.cancel()
    return out
  } catch (error) { return { status: 'network error', cldError: errorText(error) } }
}
const enc = id => id.split('/').map(encodeURIComponent).join('/')
const fmt = r => redact(`HTTP ${r.status}${r.contentType ? ', ' + r.contentType : ''}${r.length ? ', ' + r.length + ' B' : ''}${r.cldError ? ', x-cld-error: ' + r.cldError : ''}`)
const tests = {}
if (mode === 'pilot') {
  const base = `https://res.cloudinary.com/${creds.cloud_name}`
  const done = id => logData.entries[`${byId.get(id).resource_type}/${id}`]
  say('\n--- delivery tests (new account) ---')
  tests.poster = {}
  for (const id of POSTER_VIDEOS) {
    if (done(id)?.status !== 'ok') { say(`a) poster ${id}: skipped (not uploaded ok)`); continue }
    tests.poster[id] = await probe(`${base}/video/upload/so_0,w_1000,f_jpg,q_auto/${enc(id)}.jpg`)
    say(`a) poster so_0,w_1000,f_jpg,q_auto  ${id}: ${fmt(tests.poster[id])}`)
  }
  if (done(MP_IMAGE)?.status === 'ok') { tests.mp = await probe(`${base}/image/upload/w_1200,f_auto,q_auto/${enc(MP_IMAGE)}.jpg`); say(`b) 25 MP image w_1200,f_auto,q_auto  ${MP_IMAGE}: ${fmt(tests.mp)}`) } else say(`b) skipped (${MP_IMAGE} not uploaded ok)`)
  const webp = done(WEBP_ORIGINAL)
  if (webp?.status === 'ok') { tests.webp = await probe(`${base}/image/upload/v${webp.version}/${enc(WEBP_ORIGINAL)}.${webp.format}`); say(`c) webp original delivery  ${WEBP_ORIGINAL}: ${fmt(tests.webp)}`) } else say('c) skipped (webp not uploaded ok)')
  try {
    const usage = await cloudinary.api.usage()
    tests.usage = { plan: usage.plan, storage_MiB: +(usage.storage?.usage / MiB).toFixed(1), resources: usage.resources }
    say(`usage (new account): plan ${usage.plan}, storage ${tests.usage.storage_MiB} MiB, resources ${usage.resources}`)
  } catch (error) { say('usage: could not be read — ' + errorText(error)) }
  logData.pilotTests = tests
  saveLog()
}

// ---------------------------------------------------------------- summary
const outcomes = results.reduce((o, r) => { o[r.status] = (o[r.status] || 0) + 1; return o }, {})
const uploadedBytes = results.filter(r => r.status === 'ok' || r.status === 'dogrulama-hatasi').reduce((s, r) => s + r.bytes, 0)
say(`\nSummary: ${JSON.stringify(outcomes)}; folder mode: ${folderMode || 'unknown (no response carried asset_folder)'}; uploaded in this run ≈ ${(uploadedBytes / MiB).toFixed(1)} MiB`)
const failed = results.filter(r => r.status !== 'ok')
if (failed.length) { say('Problems:'); for (const r of failed) say(`  ${r.public_id} [${r.status}]: ${r.error}`) }
process.exit(failed.length ? 1 : 0)
