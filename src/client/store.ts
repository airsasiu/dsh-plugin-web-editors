/** Shared panel view-state store for the overlay dock. */

// Namespace import: the runtime client entry is a __ModuleLoader__ closure
// (CJS), which rolldown cannot statically extract named exports from. The
// namespace form resolves to `require(...)` + property access, matching how
// the harness's own client bundles consume it.
import * as runtime from '@deepseek-ai/dsh-client-runtime/client'
import type { WebFileEditorStatusTone } from './contract.ts'
import { OVERLAY_WIDTH_DEFAULT } from './dock-size.ts'

/** One file opened in the dock. */
export interface OpenedFile {
  path: string
  root?: string
}

/** Root-scoped view state shared by the dock entries. */
export interface EditorPanelState {
  open: boolean
  pickerOpen: boolean
  pickerRoot: string | undefined
  files: OpenedFile[]
  activePath: string | undefined
  activeRoot: string | undefined
  status: string
  statusTone: WebFileEditorStatusTone
  editorRevision: number
  overlayWidth: number
}

/** Session-scoped state for the always-visible header entry. */
export interface EditorTriggerState {
  editorCount: number
}

/** Overlay dock sizing. Native `shell.editor` owns its column width. */

/** Store factory (handle is constructed in apply and shared by dock entries). */
export const createEditorPanelStore = () => runtime.defineStore({
  init: (): EditorPanelState => ({
    open: false,
    pickerOpen: false,
    pickerRoot: undefined,
    files: [],
    activePath: undefined,
    activeRoot: undefined,
    status: '',
    statusTone: 'idle',
    editorRevision: 0,
    overlayWidth: OVERLAY_WIDTH_DEFAULT,
  }),
  actions: {
    open(state, path: string, root?: string) {
      const existing = state.files.find(file => file.path === path)
      const next = existing === undefined
        ? [...state.files, { path, root }]
        : state.files.map(file => file.path === path ? { ...file, root: root ?? file.root } : file)
      state.files = next
      state.activePath = path
      state.activeRoot = root ?? existing?.root
      state.open = true
      state.pickerOpen = false
      state.status = ''
      state.statusTone = 'idle'
    },
    select(state, path: string) {
      const file = state.files.find(candidate => candidate.path === path)
      if (file === undefined) return
      state.activePath = file.path
      state.activeRoot = file.root
      state.pickerOpen = false
      state.status = ''
      state.statusTone = 'idle'
    },
    close(state) {
      state.open = false
      state.pickerOpen = false
    },
    closeActive(state) {
      const closing = state.activePath
      if (closing === undefined) {
        state.open = false
        state.pickerOpen = false
        return
      }
      const remaining = state.files.filter(file => file.path !== closing)
      state.files = remaining
      if (remaining.length === 0) {
        state.activePath = undefined
        state.activeRoot = undefined
        state.open = false
        state.pickerOpen = false
        return
      }
      const next = remaining.at(-1)
      state.activePath = next?.path
      state.activeRoot = next?.root
      state.pickerOpen = false
      state.status = ''
      state.statusTone = 'idle'
    },
    setStatus(state, status: string, tone: WebFileEditorStatusTone = 'idle') {
      state.status = status
      state.statusTone = tone
    },
    setPickerOpen(state, pickerOpen: boolean, root?: string) {
      state.pickerOpen = pickerOpen
      if (root !== undefined && root !== '') state.pickerRoot = root
      if (pickerOpen) {
        state.open = true
        state.status = ''
        state.statusTone = 'idle'
      }
    },
    setOverlayWidth(state, width: number) {
      state.overlayWidth = width
    },
    bumpEditors(state) {
      state.editorRevision += 1
    },
  },
})

/** Store factory for session-scoped header actions. */
export const createEditorTriggerStore = () => runtime.defineStore({
  init: (): EditorTriggerState => ({
    editorCount: 0,
  }),
  actions: {
    setEditorCount(state, editorCount: number) {
      state.editorCount = editorCount
    },
  },
})

export type EditorPanelStoreHandle = ReturnType<typeof createEditorPanelStore>
export type EditorTriggerStoreHandle = ReturnType<typeof createEditorTriggerStore>
