import { describe, it, expect } from "vitest"
import { EditorState, EditorSelection } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { markdown } from "@codemirror/lang-markdown"
import { GFM } from "@lezer/markdown"
import { ensureSyntaxTree } from "@codemirror/language"
import { headings } from "./extensions/headings"
import { emphasis } from "./extensions/emphasis"
import { strikethrough } from "./extensions/strikethrough"
import { blockquotes } from "./extensions/blockquotes"
import { codeBlocks } from "./extensions/codeBlocks"
import { liveDefaults } from "."

// ─── Helpers ──────────────────────────────────────────────────

function makeView(doc: string, extensions: any[], cursor?: number): EditorView {
  const state = EditorState.create({
    doc,
    extensions: [markdown({ extensions: GFM }), ...extensions],
    selection: cursor != null ? EditorSelection.cursor(cursor) : undefined,
  })
  const view = new EditorView({ state })
  ensureSyntaxTree(view.state, view.state.doc.length, 5000)
  return view
}

function getExtensionClasses(doc: string, ext: any, cursor?: number): string[] {
  const view = makeView(doc, [ext], cursor)
  // Force a sync so decorations are built
  ensureSyntaxTree(view.state, view.state.doc.length, 5000)
  // Re-dispatch to trigger update with parsed tree
  view.dispatch({ selection: view.state.selection })

  const classes: string[] = []
  // Access the state field values
  const vals = (view.state as any).values
  if (vals) {
    for (const v of vals) {
      if (v && typeof v === "object" && typeof v.iter === "function") {
        const iter = v.iter()
        while (iter.value) {
          const cls = iter.value.spec?.class || iter.value.spec?.attributes?.class
          if (cls) classes.push(cls)
          iter.next()
        }
      }
    }
  }
  return classes
}

// ─── headings ─────────────────────────────────────────────────

describe("headings extension", () => {
  it("applies heading mark to h1", () => {
    const classes = getExtensionClasses("# Hello\n\nsome text", headings(), 15)
    expect(classes).toContain("cm-live-h1")
  })

  it("applies heading mark to h2 and h3", () => {
    const classes = getExtensionClasses("## Two\n\n### Three\n\ntext", headings(), 20)
    expect(classes).toContain("cm-live-h2")
    expect(classes).toContain("cm-live-h3")
  })

  it("applies marker to HeaderMark (not hidden)", () => {
    const classes = getExtensionClasses("# Hello\n\nsome text", headings(), 15)
    expect(classes).toContain("cm-live-marker")
    expect(classes).not.toContain("cm-live-hidden")
  })

  it("keeps heading styled and marker visible even when cursor IS on heading line", () => {
    const classes = getExtensionClasses("# Hello\n\nsome text", headings(), 3)
    expect(classes).toContain("cm-live-h1")
    expect(classes).toContain("cm-live-marker")
  })

  it("does not crash when heading is at end of doc without trailing newline", () => {
    expect(() => getExtensionClasses("# End", headings(), 0)).not.toThrow()
  })

  it("does not crash on single # with no content", () => {
    expect(() => getExtensionClasses("#", headings(), 0)).not.toThrow()
  })

  it("supports custom marker class", () => {
    const classes = getExtensionClasses("# Hello\n\ntext", headings({ markerClass: "my-marker" }), 12)
    expect(classes).toContain("my-marker")
    expect(classes).not.toContain("cm-live-marker")
  })
})

// ─── emphasis ─────────────────────────────────────────────────

describe("emphasis extension", () => {
  it("applies bold mark and marker for delimiters", () => {
    const classes = getExtensionClasses("**bold** text", emphasis(), 12)
    expect(classes).toContain("cm-live-strong")
    expect(classes).toContain("cm-live-marker")
  })

  it("keeps bold styled even when cursor is inside", () => {
    const classes = getExtensionClasses("**bold** text", emphasis(), 4)
    expect(classes).toContain("cm-live-strong")
    expect(classes).toContain("cm-live-marker")
  })

  it("applies italic mark", () => {
    const classes = getExtensionClasses("*italic* text", emphasis(), 12)
    expect(classes).toContain("cm-live-emphasis")
  })

  it("applies inline code mark", () => {
    const classes = getExtensionClasses("`code` text", emphasis(), 10)
    expect(classes).toContain("cm-live-inline-code")
  })

  it("applies link mark", () => {
    const classes = getExtensionClasses("[text](https://example.com) more", emphasis(), 30)
    expect(classes).toContain("cm-live-link")
  })

  it("does not create decorations for empty document", () => {
    const classes = getExtensionClasses("", emphasis(), 0)
    expect(classes).toHaveLength(0)
  })
})

