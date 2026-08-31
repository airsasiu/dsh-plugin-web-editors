/**
 * dsh-plugin-web-editors — browser half.
 *
 * Contributions:
 *  - `webFileEditors` service — editor registry plus panel opener;
 *  - `shell.editor`           — native right panel when DSH exposes it;
 *  - `shell.overlay`          — docked right-panel fallback for older DSH;
 *  - `conversation.session.header.actions` — always-visible picker trigger;
 *  - `conversation.chat.turnTail` — produced-file row for supported extensions.
 *
 * Slot types come from the published harness packages; at runtime only react
 * and the harness module-table rows (@deepseek-ai/dsh-client-runtime/client)
 * are external, all resolved by the client module table.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import { ChatLinks } from './ChatLinks.tsx'
import { EditorPanel } from './Panel.tsx'
import { OpenFilesTrigger } from './OpenFilesTrigger.tsx'
import { selectChatFiles } from './chat.ts'
import type { WebFileEditors } from './contract.ts'
import { browserLocale, labelsFor } from './labels.ts'
import { createEditorRegistry } from './registry.ts'
import {
  createEditorPanelStore,
  createEditorTriggerStore,
  type EditorPanelStoreHandle,
  type EditorTriggerStoreHandle,
} from './store.ts'
import { injectStyles } from './styles.ts'

export const name = 'dsh-plugin-web-editors'

/** Client plugin config. */
export interface Config {
  /** Use the overlay dock even when the shell declares `shell.editor`. */
  preferOverlay?: boolean
}

/** Required service: the slot registry (provided by dsh-client-runtime). */
export const inject = ['slots']

export function apply(ctx: Context, config: Config = {}): void {
  const preferOverlay = config.preferOverlay === true
  const store = createEditorPanelStore()
  const triggerStore = createEditorTriggerStore()
  const registry = createEditorRegistry()
  const labels = labelsFor(browserLocale())
  let panelActions: BoundActions<EditorPanelStoreHandle> | undefined
  let triggerActions: BoundActions<EditorTriggerStoreHandle> | undefined
  let nativeActive = false
  const pendingOpens: Array<{ path: string; root?: string }> = []

  const notifyEditorsChanged = (): void => {
    panelActions?.bumpEditors()
    triggerActions?.setEditorCount(registry.size)
  }

  const service: WebFileEditors = {
    register(editor) {
      const disposer = registry.register(editor)
      notifyEditorsChanged()
      return () => {
        disposer()
        notifyEditorsChanged()
      }
    },
    tryOpen(request) {
      if (registry.find(request.path) === undefined) return Promise.resolve(false)
      if (panelActions === undefined) pendingOpens.push(request)
      else panelActions.open(request.path, request.root)
      if (nativeActive) {
        const layout = ctx.get('layout') as { openEditor?: () => void } | undefined
        layout?.openEditor?.()
      }
      return Promise.resolve(true)
    },
  }

  ctx.effect(() => ctx.provide('webFileEditors', service), 'dsh-plugin-web-editors: webFileEditors service')
  ctx.effect(() => injectStyles(), 'dsh-plugin-web-editors: styles')

  const panelInject = (actions: BoundActions<EditorPanelStoreHandle>, mode: 'native' | 'overlay') => {
    panelActions = actions
    actions.bumpEditors()
    for (const request of pendingOpens) actions.open(request.path, request.root)
    pendingOpens.length = 0
    return {
      resolveEditor: (path: string) => registry.find(path),
      supportedExtensions: () => registry.extensions(),
      labels,
      mode,
      isNativeActive: () => nativeActive,
    }
  }

  // Native mode: only runs when the running shell declares shell.editor and
  // the deployment has not forced the plugin-only overlay dock.
  if (!preferOverlay) {
    ctx.slots.inject('shell.editor', () => {
      nativeActive = true
      return ctx.slots.register({
        name: 'shell.editor',
        store,
        inject: (actions: BoundActions<EditorPanelStoreHandle>) => panelInject(actions, 'native'),
      }, EditorPanel)
    })
  }

  // Compatibility mode: older DSH shells still get the docked overlay panel.
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'web-editors.dock',
    order: 110,
    store,
    inject: (actions: BoundActions<EditorPanelStoreHandle>) => panelInject(actions, 'overlay'),
  }, EditorPanel))

  // Always-visible entry point: opens the panel and file picker even when no
  // produced-file chip exists. It appears once an editor registers.
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'web-editors.open',
    order: 90,
    store: triggerStore,
    inject: (_sessionId, actions: BoundActions<EditorTriggerStoreHandle>) => {
      triggerActions = actions
      actions.setEditorCount(registry.size)
      return {
        openPicker: (root?: string) => {
          panelActions?.setPickerOpen(true, root)
        },
        label: labels.openFile,
      }
    },
  }, OpenFilesTrigger))

  // Claim the chain before ui-deliverables' generic row when this plugin can
  // open at least one file; unsupported files still route through openFile.
  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail',
    priority: -10,
    select: (owner: TurnTailOwnerProps) => selectChatFiles(owner, path => registry.find(path) !== undefined),
    inject: () => ({
      openEditor: (path: string, root?: string) => {
        void service.tryOpen({ path, root })
      },
      labels,
    }),
  }, ChatLinks))
}
