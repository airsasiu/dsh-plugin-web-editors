import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { openNativeFile } from '../src/client/open-native.ts'

describe('native file opener', () => {
  it('reports synchronous failures without rethrowing', () => {
    let failed: string | undefined
    openNativeFile('a.txt', () => {
      throw new Error('boom')
    }, path => {
      failed = path
    })
    assert.equal(failed, 'a.txt')
  })

  it('reports rejected promises without rethrowing', async () => {
    let failed: string | undefined
    openNativeFile('a.txt', () => Promise.reject(new Error('missing')), path => {
      failed = path
    })
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.equal(failed, 'a.txt')
  })

  it('does not report when the opener succeeds', async () => {
    let failed: string | undefined
    openNativeFile('a.txt', () => Promise.resolve(), path => {
      failed = path
    })
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.equal(failed, undefined)
  })
})
