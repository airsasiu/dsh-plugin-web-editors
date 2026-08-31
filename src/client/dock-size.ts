/** Overlay dock sizing. Native `shell.editor` owns its column width. */

export const OVERLAY_WIDTH_DEFAULT = 900
export const OVERLAY_WIDTH_MIN = 720
export const OVERLAY_WIDTH_MAX = 1100
export const OVERLAY_VIEWPORT_MARGIN = 24
export const OVERLAY_KEYBOARD_STEP = 16

/** Clamp a requested dock width to the desktop range and the viewport. */
export function clampOverlayWidth(width: number, viewportWidth: number): number {
  if (!Number.isFinite(width)) return OVERLAY_WIDTH_DEFAULT
  const usable = Math.max(1, viewportWidth - OVERLAY_VIEWPORT_MARGIN)
  const min = Math.min(OVERLAY_WIDTH_MIN, usable)
  const max = Math.min(OVERLAY_WIDTH_MAX, usable)
  return Math.round(Math.min(max, Math.max(min, width)))
}
