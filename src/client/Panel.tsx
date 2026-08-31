/**
 * Editor panel component. It is registered into both the native
 * `shell.editor` column and the `shell.overlay` compatibility dock; the
 * overlay entry renders nothing once the native column is active.
 */
import type { InjectFace, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { WebFileEditor } from './contract.ts'
import type { EditorLabels } from './labels.ts'
import { basename } from './registry.ts'
import type { EditorPanelStoreHandle } from './store.ts'

/** Registration-side callbacks shared with the panel component. */
export interface EditorPanelInjected {
  resolveEditor(path: string): WebFileEditor | undefined
  labels: EditorLabels
  mode: 'native' | 'overlay'
  isNativeActive(): boolean
}

export type EditorPanelProps = PropsStore<EditorPanelStoreHandle> & InjectFace<EditorPanelInjected> & {
  /** Native shell owner callback; absent in overlay compatibility mode. */
  onClose?: () => void
}

export function EditorPanel({
  useStore,
  actions,
  resolveEditor,
  labels,
  mode,
  isNativeActive,
  onClose,
}: EditorPanelProps): React.JSX.Element | null {
  const open = useStore(state => state.open)
  const files = useStore(state => state.files)
  const activePath = useStore(state => state.activePath)
  const activeRoot = useStore(state => state.activeRoot)
  const status = useStore(state => state.status)
  const statusTone = useStore(state => state.statusTone)
  const editorRevision = useStore(state => state.editorRevision)

  if (mode === 'overlay' && isNativeActive()) return null
  if (!open) return null

  const active = files.find(file => file.path === activePath)
  const editor = activePath === undefined ? undefined : resolveEditor(activePath)

  const closePanel = (): void => {
    actions.close()
    onClose?.()
  }

  const closeActiveFile = (): void => {
    actions.closeActive()
    if (files.length <= 1) onClose?.()
  }

  return (
    <aside
      className="dsh-we-dock"
      data-web-editors-dock
      data-mode={mode}
      data-editor-revision={editorRevision}
    >
      <header className="dsh-we-header">
        <div className="dsh-we-title-wrap">
          <span className="dsh-we-title" title={active?.path}>{active === undefined ? labels.dockTitle : basename(active.path)}</span>
        </div>
        <button
          type="button"
          className="dsh-we-icon-btn"
          aria-label={labels.closeDock}
          title={labels.closeDock}
          onClick={closePanel}
        >
          ×
        </button>
      </header>
      {files.length > 1 && (
        <nav className="dsh-we-tabs" aria-label={labels.files}>
          {files.map(file => (
            <button
              key={file.path}
              type="button"
              className={file.path === activePath ? 'dsh-we-tab dsh-we-tab-active' : 'dsh-we-tab'}
              title={file.path}
              onClick={() => actions.select(file.path)}
            >
              {basename(file.path)}
            </button>
          ))}
        </nav>
      )}
      <div className="dsh-we-body">
        {editor !== undefined && active !== undefined ? (
          <editor.component
            key={active.path}
            path={active.path}
            root={active.root}
            onClose={closeActiveFile}
            onStatus={actions.setStatus}
          />
        ) : (
          <div className="dsh-we-empty">
            {active === undefined ? labels.empty : labels.noEditor}
          </div>
        )}
      </div>
      {status !== '' && (
        <footer className={`dsh-we-status dsh-we-status-${statusTone}`}>{status}</footer>
      )}
    </aside>
  )
}
