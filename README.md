# dsh-plugin-web-editors

[中文 README](README.zh-CN.md)

A plugin-only [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI package that turns registered file editors into a docked right-side editor panel. It works on a stock DSH Web profile without a DSH core fork, PR branch, or patched installation.

It provides:

- `webFileEditors`, the client service used by editor plugins and the editor panel.
- A full-height right panel through `shell.overlay`, with a resizable drag handle.
- A file picker that scans the workspace root and lists only extensions owned by a registered editor, so users can open existing files without waiting for a chat-produced file link.
- An always-visible `Open file` button in the session header when at least one editor is registered; it opens the panel and picker directly.
- A `conversation.chat.turnTail` row for produced files whose extension has a registered editor. Unsupported produced files still use the chat-provided `openFile`, so the official deliverables behavior is preserved.

The generic framework contains no SpreadJS/GrapeCity code. Editor plugins (for example `dsh-plugin-spreadjs-editor`) register their own components through `webFileEditors`.

## Public API

The client service is exported for type use through `dsh-plugin-web-editors/client` and provided at runtime as `ctx.webFileEditors`:

```ts
interface WebFileEditorRequest {
  path: string
  root?: string
}

interface WebFileEditorViewProps {
  path: string
  root?: string
  onClose: () => void
  onStatus?: (status: string, tone?: 'idle' | 'busy' | 'error') => void
}

interface WebFileEditor {
  id: string
  title: string
  extensions: readonly string[]
  component: React.ComponentType<WebFileEditorViewProps>
}

interface WebFileEditors {
  register(editor: WebFileEditor): () => void
  tryOpen(request: WebFileEditorRequest): Promise<boolean>
}
```

`tryOpen` returns `true` only when an editor handled the file, so a caller can fall back to the Host native opener otherwise. Registering the same editor id again replaces the old entry; a different id claiming an already-owned extension fails loudly instead of silently picking a winner.

## Registration surfaces

| Surface | Entry | Purpose |
| --- | --- | --- |
| Host route | `/web-editors/api/list` | Workspace file scan for the panel picker |
| Client service | `webFileEditors` | Editor registry and panel opener |
| Slot | `shell.overlay`, id `web-editors.dock` | Default docked right panel, order 110 |
| Slot | `shell.editor` | Optional native right panel when a future shell declares it |
| Slot | `conversation.session.header.actions`, id `web-editors.open` | Session-header trigger that opens panel and picker |
| Slot | `conversation.chat.turnTail`, priority -10 | Produced-file row for editor-supported files |

The turn-tail selector reads the official deliverables turn data (`owner.turn.data.get('deliverables')`, shape `{ produced: Array<{ seq, path }> }`) when available and declines otherwise. It claims a turn only when at least one produced file has a registered editor. When it claims a turn, it renders every produced file: supported chips open the editor panel, unsupported chips call the chat-provided `openFile`.

## Configuration

The bundle row accepts one client option, overridable in the profile's `cordis.patch.yml`:

| Key | Default | Description |
| --- | --- | --- |
| `preferOverlay` | `false` | Force the plugin-only overlay dock even when a shell declares `shell.editor`. |

```yaml
- id: web-editors
  config:
    preferOverlay: true
```

The default behavior uses `shell.editor` when a DSH shell declares it and falls back to the overlay dock otherwise.

## Install

From the directory that contains this checkout:

```sh
dsh plugin --profile web add ./dsh-plugin-web-editors
# or, if you run the CLI via npx:
npx @deepseek-ai/dsh plugin --profile web add ./dsh-plugin-web-editors
```

The CLI links the checkout, appends the bundle to `dsh.profile.bundles`, and activates `cordis.patch.yml`. The client bundle is loaded from `lib/client.js`, so rebuild after source changes:

```sh
npm run build
```

## Development

```sh
npm install
npm run typecheck   # tsc --noEmit (strict)
npm test            # Node built-in runner (type stripping; no child-process spawning)
npm run build       # tsdown -> lib/index.js + lib/client.js
```

The test script uses Node's built-in test runner with `--test-isolation=none` and `--experimental-strip-types`; Vitest is not used because its worker/Vite child processes are blocked by the DSH Windows file sandbox.

## Plugin-only deployment

No DSH core change is required. The editor panel registers into `shell.overlay` as a full-height docked right column. In that mode it has:

- A left-edge drag handle, desktop range 720-1100px, clamped to narrow viewports.
- Keyboard resizing with `Arrow Left`/`Arrow Right` and `Home`/`End`.
- A session-header `Open file` button that appears once an editor registers and opens the panel with the picker directly, using the current session cwd, so no produced-file chip is required to start browsing.
- An `Open file` picker that scans the current session cwd (or the last opened file's root), skips `.git` and `node_modules`, and filters to the extensions registered by installed editors.
- A width kept in the panel store across file switches.

`webFileEditors` and the produced-file row are provided by this package, so editor plugins do not need to know whether the panel is an overlay or a future native shell slot.

If a future DSH release declares `shell.editor`, this package can register into that native right column and call `ctx.layout.openEditor()` when a file opens. This project does not ship that shell change; it only consumes the slot when the running shell provides it.

## License

MIT.
