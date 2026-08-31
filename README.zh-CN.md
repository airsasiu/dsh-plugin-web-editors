# dsh-plugin-web-editors

[English README](README.md)

一个纯插件式的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI 包，把注册的文件编辑器整合成右侧停靠的 editor 面板。它可以直接挂在未修改的 DSH Web profile 上，不依赖 DSH core fork、PR 分支或 patch 安装。

它提供：

- `webFileEditors`：editor 插件和 editor 面板使用的客户端服务。
- 通过 `shell.overlay` 渲染的全高右侧面板，带可拖拽宽度 handle。
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
| Slot | `shell.overlay`, id `web-editors.dock` | 默认右侧停靠面板，order 110 |
| Slot | `shell.editor` | 未来 shell 声明时的可选原生右侧面板 |
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

默认行为是：DSH shell 声明 `shell.editor` 时使用它，否则回退到 overlay 停靠面板。

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

测试脚本使用 Node 内置 test runner 的 `--test-isolation=none` 和 `--experimental-strip-types`；不使用 Vitest，因为其 worker/Vite 子进程会被 DSH Windows 文件沙箱拦截。

## Plugin-only 部署

不需要任何 DSH core 改动。editor 面板通过 `shell.overlay` 注册为全高右侧停靠栏，并提供：

- 左边缘拖拽 handle，桌面宽度 720-1100px，窄视口自动收窄。
- `方向键左/右` 和 `Home`/`End` 键盘调整。
- 宽度保存在面板 store 中，切换文件后保持不变。

`webFileEditors` 和 produced-file 行都由本包提供，因此 editor 插件不需要关心面板是 overlay 还是未来某个原生 shell slot。

如果未来 DSH 发布版声明 `shell.editor`，本包可以注册进该原生右侧栏，并在文件打开时调用 `ctx.layout.openEditor()`。本项目不随包分发 shell 改动，只在运行中的 shell 提供该 slot 时消费它。

## License

MIT。
