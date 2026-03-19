import { computePopoverPositions } from "./popoverPositioning"

function mockElement(rect: Partial<DOMRect>, attrs: Record<string, string> = {}): HTMLElement {
  return {
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {}, ...rect }),
    getAttribute: (name: string) => attrs[name] || null,
    scrollTop: 0,
  } as unknown as HTMLElement
}

describe("computePopoverPositions", () => {
  it("returns empty array for no spans", () => {
    const container = mockElement({ top: 100 })
    expect(computePopoverPositions(container, [])).toEqual([])
  })

  it("computes position relative to container", () => {
    const container = mockElement({ top: 100 })
    const span = mockElement({ top: 150 }, { "data-comment-id": "c1" })
    const result = computePopoverPositions(container, [span])
    expect(result).toEqual([{ id: "c1", top: 50 }])
  })

  it("handles multiple spans", () => {
    const container = mockElement({ top: 0 })
    const spans = [
      mockElement({ top: 20 }, { "data-comment-id": "a" }),
      mockElement({ top: 80 }, { "data-comment-id": "b" }),
      mockElement({ top: 200 }, { "data-comment-id": "c" }),
    ]
    const result = computePopoverPositions(container, spans)
    expect(result).toEqual([
      { id: "a", top: 20 },
      { id: "b", top: 80 },
      { id: "c", top: 200 },
    ])
  })

  it("accounts for container scroll", () => {
    const container = { ...mockElement({ top: 100 }), scrollTop: 50 } as unknown as HTMLElement
    const span = mockElement({ top: 150 }, { "data-comment-id": "s1" })
    const result = computePopoverPositions(container, [span])
    expect(result).toEqual([{ id: "s1", top: 100 }]) // (150-100) + 50
  })

  it("returns empty id when data-comment-id is missing", () => {
    const container = mockElement({ top: 0 })
    const span = mockElement({ top: 30 })
    const result = computePopoverPositions(container, [span])
    expect(result[0].id).toBe("")
  })
})
