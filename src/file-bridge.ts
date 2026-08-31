/**
 * Pure host-side file listing for the generic editor panel.
 * The panel uses this only to discover candidate files; each editor still owns
 * its own read/write bridge.
 */

import { readdir, stat } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'

/** One file surfaced to the editor file picker. */
export interface WebFileEntry {
  /** Basename. */
  name: string
  /** Path relative to the requested root, forward slashes, '' for the root. */
  rel: string
  /** Absolute path on the host. */
  path: string
  /** File size in bytes. */
  size: number
  /** Last-modified epoch millis. */
  mtimeMs: number
}

const SKIPPED_DIRECTORIES = new Set(['.git', 'node_modules'])

/** Normalize an extension to a lower-cased dot-prefixed string. */
export function normalizeHostExtension(extension: string): string {
  const trimmed = extension.trim().toLowerCase()
  if (trimmed === '') return ''
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`
}

/** Forward-slash path used by the client for display and matching. */
function toForward(p: string): string {
  return p.split('\\').join('/')
}

/**
 * Recursively list regular files under `root` whose extension is in
 * `extensions`. Symlinked directories are not followed. `.git` and
 * `node_modules` directories are skipped to keep workspace scans bounded.
 */
export async function listWorkspaceFiles(
  root: string,
  extensions: readonly string[],
): Promise<WebFileEntry[]> {
  const absRoot = resolve(root)
  const wanted = new Set(extensions.map(normalizeHostExtension))
  const out: WebFileEntry[] = []
  const stack = [absRoot]

  while (stack.length > 0) {
    const dir = stack.pop()!
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      if (dir === absRoot) throw new Error(`cannot read directory: ${dir}`)
      continue
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) stack.push(join(dir, entry.name))
        continue
      }
      if (!entry.isFile() || !wanted.has(extname(entry.name).toLowerCase())) continue
      const abs = join(dir, entry.name)
      const info = await stat(abs)
      out.push({
        name: entry.name,
        rel: toForward(relative(absRoot, abs)),
        path: abs,
        size: info.size,
        mtimeMs: info.mtimeMs,
      })
    }
  }

  out.sort((a, b) => a.rel.localeCompare(b.rel))
  return out
}
