# dsh-plugin-web-editors

[English README](README.md)

一个面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI 的通用插件，把注册的文件编辑器整合成一个右侧 editor 面板。

本包是纯插件，可以安全挂载在未修改的 DSH Web profile 上。当 shell 还没有声明原生 `shell.editor` slot 时，它使用 `shell.overlay` 作为右侧停靠面板兜底。它提供：

- `webFileEditors`：DSH core 在回退到原生 workspace opener 之前可以调用的客户端服务。
- 原生右侧面板：当 `shell.editor` 存在时注册进去；旧 shell 使用 `shell.overlay` 停靠面板。
- `conversation.chat.turnTail` 行：为扩展名已注册 editor 的 produced files 显示文件入口。未支持的文件仍调用 chat 提供的 `openFile`，保留官方 deliverables 行为。

通用框架不包含任何 SpreadJS/GrapeCity 代码。具体编辑器插件（例如 `dsh-plugin-spreadjs-editor`）通过 `webFileEditors` 注册自己的组件。

## 公共 API

客户端服务通过 `dsh-plugin-web-editors/client` 导出类型，运行时以 `ctx.webFileEditors` 提供：

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

只有 editor 真正处理了文件时，`tryOpen` 才返回 `true`，调用方可以据此回退到 Host 原生 opener。重复注册相同 `id` 会替换旧 entry；不同 `id` 占用已归属的扩展名会显式失败，而不是静默选择某个 winner。

## 注册位置

| Surface | Entry | 作用 |
| --- | --- | --- |
| 客户端服务 | `webFileEditors` | editor 注册表与面板打开器 |
| Slot | `shell.editor` | shell 声明时注册原生右侧面板 |
| Slot | `shell.overlay`, id `web-editors.dock` | 右侧停靠面板兜底，order 110 |
| Slot | `conversation.chat.turnTail`, priority -10 | editor 支持文件的 produced-file 行 |

turn-tail selector 读取官方 deliverables 数据（`owner.turn.data.get('deliverables')`，结构为 `{ produced: Array<{ seq, path }> }`），没有数据时直接放弃。只有至少一个 produced file 有已注册 editor 时才 claim turn；claim 后会渲染所有 produced file：支持的文件 chip 打开 editor 面板，不支持的 chip 调用 chat 提供的 `openFile`。

## 配置

bundle row 接受一个客户端选项，可在 profile 的 `cordis.patch.yml` 中覆盖：

| Key | 默认值 | 说明 |
| --- | --- | --- |
| `preferOverlay` | `false` | 即使 shell 声明了 `shell.editor`，也强制使用 plugin-only overlay 停靠面板。 |

```yaml
- id: web-editors
  config:
    preferOverlay: true
```

默认 `auto` 行为是：可用时注册进 `shell.editor`，否则回退到 overlay 停靠面板。

## 安装

在包含本 checkout 的目录中执行：

```sh
dsh plugin --profile web add ./dsh-plugin-web-editors
# 或通过 npx 运行 CLI：
npx @deepseek-ai/dsh plugin --profile web add ./dsh-plugin-web-editors
```

CLI 会链接 checkout、把 bundle 追加到 `dsh.profile.bundles`，并激活 `cordis.patch.yml`。客户端 bundle 从 `lib/client.js` 加载，因此源码改动后需要重新构建：

```sh
npm run build
```

## 开发

```sh
npm install
npm run typecheck   # tsc --noEmit (strict)
npm test            # Node built-in runner（type stripping，不创建子进程）
npm run build       # tsdown -> lib/index.js + lib/client.js
```

测试脚本使用 Node 内置 test runner 的 `--test-isolation=none` 和
`--experimental-strip-types`；不使用 Vitest，因为其 worker/Vite 子进程会被 DSH Windows 文件沙箱拦截。

## 原生面板与兼容兜底

当运行中的 shell 声明了 `shell.editor` 时，本包把 editor 面板注册到原生右侧栏，并在文件打开时调用 `ctx.layout.openEditor()`。该模式下面板是真正可拖拽的 grid 列。

当 `shell.editor` 不存在时，同一面板注册到 `shell.overlay`，作为全高右侧停靠栏。服务契约和 `webFileEditors` 名称是 DSH core 调用的扩展缝，因此 editor 插件不需要关心当前处于哪种模式。

已知限制：兼容模式下面板是 overlay，不是原生 grid 列。它带有左侧拖拽 handle（720-1100px，窄视口下自动收窄），并支持 `方向键左/右` 和 `Home`/`End` 键盘调整；原生 `shell.editor` 路径可以在不改 editor API 的情况下消除该结构限制。

## DeepSeek Harness core 扩展点

本包自己提供 `webFileEditors` 服务和面板，因此在未修改的 shell 上，停靠面板和 produced-file chips 也可以工作。另外两个 core 扩展点能改善集成，已在 DSH fork 的 `feat/web-editor-extension-points` 分支中准备：

- `shell.editor`：原生 single/root 右栏，替代 overlay 停靠。
- `openFile -> webFileEditors.tryOpen()` fallback：DSH 自己的 chat 文件链接会先尝试打开已注册 editor，再回退到原生 workspace opener。

在把这些改动 upstream 或应用 patch 之前，面板仍可工作，但 DSH 原生文件链接（例如 core produced-file 行）不会自动走 `webFileEditors`。

## License

MIT。
