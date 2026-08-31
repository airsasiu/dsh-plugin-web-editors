import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { listWorkspaceFiles, normalizeHostExtension } from '../src/file-bridge.ts'

describe('host file bridge', () => {
  it('normalizes extensions for matching', () => {
    assert.equal(normalizeHostExtension('xlsx'), '.xlsx')
    assert.equal(normalizeHostExtension('.CSV'), '.csv')
    assert.equal(normalizeHostExtension(' .JSON '), '.json')
    assert.equal(normalizeHostExtension(''), '')
  })

  it('lists only requested extensions and skips ignored directories', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-we-files-'))
    try {
      await writeFile(join(root, 'a.xlsx'), 'x')
      await writeFile(join(root, 'notes.md'), 'x')
      await mkdir(join(root, '.git'))
      await writeFile(join(root, '.git', 'ignored.xlsx'), 'x')
      await mkdir(join(root, 'node_modules'))
      await writeFile(join(root, 'node_modules', 'ignored.csv'), 'x')
      await mkdir(join(root, 'nested'))
      await writeFile(join(root, 'nested', 'b.csv'), 'x')

      const files = await listWorkspaceFiles(root, ['xlsx', 'csv'])
      assert.deepEqual(
        files.map(file => file.rel),
        ['a.xlsx', 'nested/b.csv'],
      )
      assert.ok(files.every(file => file.path.startsWith(root)))
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('returns an empty list when no extension matches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-we-empty-'))
    try {
      await writeFile(join(root, 'a.xlsx'), 'x')
      const files = await listWorkspaceFiles(root, ['md'])
      assert.deepEqual(files, [])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
