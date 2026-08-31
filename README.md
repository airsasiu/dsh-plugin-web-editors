# dsh-plugin-web-editors

[中文 README](README.zh-CN.md)

A generic [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI plugin that turns registered file editors into a single docked editor panel.

The package is plugin-only and safe to mount on a stock DSH Web profile. It uses
`shell.overlay` as a docked fallback when the shell does not declare the native
`shell.editor` slot yet. It provides:

- `webFileEditors`, the client service DSH core can call before falling back to the native workspace opener.
- A native right-side panel registered into `shell.editor` when that slot exists, with a `shell.overlay` dock fallback for older shells.
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
| Client service | `webFileEditors` | Editor registry and panel opener |
| Slot | `shell.editor` | Native right panel when the shell declares it |
| Slot | `shell.overlay`, id `web-editors.dock` | Docked right-panel fallback, order 110 |
| Slot | `conversation.chat.turnTail`, priority -10 | Produced-file row for editor-supported files |

The turn-tail selector reads the official deliverables turn data (`owner.turn.data.get('deliverables')`, shape `{ produced: Array<{ seq, path }> }`) when available and declines otherwise. It claims a turn only when at least one produced file has a registered editor. When it claims a turn, it renders every produced file: supported chips open the editor panel, unsupported chips call the chat-provided `openFile`.

## Configuration

The bundle row accepts one client option, overridable in the profile's
`cordis.patch.yml`:

| Key | Default | Description |
| --- | --- | --- |
| `preferOverlay` | `false` | Force the plugin-only overlay dock even when the shell declares `shell.editor`. |

```yaml
- id: web-editors
  config:
    preferOverlay: true
```

The default `auto` behavior registers into `shell.editor` when available and
falls back to the overlay dock otherwise.

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

The test script uses Node's built-in test runner with `--test-isolation=none` and
`--experimental-strip-types`; Vitest is not used because its worker/Vite child
processes are blocked by the DSH Windows file sandbox.

## Native panel and compatibility fallback

When the running shell declares `shell.editor`, this package registers the editor panel into that native right column and calls `ctx.layout.openEditor()` when a file opens. The panel is a real resizable grid column in that mode.

When `shell.editor` is absent, the same panel registers into `shell.overlay` as a full-height docked right column. The service contract and `webFileEditors` name are the extension seam DSH core calls, so editor plugins do not care which mode is active.

Known limitation: in compatibility mode the panel is a full-height overlay, not
a native grid column. It has a left-edge drag handle (720-1100px, clamped to
narrow viewports) and keyboard resizing with `Arrow Left`/`Arrow Right` and
`Home`/`End`; the native `shell.editor` path removes the structural limitation
without changing the editor API.

## DeepSeek Harness core extension points

This package provides the `webFileEditors` service and the panel itself, so the
docked panel and produced-file chips work even on a stock shell. Two core
extension points improve the integration and are prepared in the
`feat/web-editor-extension-points` branch of the DSH fork:

- `shell.editor` — a native single/root right column instead of the overlay dock.
- `openFile` -> `webFileEditors.tryOpen()` fallback — DSH's own chat file links
  open the registered editor before falling back to the native workspace opener.

Until those changes are upstreamed or applied as a patch, the panel still works,
but DSH-native file links (for example core-produced file rows) do not route
through `webFileEditors` automatically.

## License

MIT.
