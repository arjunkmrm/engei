import { describe, it, expect } from "vitest"
import { parseWithPositions, wrapSourceRange, clearHighlights } from "./markedPositions"

describe("parseWithPositions", () => {
  it("output HTML contains data-src-start/data-src-end attributes", () => {
    const html = parseWithPositions("# Hello\n\nWorld")
    expect(html).toContain("data-src-start")
    expect(html).toContain("data-src-end")
  })

  it("heading gets position attributes", () => {
    const html = parseWithPositions("# Hello")
    expect(html).toMatch(/data-src-start="0"/)
  })

  it("paragraph gets position attributes", () => {
    const html = parseWithPositions("Hello world")
    expect(html).toMatch(/<p\s+data-src-start/)
  })

  it("code block gets position attributes", () => {
    const md = "```js\nconst x = 1\n```"
    const html = parseWithPositions(md)
    expect(html).toMatch(/<pre\s+data-src-start/)
    expect(html).toContain("language-js")
  })

  it("strips YAML frontmatter and renders as metadata block", () => {
    const md = "---\ntitle: Test\n---\n\n# Hello"
    const html = parseWithPositions(md)
    expect(html).toContain("frontmatter")
    expect(html).toContain("Test")
    expect(html).toContain("<h1")
  })

  it("highlights code blocks with known languages", () => {
    const md = "```javascript\nconst x = 1\n```"
    const html = parseWithPositions(md)
    expect(html).toContain("hljs")
  })

  it("handles empty input", () => {
    const html = parseWithPositions("")
    expect(html).toBe("")
  })
})

describe("wrapSourceRange", () => {
  it("wraps correct text in highlight spans", () => {
    const container = document.createElement("div")
    container.innerHTML = '<p data-src-start="0" data-src-end="11">hello world</p>'

    wrapSourceRange(container, 6, 11, "c1")

    const span = container.querySelector("[data-comment-id='c1']")
    expect(span).not.toBeNull()
    expect(span!.textContent).toBe("world")
  })

  it("handles partial overlap with element", () => {
    const container = document.createElement("div")
    container.innerHTML = '<p data-src-start="0" data-src-end="5">hello</p><p data-src-start="6" data-src-end="11">world</p>'

    wrapSourceRange(container, 0, 11, "c1")

    const spans = container.querySelectorAll("[data-comment-id='c1']")
    expect(spans.length).toBe(2)
  })
})

describe("clearHighlights", () => {
  it("removes all highlight wrappers", () => {
    const container = document.createElement("div")
    container.innerHTML = '<p>hello <span data-comment-highlight="true" data-comment-id="c1">world</span></p>'

    clearHighlights(container)

    expect(container.querySelector("[data-comment-highlight]")).toBeNull()
    expect(container.textContent).toBe("hello world")
  })

  it("normalizes text nodes after removal", () => {
    const container = document.createElement("div")
    container.innerHTML = '<p>a<span data-comment-highlight="true">b</span>c</p>'

    clearHighlights(container)

    const p = container.querySelector("p")!
    // After normalize, should be a single text node
    expect(p.childNodes.length).toBe(1)
    expect(p.textContent).toBe("abc")
  })
})
