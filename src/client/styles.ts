/**
 * Stylesheet injection for the client bundle. The CSS is inlined as text by
 * the build plugin and injected here at factory materialization (framework
 * style).
 */
import viewerCss from './viewer.css'

/** Inject the stylesheet; returns a disposer that removes the tag. */
export function injectStyles(): () => void {
  const tags: HTMLStyleElement[] = []
  if (typeof document !== 'undefined' && document.head !== null) {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-plugin-web-editors'
    tag.textContent = viewerCss
    document.head.appendChild(tag)
    tags.push(tag)
  }
  return () => {
    for (const tag of tags) tag.remove()
  }
}
