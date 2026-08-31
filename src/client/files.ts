/**
 * Client helpers for the generic editor file picker.
 */

import { normalizeExtension } from './registry.ts'

/** One file listed by the host `/web-editors/api/list` endpoint. */
export interface WebFileEntry {
  name: string
  rel: string
  path: string
  size: number
  mtimeMs: number
}

/** Build the file-list URL for a root and the registered editor extensions. */
export function buildFileListUrl(
  root: string | undefined,
  extensions: readonly string[],
): string {
  const params = new URLSearchParams()
  if (root !== undefined && root !== '') params.set('root', root)
  const normalized = extensions
    .map(normalizeExtension)
    .filter(extension => extension !== '')
  if (normalized.length > 0) params.set('extensions', normalized.join(','))
  return `/web-editors/api/list?${params.toString()}`
}

/** Case-insensitive basename/path filter for the picker. */
export function filterFileEntries(
  entries: readonly WebFileEntry[],
  query: string,
): WebFileEntry[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return entries.slice()
  return entries.filter(entry =>
    entry.name.toLowerCase().includes(needle)
    || entry.path.toLowerCase().includes(needle)
    || entry.rel.toLowerCase().includes(needle))
}
