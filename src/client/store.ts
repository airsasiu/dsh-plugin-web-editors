/** Shared panel view-state store for the overlay dock. */

// Namespace import: the runtime client entry is a __ModuleLoader__ closure
// (CJS), which rolldown cannot statically extract named exports from. The
// namespace form resolves to `require(...)` + property access, matching how
// the harness's own client bundles consume it.
import * as runtime from '@deepseek-ai/dsh-client-runtime/client'
import type { WebFileEditorStatusTone } from './contract.ts'

/** One file opened in the dock. */
export interface OpenedFile {
  path: string
  root?: string
}

/** Root-scoped view state shared by the dock entries. */
export interface EditorPanelState {
  open: boolean
  files: OpenedFile[]
  activePath: string | undefined
  activeRoot: string | undefined
  status: string
  statusTone: WebFileEditorStatusTone
  editorRevision: number
}

/** Store factory (handle is constructed in apply and shared by dock entries). */
export const createEditorPanelStore = () => runtime.defineStore({
  init: (): EditorPanelState => ({
    open: false,
    files: [],
    activePath: undefined,
    activeRoot: undefined,
    status: '',
    statusTone: 'idle',
    editorRevision: 0,
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
      state.status = ''
      state.statusTone = 'idle'
    },
    select(state, path: string) {
      const file = state.files.find(candidate => candidate.path === path)
      if (file === undefined) return
      state.activePath = file.path
      state.activeRoot = file.root
      state.status = ''
      state.statusTone = 'idle'
    },
    close(state) {
      state.open = false
    },
    closeActive(state) {
      const closing = state.activePath
      if (closing === undefined) {
        state.open = false
        return
      }
      const remaining = state.files.filter(file => file.path !== closing)
      state.files = remaining
      if (remaining.length === 0) {
        state.activePath = undefined
        state.activeRoot = undefined
        state.open = false
        return
      }
      const next = remaining.at(-1)
      state.activePath = next?.path
      state.activeRoot = next?.root
      state.status = ''
      state.statusTone = 'idle'
    },
    setStatus(state, status: string, tone: WebFileEditorStatusTone = 'idle') {
      state.status = status
      state.statusTone = tone
    },
    bumpEditors(state) {
      state.editorRevision += 1
    },
  },
})

export type EditorPanelStoreHandle = ReturnType<typeof createEditorPanelStore>