// ─── blockquotes ──────────────────────────────────────────────

describe("blockquotes extension", () => {
  it("applies blockquote styling always", () => {
    const classes = getExtensionClasses("> quoted text\n\nnormal", blockquotes(), 18)
    expect(classes).toContain("cm-live-blockquote")
  })

  it("applies marker to QuoteMark (not hidden)", () => {
    const classes = getExtensionClasses("> quoted text\n\nnormal", blockquotes(), 18)
    expect(classes).toContain("cm-live-marker")
    expect(classes).not.toContain("cm-live-hidden")
  })

  it("keeps QuoteMark as marker even when cursor IS on blockquote line", () => {
    const classes = getExtensionClasses("> quoted text\n\nnormal", blockquotes(), 5)
    expect(classes).toContain("cm-live-marker")
  })
})

// ─── fenced code ──────────────────────────────────────────────

describe("codeBlocks extension", () => {
  const codeDoc = "text\n\n```js\nconst x = 1\n```\n\nmore text"

  it("applies fenced code mark", () => {
    const classes = getExtensionClasses(codeDoc, codeBlocks(), 2)
    expect(classes).toContain("cm-live-fenced-code")
  })

  it("applies fence line decorations", () => {
    const classes = getExtensionClasses(codeDoc, codeBlocks(), 2)
    expect(classes).toContain("cm-live-fence-line")
  })

  it("keeps code block styled even when cursor is inside", () => {
    const classes = getExtensionClasses(codeDoc, codeBlocks(), 14)
    expect(classes).toContain("cm-live-fenced-code")
  })
})

// ─── strikethrough ────────────────────────────────────────────

describe("strikethrough extension", () => {
  it("applies strikethrough mark", () => {
    const classes = getExtensionClasses("~~struck~~ text", strikethrough(), 14)
    expect(classes).toContain("cm-live-strikethrough")
  })

  it("keeps strikethrough styled even when cursor is inside", () => {
    const classes = getExtensionClasses("~~struck~~ text", strikethrough(), 5)
    expect(classes).toContain("cm-live-strikethrough")
  })

  it("applies marker to StrikethroughMark", () => {
    const classes = getExtensionClasses("~~struck~~ text", strikethrough(), 14)
    expect(classes).toContain("cm-live-marker")
  })
})

// ─── edge cases ───────────────────────────────────────────────

describe("edge cases", () => {
  it("handles document with only a heading mark (no content)", () => {
    expect(() => getExtensionClasses("# ", headings(), 0)).not.toThrow()
    expect(() => getExtensionClasses("## ", headings(), 0)).not.toThrow()
  })

  it("handles heading at very end of doc (no trailing newline)", () => {
    const classes = getExtensionClasses("text\n# End", headings(), 10)
    expect(classes).toContain("cm-live-h1")
  })

  it("handles plain text with no markdown", () => {
    const classes = getExtensionClasses("Just plain text here.", emphasis(), 5)
    expect(classes).toHaveLength(0)
  })
})

// ─── liveDefaults integration ─────────────────────────────────

describe("liveDefaults integration", () => {
  it("composes all extensions without errors", () => {
    const extensions = liveDefaults({ theme: "dark" })
    expect(extensions.length).toBeGreaterThan(0)

    // Create a view with all extensions
    const doc = "# Heading\n\n**bold** *italic* `code`\n\n> quote\n\n---\n\n~~strike~~"
    expect(() => makeView(doc, extensions, 0)).not.toThrow()
  })

  it("produces decorations from multiple extensions", () => {
    const extensions = liveDefaults({ theme: "dark" })
    const doc = "# Hello\n\n**bold** text"
    const classes = getExtensionClasses(doc, extensions, 18)
    expect(classes).toContain("cm-live-h1")
    expect(classes).toContain("cm-live-strong")
    expect(classes).toContain("cm-live-marker")
  })
})
