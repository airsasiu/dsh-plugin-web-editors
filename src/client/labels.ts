/**
 * Small built-in zh/en label set. The generic framework avoids a hard runtime
 * dependency on the locale service; editors can still receive their own locale
 * props from the host.
 */
export interface EditorLabels {
  dockTitle: string
  closeDock: string
  files: string
  empty: string
  noEditor: string
  produced: string
  openInEditor: string
  openWithNative: string
}

const EN: EditorLabels = {
  dockTitle: 'Files',
  closeDock: 'Close file panel',
  files: 'Open files',
  empty: 'No open file',
  noEditor: 'No editor registered for this file',
  produced: 'Produced',
  openInEditor: 'Open {name} in editor',
  openWithNative: 'Open {name}',
}

const ZH: EditorLabels = {
  dockTitle: '文件',
  closeDock: '关闭文件面板',
  files: '已打开文件',
  empty: '暂无打开文件',
  noEditor: '未注册此文件类型的编辑器',
  produced: '产物',
  openInEditor: '在编辑器中打开 {name}',
  openWithNative: '打开 {name}',
}

/** Pick the zh labels for any zh* locale, English otherwise. */
export function labelsFor(locale?: string): EditorLabels {
  return locale !== undefined && locale.toLowerCase().startsWith('zh') ? ZH : EN
}

/** Browser locale captured at apply time; undefined outside a browser. */
export function browserLocale(): string | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.language
}

/** Replace the single `{name}` template parameter in a label. */
export function interpolate(template: string, name: string): string {
  return template.replace('{name}', name)
}
