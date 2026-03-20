/**
 * Tests for the source offset fallback logic used when domRangeToSourceRange
 * fails on mouseup (cross-paragraph, widget DOM, etc.).
 *
 * The pill stores selectedText and resolves offsets on pill click via:
 * 1. Try domRangeToSourceRange on the live selection (may still be active)
 * 2. Fall back to content.indexOf(selectedText)
 */
import { describe, it, expect } from "vitest"

// Simulate the fallback logic extracted from MarkdownPreview.tsx pill click handler
function resolveOffsets(
  from: number,
  to: number,
  selectedText: string | undefined,
  content: string,
  /** Simulates domRangeToSourceRange result */
  liveSourceRange: { start: number; end: number } | null,
): { from: number; to: number } | null {
  let resolvedFrom = from
  let resolvedTo = to

  if (resolvedFrom === -1 || resolvedTo === -1) {
    // Try live selection first
    if (liveSourceRange) {
      resolvedFrom = liveSourceRange.start
      resolvedTo = liveSourceRange.end
    }

    // Fall back to text search
    if ((resolvedFrom === -1 || resolvedTo === -1) && selectedText) {
      const idx = content.indexOf(selectedText)
      if (idx >= 0) {
        resolvedFrom = idx
        resolvedTo = idx + selectedText.length
      }
    }
  }

  if (resolvedFrom >= 0 && resolvedTo >= 0) {
    return { from: resolvedFrom, to: resolvedTo }
  }
  return null
}

const CONTENT = `# Heading

First paragraph with some text.

Second paragraph that continues here.

Third paragraph at the end.`

describe("pill offset fallback", () => {
  // ─── Happy path: offsets already resolved ──────────────────
  it("uses existing offsets when already resolved", () => {
    const result = resolveOffsets(10, 30, "some text", CONTENT, null)
    expect(result).toEqual({ from: 10, to: 30 })
  })

  // ─── Fallback 1: live selection still works ────────────────
  it("uses live selection when offsets are -1", () => {
    const result = resolveOffsets(-1, -1, "some text", CONTENT, { start: 25, end: 34 })
    expect(result).toEqual({ from: 25, to: 34 })
  })

  // ─── Fallback 2: text search in content ────────────────────
  it("falls back to text search when live selection also fails", () => {
    const result = resolveOffsets(-1, -1, "First paragraph", CONTENT, null)
    const idx = CONTENT.indexOf("First paragraph")
    expect(result).toEqual({ from: idx, to: idx + "First paragraph".length })
  })

  it("text search finds cross-paragraph selection", () => {
    const text = "First paragraph with some text.\n\nSecond paragraph"
    const result = resolveOffsets(-1, -1, text, CONTENT, null)
    const idx = CONTENT.indexOf(text)
    expect(result).toEqual({ from: idx, to: idx + text.length })
  })

  it("text search handles single word", () => {
    const result = resolveOffsets(-1, -1, "continues", CONTENT, null)
    const idx = CONTENT.indexOf("continues")
    expect(result).toEqual({ from: idx, to: idx + "continues".length })
  })

  // ─── Edge cases ────────────────────────────────────────────
  it("returns null when all fallbacks fail", () => {
    const result = resolveOffsets(-1, -1, "nonexistent text", CONTENT, null)
    expect(result).toBeNull()
  })

  it("returns null when selectedText is undefined and offsets are -1", () => {
    const result = resolveOffsets(-1, -1, undefined, CONTENT, null)
    expect(result).toBeNull()
  })

  it("prefers live selection over text search", () => {
    // "First paragraph" appears at idx 12, but live selection says 100-115
    const result = resolveOffsets(-1, -1, "First paragraph", CONTENT, { start: 100, end: 115 })
    expect(result).toEqual({ from: 100, to: 115 })
  })

  it("handles partial -1 (only from is -1)", () => {
    const result = resolveOffsets(-1, 30, "First", CONTENT, null)
    const idx = CONTENT.indexOf("First")
    expect(result).toEqual({ from: idx, to: idx + 5 })
  })

  it("handles empty selectedText (falsy, skips text search)", () => {
    const result = resolveOffsets(-1, -1, "", CONTENT, null)
    // Empty string is falsy → text search skipped → returns null
    expect(result).toBeNull()
  })

  it("finds first occurrence when text appears multiple times", () => {
    const content = "hello world hello world"
    const result = resolveOffsets(-1, -1, "hello", content, null)
    // indexOf returns first occurrence
    expect(result).toEqual({ from: 0, to: 5 })
  })
})
