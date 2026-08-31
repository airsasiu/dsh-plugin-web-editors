import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { WebFileEditor } from '../src/client/contract.ts'
import {
  basename,
  createEditorRegistry,
  editorForPath,
  extensionOf,
  normalizeExtension,
} from '../src/client/registry.ts'

const component = (() => null) as unknown as WebFileEditor['component']

function editor(id: string, extensions: readonly string[]): WebFileEditor {
  return { id, title: id, extensions, component }
}

describe('path matching', () => {
  it('extracts lower-cased dot extensions', () => {
    assert.equal(extensionOf('src/data/Report.XLSX'), '.xlsx')
    assert.equal(extensionOf('C:\\tmp\\data.csv'), '.csv')
    assert.equal(extensionOf('archive.tar.gz'), '.gz')
  })

  it('returns no extension for extension-less and dotfile paths', () => {
    assert.equal(extensionOf('README'), '')
    assert.equal(extensionOf('src/.env'), '')
    assert.equal(extensionOf('dir/'), '')
  })

  it('normalizes editor extensions to dot-prefixed lowercase', () => {
    assert.equal(normalizeExtension('xlsx'), '.xlsx')
    assert.equal(normalizeExtension('.CSV'), '.csv')
    assert.equal(normalizeExtension(' .JSON '), '.json')
    assert.equal(normalizeExtension(''), '')
  })

  it('finds a basename across slash and backslash separators', () => {
    assert.equal(basename('a/b/c.ts'), 'c.ts')
    assert.equal(basename('C:\\a\\b.txt'), 'b.txt')
    assert.equal(basename('plain.md'), 'plain.md')
  })

  it('matches an editor by path extension', () => {
    const editors = [editor('sheet', ['xlsx']), editor('text', ['.md', 'txt'])]
    assert.equal(editorForPath(editors, 'a/b/report.xlsx')?.id, 'sheet')
    assert.equal(editorForPath(editors, 'notes.TXT')?.id, 'text')
  })

  it('returns undefined when no editor handles the extension', () => {
    assert.equal(editorForPath([editor('sheet', ['xlsx'])], 'notes.md'), undefined)
    assert.equal(editorForPath([editor('sheet', ['xlsx'])], 'README'), undefined)
  })
})

describe('editor registry', () => {
  it('registers, finds, and disposes an editor', () => {
    const registry = createEditorRegistry()
    const disposer = registry.register(editor('sheet', ['xlsx']))
    assert.equal(registry.size, 1)
    assert.equal(registry.find('a.xlsx')?.id, 'sheet')
    disposer()
    assert.equal(registry.size, 0)
    assert.equal(registry.find('a.xlsx'), undefined)
  })

  it('replaces an entry when the same id registers again', () => {
    const registry = createEditorRegistry()
    const oldDisposer = registry.register(editor('sheet', ['xlsx']))
    const newDisposer = registry.register(editor('sheet', ['csv']))
    assert.equal(registry.find('a.xlsx'), undefined)
    assert.equal(registry.find('b.csv')?.id, 'sheet')
    oldDisposer()
    assert.equal(registry.find('b.csv')?.id, 'sheet')
    newDisposer()
    assert.equal(registry.size, 0)
  })

  it('fails loudly when another id claims an owned extension', () => {
    const registry = createEditorRegistry()
    registry.register(editor('first', ['xlsx']))
    assert.throws(() => registry.register(editor('second', ['xlsx'])), /already handles/)
    assert.equal(registry.find('a.xlsx')?.id, 'first')
    assert.equal(registry.size, 1)
  })

  it('allows the owning id to reclaim its extension during replacement', () => {
    const registry = createEditorRegistry()
    registry.register(editor('sheet', ['xlsx']))
    const disposer = registry.register(editor('sheet', ['xlsx', 'csv']))
    assert.equal(registry.find('a.xlsx')?.id, 'sheet')
    assert.equal(registry.find('b.csv')?.id, 'sheet')
    disposer()
    assert.equal(registry.size, 0)
  })

  it('enumerates the normalized claimed extensions', () => {
    const registry = createEditorRegistry()
    registry.register(editor('sheet', ['xlsx', '.CSV']))
    registry.register(editor('json', ['json']))
    assert.deepEqual(new Set(registry.extensions()), new Set(['.xlsx', '.csv', '.json']))
    const disposer = registry.register(editor('sheet', ['xlsx', 'sjs']))
    assert.deepEqual(new Set(registry.extensions()), new Set(['.xlsx', '.sjs', '.json']))
    disposer()
    assert.deepEqual(new Set(registry.extensions()), new Set(['.json']))
  })
})
