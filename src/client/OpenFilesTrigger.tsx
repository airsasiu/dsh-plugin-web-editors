/**
 * Session-header trigger for the editor file picker.
 *
 * This is the always-visible entry point when no produced-file chip exists:
 * it opens the panel and the picker directly, instead of requiring a chat
 * file link first. It passes the current session cwd so the picker scans the
 * user's workspace even when no file has been opened yet.
 */
import type {
  InjectFace,
  PropsStore,
  StandardPropsOf,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { EditorPanelStoreHandle } from './store.ts'

interface OpenFilesTriggerInjected {
  openPicker(root?: string): void
  label: string
}

export type OpenFilesTriggerProps =
  & PropsStore<EditorPanelStoreHandle>
  & StandardPropsOf<'conversation.session.header.actions'>
  & InjectFace<OpenFilesTriggerInjected>

export function OpenFilesTrigger({
  useStore,
  useSessions,
  sessionId,
  openPicker,
  label,
}: OpenFilesTriggerProps): React.JSX.Element | null {
  const editorRevision = useStore(state => state.editorRevision)
  const cwd = useSessions(state => sessionId === undefined
    ? undefined
    : state.byId[sessionId]?.cwd)
  if (editorRevision === 0) return null

  return (
    <button
      type="button"
      className="dsh-we-trigger"
      aria-label={label}
      title={label}
      onClick={() => openPicker(cwd)}
    >
      {label}
    </button>
  )
}
