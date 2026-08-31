/**
 * dsh-plugin-web-editors — node half.
 *
 * The web editor framework is browser-only; this half exists so the package
 * mounts as one Cordis row in the Web profile. The browser half provides the
 * `webFileEditors` service, the `shell.overlay` dock, and the
 * `conversation.chat.turnTail` row.
 */
import type { Context } from '@deepseek-ai/cordis'

export const name = 'dsh-plugin-web-editors'

/** No host services are required or provided by the generic framework. */
export const inject: string[] = []

export function apply(_ctx: Context): void {
  // The browser half owns every contribution.
}
