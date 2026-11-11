// Lets plain Node (next.config.js, scripts) import the project's TypeScript: resolves the "@/" alias and extensionless
// imports, transpiles .ts/.tsx, wraps .json as modules. Same approach as scripts/url-inventory.mjs.
import { register } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function registerTs() {
  const hooks = `
    import { readFile, access } from 'node:fs/promises'
    import { createRequire } from 'node:module'
    import { fileURLToPath, pathToFileURL } from 'node:url'
    const root = ${JSON.stringify(root)}
    const ts = createRequire(root + '/package.json')('typescript')
    const exists = p => access(p).then(() => true, () => false)
    async function withExtension(file) {
      if (/\\.[a-z]+$/i.test(file) && await exists(file)) return file
      for (const ext of ['.ts', '.tsx', '.js', '.json']) if (await exists(file + ext)) return file + ext
      return null
    }
    export async function resolve(specifier, context, next) {
      let file = null
      if (specifier.startsWith('@/')) file = await withExtension(root + '/' + specifier.slice(2))
      else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
        const base = fileURLToPath(new URL(specifier, context.parentURL))
        if (base.startsWith(root) && !base.includes('node_modules')) file = await withExtension(base)
      }
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
      return next(specifier, context)
    }
    export async function load(url, context, next) {
      if (url.startsWith('file:') && !url.includes('/node_modules/')) {
        if (url.endsWith('.json')) {
          const text = await readFile(fileURLToPath(url), 'utf8')
          return { format: 'module', source: 'export default ' + text, shortCircuit: true }
        }
        if (/\\.tsx?$/.test(url)) {
          const text = await readFile(fileURLToPath(url), 'utf8')
          const out = ts.transpileModule(text, { fileName: url, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } })
          return { format: 'module', source: out.outputText, shortCircuit: true }
        }
      }
      return next(url, context)
    }
  `
  register('data:text/javascript,' + encodeURIComponent(hooks), import.meta.url)
}
