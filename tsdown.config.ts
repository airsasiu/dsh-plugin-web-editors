/**
 * tsdown build for dsh-plugin-web-editors.
 *
 * Two artifacts (aligned with the harness client bundle preset):
 *  - lib/index.js  — node half (ESM). Minimal Cordis row; the feature lives in
 *    the browser half.
 *  - lib/client.js — browser half (CJS closure factory). Loaded by the
 *    client-modules system through window.__ModuleLoader__.load({id, factory}).
 *    React and the harness module-table rows stay external; the panel stylesheet
 *    is inlined into the bundle.
 */
import { readFile } from 'node:fs/promises'
import type { UserConfig } from 'tsdown'

const PKG_ID = 'dsh-plugin-web-editors'

/** Module-table specifiers the browser bundle resolves at runtime. */
const CLIENT_EXTERNALS = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-runtime',
  '@deepseek-ai/dsh-client-runtime/client',
  '@deepseek-ai/dsh-client-ui-slots',
])

/** Inline any `*.css` import as a raw string module (injected by styles.ts). */
function cssAsText() {
  const PREFIX = '\0dsh-web-editors-css:'
  const SUFFIX = '.mjs'
  return {
    name: 'dsh-web-editors-css-as-text',
    async resolveId(this: any, source: string, importer: string | undefined) {
      if (!source.endsWith('.css') || importer === undefined) return null
      const resolved = await this.resolve(source, importer, { skipSelf: true })
      if (resolved === null) return null
      const fileId = resolved.id
      this.addWatchFile(fileId)
      // Virtual id must NOT end in `.css` or tsdown's css-guard intercepts it.
      return PREFIX + fileId + SUFFIX
    },
    async load(this: any, id: string) {
      if (!id.startsWith(PREFIX)) return null
      const fileId = id.slice(PREFIX.length, -SUFFIX.length)
      const source = await readFile(fileId, 'utf8')
      return `export default ${JSON.stringify(source)}`
    },
  }
}

const nodeHalf: UserConfig = {
  name: PKG_ID,
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2022',
  fixedExtension: false,
  dts: false,
  clean: true,
  sourcemap: true,
  deps: {
    neverBundle: specifier => specifier.startsWith('node:'),
    alwaysBundle: specifier => specifier.startsWith('.'),
  },
}

const clientHalf: UserConfig = {
  name: `${PKG_ID}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  fixedExtension: false,
  dts: false,
  clean: false,
  sourcemap: true,
  deps: {
    neverBundle: specifier => CLIENT_EXTERNALS.has(specifier),
    alwaysBundle: specifier => !CLIENT_EXTERNALS.has(specifier),
  },
  inputOptions: {
    resolve: {
      conditionNames: [
        (process.env.NODE_ENV ?? 'production') === 'development' ? 'development' : 'production',
        'browser', 'import', 'module', 'default',
      ],
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  plugins: [cssAsText()],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PKG_ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default [nodeHalf, clientHalf]
