/**
 * Editor panel component. It is registered into both the native
 * `shell.editor` column and the `shell.overlay` compatibility dock; the
 * overlay entry renders nothing once the native column is active.
 */
import type { InjectFace, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import { useCallback, useEffect, useState } from 'react'
import type { WebFileEditor } from './contract.ts'
import {
  buildFileListUrl,
  filterFileEntries,
  type WebFileEntry,
} from './files.ts'
import type { EditorLabels } from './labels.ts'
import { basename } from './registry.ts'
import {
  clampOverlayWidth,
  OVERLAY_KEYBOARD_STEP,
  OVERLAY_WIDTH_MAX,
  OVERLAY_WIDTH_MIN,
} from './dock-size.ts'
import type { EditorPanelStoreHandle } from './store.ts'

/** Registration-side callbacks shared with the panel component. */
export interface EditorPanelInjected {
  resolveEditor(path: string): WebFileEditor | undefined
  supportedExtensions(): readonly string[]
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
  supportedExtensions,
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
  const overlayWidth = useStore(state => state.overlayWidth)
  const pickerOpen = useStore(state => state.pickerOpen)
  const pickerRoot = useStore(state => state.pickerRoot)
  const [resizing, setResizing] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [pickerEntries, setPickerEntries] = useState<WebFileEntry[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerError, setPickerError] = useState('')

  useEffect(() => {
    if (pickerOpen) {
      setPickerQuery('')
      setPickerEntries([])
      setPickerError('')
    }
  }, [pickerOpen])

  useEffect(() => {
    if (!pickerOpen || supportedExtensions().length === 0) return
    let alive = true
    setPickerLoading(true)
    setPickerError('')
    void fetch(buildFileListUrl(pickerRoot ?? activeRoot, supportedExtensions()))
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json() as { files?: WebFileEntry[] }
        if (alive) setPickerEntries(data.files ?? [])
      })
      .catch(error => {
        if (alive) setPickerError(error instanceof Error ? error.message : String(error))
      })
      .finally(() => {
        if (alive) setPickerLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activeRoot, pickerOpen, pickerRoot, supportedExtensions])

  const applyWidthFromPointer = useCallback((clientX: number): void => {
    if (typeof window === 'undefined') return
    actions.setOverlayWidth(clampOverlayWidth(window.innerWidth - clientX, window.innerWidth))
  }, [actions])

  const startResize = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setResizing(true)
  }, [])

  const moveResize = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
    if (!resizing) return
    applyWidthFromPointer(event.clientX)
  }, [applyWidthFromPointer, resizing])

  const stopResize = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
    if (!resizing) return
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    setResizing(false)
  }, [resizing])

  const resizeByKey = useCallback((event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (typeof window === 'undefined') return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const step = event.key === 'ArrowLeft' ? OVERLAY_KEYBOARD_STEP : -OVERLAY_KEYBOARD_STEP
      actions.setOverlayWidth(clampOverlayWidth(overlayWidth + step, window.innerWidth))
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const target = event.key === 'Home' ? OVERLAY_WIDTH_MAX : OVERLAY_WIDTH_MIN
      actions.setOverlayWidth(clampOverlayWidth(target, window.innerWidth))
    }
  }, [actions, overlayWidth])

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

  const openPicker = (): void => {
    actions.setPickerOpen(true)
  }

  const closePicker = (): void => actions.setPickerOpen(false)

  const pickFile = (file: WebFileEntry): void => {
    actions.open(file.path, pickerRoot ?? activeRoot)
  }

  const hasSupportedExtensions = supportedExtensions().length > 0
  const pickedFiles = filterFileEntries(pickerEntries, pickerQuery)

  const overlayStyle = mode === 'overlay'
    ? ({ '--dsh-we-width': `${overlayWidth}px` } as React.CSSProperties)
    : undefined

  return (
    <aside
      className="dsh-we-dock"
      data-web-editors-dock
      data-mode={mode}
      data-editor-revision={editorRevision}
      style={overlayStyle}
    >
      {mode === 'overlay' && (
        <div
          role="separator"
          aria-label={labels.resizeDock}
          aria-orientation="vertical"
          aria-valuemax={OVERLAY_WIDTH_MAX}
          aria-valuemin={OVERLAY_WIDTH_MIN}
          aria-valuenow={overlayWidth}
          tabIndex={0}
          className="dsh-we-resize"
          data-resizing={resizing || undefined}
          onKeyDown={resizeByKey}
          onLostPointerCapture={() => setResizing(false)}
          onPointerCancel={stopResize}
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={stopResize}
        />
      )}
      <header className="dsh-we-header">
        <div className="dsh-we-title-wrap">
          <span className="dsh-we-title" title={active?.path}>{active === undefined ? labels.dockTitle : basename(active.path)}</span>
        </div>
        <button
          type="button"
          className="dsh-we-icon-btn dsh-we-open-btn"
          aria-label={labels.openFile}
          title={labels.openFile}
          disabled={!hasSupportedExtensions}
          onClick={openPicker}
        >
          {labels.openFile}
        </button>
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
      {pickerOpen && (
        <div
          className="dsh-we-picker-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) closePicker()
          }}
        >
          <section
            className="dsh-we-picker"
            role="dialog"
            aria-modal="true"
            aria-label={labels.openFile}
          >
            <header className="dsh-we-picker-header">
              <input
                type="search"
                autoFocus
                value={pickerQuery}
                placeholder={labels.searchFiles}
                aria-label={labels.searchFiles}
                onChange={event => setPickerQuery(event.target.value)}
              />
              <button
                type="button"
                className="dsh-we-icon-btn"
                aria-label={labels.closeFilePicker}
                title={labels.closeFilePicker}
                onClick={closePicker}
              >
                ×
              </button>
            </header>
            <div className="dsh-we-picker-body">
              {pickerLoading
                ? <p className="dsh-we-picker-note">{labels.loadingFiles}</p>
                : pickerError !== ''
                  ? <p className="dsh-we-picker-error">{pickerError}</p>
                  : pickedFiles.length === 0
                    ? <p className="dsh-we-picker-note">{labels.noFiles}</p>
                    : (
                      <ul className="dsh-we-picker-list">
                        {pickedFiles.map(file => (
                          <li key={file.path}>
                            <button
                              type="button"
                              title={file.path}
                              onClick={() => pickFile(file)}
                            >
                              <span className="dsh-we-picker-name">{file.name}</span>
                              <span className="dsh-we-picker-path">{file.rel}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
            </div>
          </section>
        </div>
      )}
    </aside>
  )
}
