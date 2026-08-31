/**
 * Pure chat-turn helpers: read the optional official deliverables value and
 * choose whether this plugin claims the turn-tail chain.
 */
import type { TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ChatFileMatch, DeliverablesTurnData, ProducedFile } from './contract.ts'

interface DeliverablesDataStore {
  get(key: 'deliverables'): Readonly<DeliverablesTurnData> | undefined
}

/**
 * Read the official deliverables value without requiring the deliverables
 * plugin's own declaration merge to be present in this program.
 */
export function readDeliverables(
  owner: TurnTailOwnerProps,
): Readonly<DeliverablesTurnData> | undefined {
  return (owner.turn.data as unknown as DeliverablesDataStore).get('deliverables')
}

/**
 * Files produced before the closing sequence, in first-seen order with paths
 * deduplicated.
 */
export function producedFilesForClosing(
  data: Readonly<DeliverablesTurnData> | undefined,
  seq: number,
): ProducedFile[] {
  if (data === undefined) return []
  const seen = new Set<string>()
  const result: ProducedFile[] = []
  for (const produced of data.produced) {
    if (produced.seq > seq || seen.has(produced.path)) continue
    seen.add(produced.path)
    result.push({ seq: produced.seq, path: produced.path })
  }
  return result
}

/** Split produced files into editor-supported and native-opener entries. */
export function partitionProducedFiles(
  produced: readonly ProducedFile[],
  isSupported: (path: string) => boolean,
): { supported: ProducedFile[]; unsupported: ProducedFile[] } {
  const supported: ProducedFile[] = []
  const unsupported: ProducedFile[] = []
  for (const file of produced) {
    if (isSupported(file.path)) supported.push(file)
    else unsupported.push(file)
  }
  return { supported, unsupported }
}

/**
 * Claim the turn-tail chain only when at least one produced file has a
 * registered editor; the match still carries unsupported files so the row can
 * preserve the chat-provided `openFile` fallback for them.
 */
export function selectChatFiles(
  owner: TurnTailOwnerProps,
  isSupported: (path: string) => boolean,
): ChatFileMatch | null {
  const produced = producedFilesForClosing(readDeliverables(owner), owner.seq)
  if (produced.length === 0) return null
  const { supported, unsupported } = partitionProducedFiles(produced, isSupported)
  if (supported.length === 0) return null
  return { produced, supported, unsupported }
}
