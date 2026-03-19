import { describe, it, expect } from "vitest"
import { resolveCollisions } from "./resolveCollisions"

describe("resolveCollisions", () => {
  it("returns empty for empty input", () => {
    expect(resolveCollisions([])).toEqual([])
  })

  it("single item unchanged", () => {
    const items = [{ top: 50, height: 40 }]
    const result = resolveCollisions(items)
    expect(result).toEqual([{ top: 50, height: 40 }])
  })

  it("non-overlapping items stay put", () => {
    const items = [
      { top: 0, height: 30 },
      { top: 50, height: 30 },
    ]
    const result = resolveCollisions(items)
    expect(result[0].top).toBe(0)
    expect(result[1].top).toBe(50)
  })

  it("overlapping items — second is pushed down", () => {
    const items = [
      { top: 0, height: 40 },
      { top: 20, height: 40 }, // overlaps first
    ]
    const result = resolveCollisions(items)
    expect(result[0].top).toBe(0)
    expect(result[1].top).toBe(48) // 0 + 40 + 8 (default gap)
  })

  it("cascade: chain of overlapping items", () => {
    const items = [
      { top: 0, height: 30 },
      { top: 10, height: 30 },
      { top: 20, height: 30 },
    ]
    const result = resolveCollisions(items)
    expect(result[0].top).toBe(0)
    expect(result[1].top).toBe(38)  // 0 + 30 + 8
    expect(result[2].top).toBe(76)  // 38 + 30 + 8
  })

  it("custom gap value", () => {
    const items = [
      { top: 0, height: 20 },
      { top: 10, height: 20 },
    ]
    const result = resolveCollisions(items, 16)
    expect(result[1].top).toBe(36) // 0 + 20 + 16
  })

  it("unsorted items get sorted by top", () => {
    const items = [
      { top: 100, height: 30 },
      { top: 0, height: 30 },
      { top: 50, height: 30 },
    ]
    const result = resolveCollisions(items)
    expect(result[0].top).toBe(0)
    expect(result[1].top).toBe(50)
    expect(result[2].top).toBe(100)
  })

  it("preserves extra properties on items", () => {
    const items = [{ top: 0, height: 30, id: "a", comment: { text: "hi" } }]
    const result = resolveCollisions(items)
    expect((result[0] as any).id).toBe("a")
    expect((result[0] as any).comment).toEqual({ text: "hi" })
  })
})
