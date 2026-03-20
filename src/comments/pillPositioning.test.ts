import { describe, it, expect } from "vitest"
import { computePillPosition } from "./pillPositioning"

const W = 800
const PILL_H = 28, GAP = 6

describe("computePillPosition", () => {
  it("places pill above selection by default", () => {
    const p = computePillPosition(200, 220, 400, W)
    expect(p.direction).toBe("above")
    expect(p.top + PILL_H + GAP).toBe(200)
  })

  it("centers horizontally on the selection", () => {
    const p = computePillPosition(200, 220, 400, W)
    expect(p.left).toBe(400)
  })

  it("flips below when no room above in viewport", () => {
    const p = computePillPosition(10, 30, 400, W, 10)
    expect(p.direction).toBe("below")
    expect(p.top).toBe(30 + GAP)
  })

  it("maintains 6px gap above", () => {
    const p = computePillPosition(200, 220, 400, W)
    expect(200 - (p.top + PILL_H)).toBe(GAP)
  })

  it("maintains 6px gap below when flipped", () => {
    const p = computePillPosition(10, 30, 400, W, 10)
    expect(p.top - 30).toBe(GAP)
  })

  it("clamps X to left edge", () => {
    const p = computePillPosition(200, 220, 2, W)
    expect(p.left).toBeGreaterThanOrEqual(8)
  })

  it("clamps X to right edge", () => {
    const p = computePillPosition(200, 220, 798, W)
    expect(p.left).toBeLessThanOrEqual(792)
  })

  it("top never goes negative", () => {
    const p = computePillPosition(5, 25, 400, W)
    expect(p.top).toBeGreaterThanOrEqual(0)
  })

  it("works for very tall selection", () => {
    const p = computePillPosition(100, 500, 400, W)
    expect(p.direction).toBe("above")
    expect(p.top + PILL_H + GAP).toBe(100)
  })

  it("works for narrow container", () => {
    const p = computePillPosition(200, 220, 60, 120)
    expect(p.left).toBeGreaterThanOrEqual(8)
    expect(p.left).toBeLessThanOrEqual(112)
  })

  // ─── Viewport flip tests ──────────────────────────────────
  it("stays above when viewport has room (viewportRoomAbove > 34)", () => {
    const p = computePillPosition(500, 520, 400, W, 100)
    expect(p.direction).toBe("above")
  })

  it("flips below when scrolled so selection is near viewport top", () => {
    // selTop=500 (container-relative, large), but only 20px of viewport above
    const p = computePillPosition(500, 520, 400, W, 20)
    expect(p.direction).toBe("below")
    expect(p.top).toBe(520 + GAP)
  })

  it("flips below at exact threshold (viewportRoomAbove = 33)", () => {
    const p = computePillPosition(200, 220, 400, W, 33)
    expect(p.direction).toBe("below")
  })

  it("stays above at exact threshold (viewportRoomAbove = 34)", () => {
    const p = computePillPosition(200, 220, 400, W, 34)
    expect(p.direction).toBe("above")
  })

  it("defaults to above when viewportRoomAbove not provided", () => {
    // Default is Infinity — always room above
    const p = computePillPosition(200, 220, 400, W)
    expect(p.direction).toBe("above")
  })
})
