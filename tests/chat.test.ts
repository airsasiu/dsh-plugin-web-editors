import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  partitionProducedFiles,
  producedFilesForClosing,
  readDeliverables,
  selectChatFiles,
} from '../src/client/chat.ts'
import type { DeliverablesTurnData, ProducedFile } from '../src/client/contract.ts'

function owner(data: Readonly<DeliverablesTurnData> | undefined, seq = 10): TurnTailOwnerProps {
  return {
    seq,
    openFile: () => {},
    turn: {
      data: {
        get: (key: string) => key === 'deliverables' ? data : undefined,
      },
    } as unknown as TurnTailOwnerProps['turn'],
  }
}

function produced(seq: number, path: string): ProducedFile {
  return { seq, path }
}

describe('deliverables reading', () => {
  it('returns undefined when the official data is unavailable', () => {
    assert.equal(readDeliverables(owner(undefined)), undefined)
  })

  it('returns the published deliverables value', () => {
    const data = { produced: [produced(1, 'a.xlsx')] }
    assert.deepEqual(readDeliverables(owner(data))?.produced, data.produced)
  })
})

describe('producedFilesForClosing', () => {
  it('returns an empty list without data', () => {
    assert.deepEqual(producedFilesForClosing(undefined, 10), [])
  })

  it('keeps first-seen order and filters later tool settlements', () => {
    const data = {
      produced: [produced(4, 'a.txt'), produced(11, 'b.xlsx'), produced(5, 'c.md')],
    }
    assert.deepEqual(producedFilesForClosing(data, 10), [
      produced(4, 'a.txt'),
      produced(5, 'c.md'),
    ])
  })

  it('deduplicates repeated writes to the same path', () => {
    const data = {
      produced: [produced(1, 'a.txt'), produced(2, 'a.txt'), produced(3, 'b.txt')],
    }
    assert.deepEqual(producedFilesForClosing(data, 10), [
      produced(1, 'a.txt'),
      produced(3, 'b.txt'),
    ])
  })
})

describe('partitionProducedFiles', () => {
  it('splits supported and unsupported files without changing order', () => {
    const files = [produced(1, 'a.xlsx'), produced(2, 'b.md'), produced(3, 'c.csv')]
    const isSupported = (path: string) => path.endsWith('.xlsx') || path.endsWith('.csv')
    assert.deepEqual(partitionProducedFiles(files, isSupported), {
      supported: [produced(1, 'a.xlsx'), produced(3, 'c.csv')],
      unsupported: [produced(2, 'b.md')],
    })
  })
})

describe('selectChatFiles', () => {
  it('declines when no produced files exist', () => {
    assert.equal(selectChatFiles(owner({ produced: [] }), () => true), null)
    assert.equal(selectChatFiles(owner(undefined), () => true), null)
  })

  it('declines when no produced file has a registered editor', () => {
    assert.equal(selectChatFiles(owner({ produced: [produced(1, 'a.md')] }), () => false), null)
  })

  it('claims mixed turns and carries all produced files', () => {
    const data = {
      produced: [produced(1, 'a.xlsx'), produced(2, 'b.md'), produced(3, 'c.csv')],
    }
    const isSupported = (path: string) => path.endsWith('.xlsx') || path.endsWith('.csv')
    assert.deepEqual(selectChatFiles(owner(data), isSupported), {
      produced: data.produced,
      supported: [produced(1, 'a.xlsx'), produced(3, 'c.csv')],
      unsupported: [produced(2, 'b.md')],
    })
  })
})
