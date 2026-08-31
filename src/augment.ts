/**
 * Pull the harness packages' declaration merges into the TS program.
 *
 * The slots this plugin targets are declared by OTHER packages:
 *  - `shell.editor`               — new native slot from the patched ui-layout
 *  - `shell.overlay`              — @deepseek-ai/dsh-client-ui-layout (SlotMap)
 *  - `conversation.chat.turnTail` — @deepseek-ai/dsh-client-ui-conversation
 *    (SlotMap + TurnTailOwnerProps)
 *
 * Those `declare module` merges only apply when the declaring .d.ts is part of
 * the program, so this module references them explicitly. All imports are
 * type-only and erased at build; this file exists for the typechecker only and
 * is never part of a bundle.
 */
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** Native editor column owner share. */
    'shell.editor': { kind: 'single'; scope: 'root'; owner: { onClose(): void } }
  }
}

export {}
