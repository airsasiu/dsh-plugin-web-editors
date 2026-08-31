/**
 * Pure extension matching and editor registry for `webFileEditors`.
 */
import type { WebFileEditor } from './contract.ts'

/** Extension claim registry used by the client service. */
export interface EditorRegistry {
  readonly size: number
  register(editor: WebFileEditor): () => void
  find(path: string): WebFileEditor | undefined
}

/**
 * Lower-cased extension including the dot, or `''` when the path has none.
 * A dotfile's leading dot is not treated as an extension.
 */
export function extensionOf(path: string): string {
  const separator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  const name = separator === -1 ? path : path.slice(separator + 1)
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return ''
  return name.slice(dot).toLowerCase()
}

/** Normalize an editor extension to a lower-cased dot-prefixed string. */
export function normalizeExtension(extension: string): string {
  const trimmed = extension.trim().toLowerCase()
  if (trimmed === '') return ''
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`
}

/** Trailing path segment, supporting slash and backslash separators. */
export function basename(path: string): string {
  const separator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return separator === -1 ? path : path.slice(separator + 1)
}

/** Find the first editor whose normalized extensions contain the path's extension. */
export function editorForPath(
  editors: readonly WebFileEditor[],
  path: string,
): WebFileEditor | undefined {
  const extension = extensionOf(path)
  if (extension === '') return undefined
  return editors.find(editor => editor.extensions.some(candidate => normalizeExtension(candidate) === extension))
}

/**
 * Create a registry with replacement semantics for duplicate ids:
 * re-registering an id replaces the old entry, while a different id claiming
 * an already-owned extension fails loudly.
 */
export function createEditorRegistry(): EditorRegistry {
  const byId = new Map<string, WebFileEditor>()
  const extensionToId = new Map<string, string>()
  const disposers = new Map<string, () => void>()

  const clearEditor = (id: string): void => {
    const editor = byId.get(id)
    if (editor === undefined) return
    byId.delete(id)
    for (const extension of editor.extensions) {
      const normalized = normalizeExtension(extension)
      if (extensionToId.get(normalized) === id) extensionToId.delete(normalized)
    }
    disposers.delete(id)
  }

  function register(editor: WebFileEditor): () => void {
    const extensions = editor.extensions.map(normalizeExtension)
    for (const extension of extensions) {
      const owner = extensionToId.get(extension)
      if (owner !== undefined && owner !== editor.id) {
        throw new Error(`editor "${owner}" already handles "${extension}"`)
      }
    }
    clearEditor(editor.id)
    byId.set(editor.id, editor)
    for (const extension of extensions) extensionToId.set(extension, editor.id)
    let disposed = false
    const disposer = (): void => {
      if (disposed) return
      if (disposers.get(editor.id) !== disposer) return
      disposed = true
      clearEditor(editor.id)
    }
    disposers.set(editor.id, disposer)
    return disposer
  }

  function find(path: string): WebFileEditor | undefined {
    const extension = extensionOf(path)
    if (extension === '') return undefined
    const id = extensionToId.get(extension)
    return id === undefined ? undefined : byId.get(id)
  }

  return {
    get size() {
      return byId.size
    },
    register,
    find,
  }
}
