import { describe, it, expect } from "vitest"
import { createAnchor, resolveAnchor } from "./anchoring"

describe("createAnchor", () => {
  const doc = "The quick brown fox jumps over the lazy dog"

  it("creates anchor with exact text, prefix, suffix, and hint", () => {
    const anchor = createAnchor(doc, 10, 19) // "brown fox"
    expect(anchor.exact).toBe("brown fox")
    expect(anchor.hint).toBe(10)
    expect(anchor.prefix).toBe("The quick ")
    expect(anchor.suffix).toBe(" jumps over the lazy dog")
  })

  it("handles start of document (short prefix)", () => {
    const anchor = createAnchor(doc, 0, 3) // "The"
    expect(anchor.exact).toBe("The")
    expect(anchor.prefix).toBe("")
    expect(anchor.hint).toBe(0)
  })

  it("handles end of document (short suffix)", () => {
    const anchor = createAnchor(doc, 40, 43) // "dog"
    expect(anchor.exact).toBe("dog")
    expect(anchor.suffix).toBe("")
  })

  it("captures up to 32 chars of context", () => {
    const long = "a".repeat(100) + "TARGET" + "b".repeat(100)
    const anchor = createAnchor(long, 100, 106)
    expect(anchor.exact).toBe("TARGET")
    expect(anchor.prefix).toHaveLength(32)
    expect(anchor.suffix).toHaveLength(32)
  })
})

describe("resolveAnchor", () => {
  const doc = "The quick brown fox jumps over the lazy dog"

  it("fast path: hint position matches exactly", () => {
    const anchor = createAnchor(doc, 10, 19)
    const result = resolveAnchor(doc, anchor)
    expect(result).toEqual({ from: 10, to: 19 })
  })

  it("round-trip on same doc returns original range", () => {
    const anchor = createAnchor(doc, 4, 9) // "quick"
    const result = resolveAnchor(doc, anchor)
    expect(result).toEqual({ from: 4, to: 9 })
  })

  it("finds text when hint is stale (text moved)", () => {
    const anchor = createAnchor(doc, 10, 19) // "brown fox"
    const edited = "INSERTED " + doc // prepend 9 chars
    const result = resolveAnchor(edited, anchor)
    expect(result).not.toBeNull()
    expect(edited.slice(result!.from, result!.to)).toBe("brown fox")
  })

  it("disambiguates multiple matches using prefix/suffix", () => {
    const doc = "the cat and the dog and the bird"
    const anchor = createAnchor(doc, 16, 19) // second "the" (before "dog")
    // All three "the" match exactly, but prefix/suffix should pick the right one
    const result = resolveAnchor(doc, anchor)
    expect(result).toEqual({ from: 16, to: 19 })
  })

  it("returns null when text is completely deleted", () => {
    const anchor = createAnchor(doc, 10, 19) // "brown fox"
    const edited = "completely different text here"
    const result = resolveAnchor(edited, anchor)
    expect(result).toBeNull()
  })

  it("fuzzy matches text with minor edits", () => {
    // Use a longer pattern so 20% error threshold allows a match
    const longDoc = "The quick brown fox jumps over the extremely lazy dog nearby"
    const anchor = createAnchor(longDoc, 4, 29) // "quick brown fox jumps over" (25 chars, allows ~5 errors)
    const edited = "The quikc brewn fox jumpz over the extremely lazy dog nearby"
    const result = resolveAnchor(edited, anchor)
    expect(result).not.toBeNull()
  })

  it("round-trip after insertion before anchor", () => {
    const anchor = createAnchor(doc, 10, 19) // "brown fox"
    const edited = "The quick XXX brown fox jumps over the lazy dog"
    const result = resolveAnchor(edited, anchor)
    expect(result).not.toBeNull()
    expect(edited.slice(result!.from, result!.to)).toBe("brown fox")
  })

  it("handles long patterns (>31 chars) via seed+validate", () => {
    const longText = "a".repeat(50) + "THIS_IS_A_VERY_LONG_PATTERN_THAT_EXCEEDS_31_CHARS" + "b".repeat(50)
    const anchor = createAnchor(longText, 50, 100)
    expect(anchor.exact).toHaveLength(50)

    // Resolve on same doc
    const result = resolveAnchor(longText, anchor)
    expect(result).toEqual({ from: 50, to: 100 })

    // Resolve after slight edit
    const edited = "c".repeat(10) + longText
    const result2 = resolveAnchor(edited, anchor)
    expect(result2).not.toBeNull()
    expect(edited.slice(result2!.from, result2!.to)).toBe(anchor.exact)
  })

  it("handles anchor at very start of document", () => {
    const anchor = createAnchor(doc, 0, 3) // "The"
    const result = resolveAnchor(doc, anchor)
    expect(result).toEqual({ from: 0, to: 3 })
  })

  it("handles anchor at very end of document", () => {
    const anchor = createAnchor(doc, 40, 43) // "dog"
    const result = resolveAnchor(doc, anchor)
    expect(result).toEqual({ from: 40, to: 43 })
  })
})
