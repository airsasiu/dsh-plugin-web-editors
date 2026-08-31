import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildFileListUrl, filterFileEntries, type WebFileEntry } from '../src/client/files.ts'

const entry = (path: string, name?: string): WebFileEntry => ({
  name: name ?? path.split('/').pop() ?? path,
  rel: path,
  path,
  size: 1,
  mtimeMs: 1,
})

describe('file picker client helpers', () => {
  it('builds a list URL with normalized extensions', () => {
    assert.equal(
      buildFileListUrl('C:\\work', ['xlsx', '.CSV']),
      '/web-editors/api/list?root=C%3A%5Cwork&extensions=.xlsx%2C.csv',
    )
    assert.equal(buildFileListUrl(undefined, ['xlsx']), '/web-editors/api/list?extensions=.xlsx')
    assert.equal(buildFileListUrl('C:\\work', []), '/web-editors/api/list?root=C%3A%5Cwork')
  })

  it('filters by basename or path case-insensitively', () => {
    const entries = [entry('a/Report.xlsx'), entry('b/notes.csv')]
    assert.deepEqual(filterFileEntries(entries, 'REPORT'), [entries[0]])
    assert.deepEqual(filterFileEntries(entries, 'notes'), [entries[1]])
    assert.deepEqual(filterFileEntries(entries, '  '), entries)
    assert.deepEqual(filterFileEntries(entries, 'missing'), [])
  })
})
