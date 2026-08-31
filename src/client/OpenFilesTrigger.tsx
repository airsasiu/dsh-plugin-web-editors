/**
 * Session-header trigger for the editor file picker.
 *
 * This is the always-visible entry point when no produced-file chip exists:
 * it opens the panel and the picker directly, instead of requiring a chat
 * file link first.
 */
import type { InjectFace, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { EditorPanelStoreHandle } from './store.ts'

interface OpenFilesTriggerInjected {
  openPicker(): void
  label: string
}

export type OpenFilesTriggerProps =
  & PropsStore<EditorPanelStoreHandle>
  & InjectFace<OpenFilesTriggerInjected>

export function OpenFilesTrigger({
  useStore,
  openPicker,
  label,
}: OpenFilesTriggerProps): React.JSX.Element | null {
  const editorRevision = useStore(state => state.editorRevision)
  if (editorRevision === 0) return null

  return (
    <button
      type="button"
      className="dsh-we-trigger"
      aria-label={label}
      title={label}
      onClick={openPicker}
    >
      {label}
    </button>
  )
}
