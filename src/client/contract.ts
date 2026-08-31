/**
 * Public client contract for the generic web file editor framework.
 */
import type { ComponentType } from 'react'

/** Status tone carried to an editor through `onStatus`. */
export type WebFileEditorStatusTone = 'idle' | 'busy' | 'error'

/** Request used by `webFileEditors.tryOpen`. */
export interface WebFileEditorRequest {
  /** Absolute path after session workspace resolution. */
  path: string
  /** Session cwd when known; used by the editor as a browse root. */
  root?: string
}

/** Props handed to a registered editor component. */
export interface WebFileEditorViewProps {
  path: string
  root?: string
  onClose: () => void
  onStatus?: (status: string, tone?: WebFileEditorStatusTone) => void
}

/** One extension-handling editor registration. */
export interface WebFileEditor {
  id: string
  title: string
  extensions: readonly string[]
  component: ComponentType<WebFileEditorViewProps>
}

/** Client service provided by this plugin for DSH core or editor plugins. */
export interface WebFileEditors {
  register(editor: WebFileEditor): () => void
  tryOpen(request: WebFileEditorRequest): Promise<boolean>
}

/** One file produced by a completed turn. */
export interface ProducedFile {
  readonly seq: number
  readonly path: string
}

/** Official deliverables turn data published by the deliverables plugin. */
export interface DeliverablesTurnData {
  readonly produced: readonly ProducedFile[]
}

/** Matched turn-tail content: all produced files plus the supported split. */
export interface ChatFileMatch {
  readonly produced: readonly ProducedFile[]
  readonly supported: readonly ProducedFile[]
  readonly unsupported: readonly ProducedFile[]
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Optional editor seam DSH core may consult before native file opening. */
    webFileEditors: WebFileEditors
  }
}
