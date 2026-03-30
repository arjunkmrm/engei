import { describe, it, expect } from "vitest"
import { EditorState, EditorSelection } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { markdown } from "@codemirror/lang-markdown"
import { GFM } from "@lezer/markdown"
import { keymap } from "@codemirror/view"
import { ensureSyntaxTree } from "@codemirror/language"
import { insertSoftNewline, smartEnter, markdownKeymap } from "./markdown-commands"

function makeView(doc: string, cursor: number): EditorView {
  const state = EditorState.create({
    doc,
    extensions: [
      markdown({ extensions: GFM }),
      keymap.of(markdownKeymap),
    ],
    selection: EditorSelection.cursor(cursor),
  })
  const view = new EditorView({ state })
  // Force parser to complete
  ensureSyntaxTree(view.state, view.state.doc.length, 5000)
  return view
}

describe("insertSoftNewline", () => {
  it("inserts continuation with spaces aligned to list text", () => {
    const doc = "- Hello world"
    const view = makeView(doc, 13)
    ensureSyntaxTree(view.state, view.state.doc.length, 5000)

    insertSoftNewline(view)

    const result = view.state.doc.toString()
    expect(result).toBe("- Hello world\n  ")
    expect(view.state.selection.main.head).toBe(result.length)
  })

  it("aligns with nested list text", () => {
    const doc = "- Top\n    - Nested item"
    const view = makeView(doc, doc.length)
    ensureSyntaxTree(view.state, view.state.doc.length, 5000)

    insertSoftNewline(view)

    const result = view.state.doc.toString()
    expect(result).toBe("- Top\n    - Nested item\n      ")
  })

  it("handles ordered list markers", () => {
    const doc = "1. First item"
    const view = makeView(doc, 13)
    ensureSyntaxTree(view.state, view.state.doc.length, 5000)

    insertSoftNewline(view)

    const result = view.state.doc.toString()
    expect(result).toBe("1. First item\n   ")
  })

  it("inserts plain newline when not in a list", () => {
    const doc = "Just a paragraph"
    const view = makeView(doc, 16)
    ensureSyntaxTree(view.state, view.state.doc.length, 5000)

    insertSoftNewline(view)

    const result = view.state.doc.toString()
    expect(result).toBe("Just a paragraph\n")
  })

  it("inserts plain newline in heading", () => {
    const doc = "# Heading"
    const view = makeView(doc, 9)
    ensureSyntaxTree(view.state, view.state.doc.length, 5000)

    insertSoftNewline(view)

    const result = view.state.doc.toString()
    expect(result).toBe("# Heading\n")
  })

  it("splits text in middle of list item", () => {
    const doc = "- Hello world"
    const view = makeView(doc, 7)
    ensureSyntaxTree(view.state, view.state.doc.length, 5000)

    insertSoftNewline(view)

    const result = view.state.doc.toString()
    expect(result).toBe("- Hello\n   world")
  })
})

describe("smartEnter — continuation line creates new list item", () => {
  it("creates new list item when Enter on continuation line", () => {
    // Simulate: "- foo" → Shift+Enter → type "bar" → Enter
    const doc = "- foo\n  bar"
    const view = makeView(doc, doc.length)
    ensureSyntaxTree(view.state, view.state.doc.length, 5000)

    smartEnter(view)

    const result = view.state.doc.toString()
    expect(result).toBe("- foo\n  bar\n- ")
  })

  it("creates new list item with correct indent for nested continuation", () => {
    const doc = "- top\n    - nested\n      continuation"
    const view = makeView(doc, doc.length)
    ensureSyntaxTree(view.state, view.state.doc.length, 5000)

    smartEnter(view)

    const result = view.state.doc.toString()
    expect(result).toBe("- top\n    - nested\n      continuation\n    - ")
  })

  it("delegates to insertNewlineContinueMarkup on normal list line", () => {
    const doc = "- foo"
    const view = makeView(doc, doc.length)
    ensureSyntaxTree(view.state, view.state.doc.length, 5000)

    smartEnter(view)

    const result = view.state.doc.toString()
    // Normal list line — CM6 continues with "- "
    expect(result).toBe("- foo\n- ")
  })

  it("returns false for non-list content (delegates to default keymap)", () => {
    const doc = "plain text"
    const view = makeView(doc, doc.length)
    ensureSyntaxTree(view.state, view.state.doc.length, 5000)

    const handled = smartEnter(view)

    // smartEnter delegates to insertNewlineContinueMarkup which returns false
    // for non-list content — the default keymap handles it
    expect(handled).toBe(false)
    expect(view.state.doc.toString()).toBe("plain text")
  })
})
