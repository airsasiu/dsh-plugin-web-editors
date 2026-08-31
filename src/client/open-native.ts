/**
 * Safe invocation of the chat-provided native file opener.
 *
 * The host opener rejects when a produced file was deleted or moved. Catching
 * that rejection here keeps the failure in the turn-tail row instead of
 * surfacing a raw host/PowerShell error in the conversation.
 */
export function openNativeFile(
  path: string,
  openFile: (path: string) => unknown,
  onFailure: (path: string) => void,
): void {
  let result: unknown
  try {
    result = openFile(path)
  } catch {
    onFailure(path)
    return
  }
  if (result instanceof Promise) {
    void result.catch(() => onFailure(path))
  }
}
