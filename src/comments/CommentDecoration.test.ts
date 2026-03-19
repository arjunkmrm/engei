import { describe, it, expect } from "vitest"
import { EditorState } from "@codemirror/state"
import { commentField, setComments, addComment, removeComment, getCommentRanges } from "./CommentDecoration"

function createState(doc: string) {
  return EditorState.create({ doc, extensions: [commentField] })
}

describe("CommentDecoration", () => {
  it("setComments applies decorations at correct ranges", () => {
    let state = createState("hello world")
    state = state.update({
      effects: setComments.of([
        { id: "c1", from: 0, to: 5 },
        { id: "c2", from: 6, to: 11 },
      ]),
    }).state

    const ranges = getCommentRanges(state)
    expect(ranges).toEqual([
      { id: "c1", from: 0, to: 5 },
      { id: "c2", from: 6, to: 11 },
    ])
  })

  it("addComment adds a single decoration", () => {
    let state = createState("hello world")
    state = state.update({
      effects: addComment.of({ id: "c1", from: 0, to: 5 }),
    }).state

    const ranges = getCommentRanges(state)
    expect(ranges).toHaveLength(1)
    expect(ranges[0]).toEqual({ id: "c1", from: 0, to: 5 })
  })

  it("removeComment removes by id", () => {
    let state = createState("hello world")
    state = state.update({
      effects: [
        addComment.of({ id: "c1", from: 0, to: 5 }),
        addComment.of({ id: "c2", from: 6, to: 11 }),
      ],
    }).state

    state = state.update({
      effects: removeComment.of("c1"),
    }).state

    const ranges = getCommentRanges(state)
    expect(ranges).toHaveLength(1)
    expect(ranges[0].id).toBe("c2")
  })

  it("decorations track through document edits", () => {
    let state = createState("hello world")
    state = state.update({
      effects: addComment.of({ id: "c1", from: 6, to: 11 }), // "world"
    }).state

    // Insert "XXX " at position 0
    state = state.update({
      changes: { from: 0, to: 0, insert: "XXX " },
    }).state

    const ranges = getCommentRanges(state)
    expect(ranges).toHaveLength(1)
    expect(ranges[0]).toEqual({ id: "c1", from: 10, to: 15 }) // shifted by 4
    expect(state.doc.sliceString(10, 15)).toBe("world")
  })

  it("filters out invalid ranges (from >= to)", () => {
    let state = createState("hello")
    state = state.update({
      effects: setComments.of([
        { id: "valid", from: 0, to: 5 },
        { id: "invalid", from: 3, to: 3 }, // empty range
      ]),
    }).state

    const ranges = getCommentRanges(state)
    expect(ranges).toHaveLength(1)
    expect(ranges[0].id).toBe("valid")
  })

  it("getCommentRanges returns empty when no comments", () => {
    const state = createState("hello")
    expect(getCommentRanges(state)).toEqual([])
  })
})
