/**
 * Turn-tail produced-files row. Supported files open the editor dock;
 * unsupported files use the chat-provided `openFile` so the official
 * deliverables behavior is preserved.
 */
import type { TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { ChatFileMatch } from './contract.ts'
import type { EditorLabels } from './labels.ts'
import { interpolate } from './labels.ts'
import { basename } from './registry.ts'

/** Registration-side callbacks shared with the turn-tail row. */
export interface ChatLinksInjected {
  openEditor: (path: string, root?: string) => void
  labels: EditorLabels
}

export type ChatLinksProps = Pick<TurnTailOwnerProps, 'openFile'> & {
  matched: ChatFileMatch
} & InjectFace<ChatLinksInjected>

export function ChatLinks({
  matched,
  openFile,
  openEditor,
  labels,
}: ChatLinksProps): React.JSX.Element {
  const supported = new Set(matched.supported.map(file => file.path))
  return (
    <div className="dsh-we-chat" data-web-editors-chat>
      <span className="dsh-we-chat-label">{labels.produced}</span>
      <div className="dsh-we-chat-row">
        {matched.produced.map(file => {
          const inEditor = supported.has(file.path)
          const name = basename(file.path)
          return (
            <button
              key={file.path}
              type="button"
              className={inEditor ? 'dsh-we-chat-file dsh-we-chat-file-editor' : 'dsh-we-chat-file'}
              title={file.path}
              aria-label={interpolate(inEditor ? labels.openInEditor : labels.openWithNative, name)}
              onClick={() => {
                if (inEditor) openEditor(file.path)
                else openFile(file.path)
              }}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
