import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  clampOverlayWidth,
  OVERLAY_WIDTH_DEFAULT,
  OVERLAY_WIDTH_MAX,
  OVERLAY_WIDTH_MIN,
} from '../src/client/dock-size.ts'

describe('overlay dock sizing', () => {
  it('clamps to the desktop minimum and maximum', () => {
    assert.equal(clampOverlayWidth(480, 1920), OVERLAY_WIDTH_MIN)
    assert.equal(clampOverlayWidth(1400, 1920), OVERLAY_WIDTH_MAX)
    assert.equal(clampOverlayWidth(920, 1920), 920)
  })

  it('keeps the dock inside narrow viewports', () => {
    const viewport = 500
    const expected = viewport - 24
    assert.equal(clampOverlayWidth(OVERLAY_WIDTH_MAX, viewport), expected)
    assert.equal(clampOverlayWidth(OVERLAY_WIDTH_MIN, viewport), expected)
  })

  it('falls back to the default width for invalid input', () => {
    assert.equal(clampOverlayWidth(Number.NaN, 1920), OVERLAY_WIDTH_DEFAULT)
    assert.equal(clampOverlayWidth(Number.POSITIVE_INFINITY, 1920), OVERLAY_WIDTH_DEFAULT)
  })
})
