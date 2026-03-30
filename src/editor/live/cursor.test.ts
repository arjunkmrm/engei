import { describe, it, expect } from "vitest"
import { EditorState, EditorSelection } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { markdown } from "@codemirror/lang-markdown"
import { GFM } from "@lezer/markdown"
import { selectionOverlaps, cursorOnLine } from "./cursor"

function makeView(doc: string, cursor?: number): EditorView {
  const state = EditorState.create({
    doc,
    extensions: [markdown({ extensions: GFM })],
    selection: cursor != null ? EditorSelection.cursor(cursor) : undefined,
  })
  return new EditorView({ state })
}

// ─── selectionOverlaps ────────────────────────────────────────

describe("selectionOverlaps", () => {
  function ranges(...positions: [number, number][]) {
    return positions.map(([from, to]) => EditorSelection.range(from, to))
  }

  it("returns true when cursor is inside range", () => {
    expect(selectionOverlaps(ranges([5, 5]), 0, 10)).toBe(true)
  })

  it("returns false when cursor is outside range", () => {
    expect(selectionOverlaps(ranges([15, 15]), 0, 10)).toBe(false)
  })

  it("returns true when selection overlaps range partially", () => {
    expect(selectionOverlaps(ranges([5, 15]), 0, 10)).toBe(true)
  })

  it("returns true when selection contains the range", () => {
    expect(selectionOverlaps(ranges([0, 20]), 5, 10)).toBe(true)
  })

  it("returns true when edges touch", () => {
    expect(selectionOverlaps(ranges([10, 10]), 0, 10)).toBe(true)
    expect(selectionOverlaps(ranges([0, 0]), 0, 10)).toBe(true)
  })

  it("returns false for empty ranges array", () => {
    expect(selectionOverlaps([], 0, 10)).toBe(false)
  })

  it("returns true if ANY of multiple ranges overlaps", () => {
    expect(selectionOverlaps(ranges([50, 50], [5, 5]), 0, 10)).toBe(true)
  })

  it("returns false if none of multiple ranges overlap", () => {
    expect(selectionOverlaps(ranges([50, 50], [20, 25]), 0, 10)).toBe(false)
  })
})

// ─── cursorOnLine ─────────────────────────────────────────────

describe("cursorOnLine", () => {
  it("returns true when cursor is on the same line as node", () => {
    const view = makeView("hello\nworld", 8)
    const ranges = view.state.selection.ranges
    expect(cursorOnLine(view.state, ranges, 6, 11)).toBe(true)
  })

  it("returns false when cursor is on a different line", () => {
    const view = makeView("hello\nworld", 2)
    const ranges = view.state.selection.ranges
    expect(cursorOnLine(view.state, ranges, 6, 11)).toBe(false)
  })

  it("returns true for multi-line node when cursor is on any covered line", () => {
    const view = makeView("aaa\nbbb\nccc", 5)
    const ranges = view.state.selection.ranges
    expect(cursorOnLine(view.state, ranges, 0, 11)).toBe(true)
  })

  it("returns true for non-empty selection overlapping node", () => {
    const state = EditorState.create({
      doc: "hello\nworld",
      extensions: [markdown({ extensions: GFM })],
      selection: EditorSelection.range(2, 8),
    })
    const view = new EditorView({ state })
    const ranges = view.state.selection.ranges
    expect(cursorOnLine(view.state, ranges, 6, 11)).toBe(true)
  })

  it("returns false for non-empty selection NOT overlapping node", () => {
    const state = EditorState.create({
      doc: "hello\nworld\nfoo",
      extensions: [markdown({ extensions: GFM })],
      selection: EditorSelection.range(0, 3),
    })
    const view = new EditorView({ state })
    const ranges = view.state.selection.ranges
    expect(cursorOnLine(view.state, ranges, 12, 15)).toBe(false)
  })
})
