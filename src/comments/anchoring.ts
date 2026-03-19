/**
 * Text-quote anchoring for comments.
 * Stores { exact, prefix, suffix, hint } and resolves via exact match + fuzzy fallback.
 */

import type { Anchor } from "../types"

const CONTEXT_LEN = 32

// ─── Create anchor ─────────────────────────────────────────────

export function createAnchor(doc: string, from: number, to: number): Anchor {
  const exact = doc.slice(from, to)
  const prefix = doc.slice(Math.max(0, from - CONTEXT_LEN), from)
  const suffix = doc.slice(to, to + CONTEXT_LEN)
  return { exact, prefix, suffix, hint: from }
}

// ─── Resolve anchor ────────────────────────────────────────────

export function resolveAnchor(doc: string, anchor: Anchor): { from: number; to: number } | null {
  // 1. Fast: try hint position, validate against exact
  if (anchor.hint != null && anchor.hint >= 0) {
    const end = anchor.hint + anchor.exact.length
    if (end <= doc.length && doc.slice(anchor.hint, end) === anchor.exact) {
      return { from: anchor.hint, to: end }
    }
  }

  // 2. Exact substring search with prefix/suffix disambiguation
  const exact = findExact(doc, anchor.exact, anchor.prefix, anchor.suffix, anchor.hint)
  if (exact) return exact

  // 3. Fuzzy fallback (Bitap for short patterns, seed+validate for long)
  const maxErrors = Math.max(1, Math.floor(anchor.exact.length * 0.2))
  const fuzzy = fuzzyFind(doc, anchor.exact, maxErrors, anchor.hint)
  if (!fuzzy) return null

  return { from: fuzzy.start, to: fuzzy.end }
}

// ─── Batch resolve ─────────────────────────────────────────────

export function resolveAnchors(doc: string, anchors: Anchor[]): ({ from: number; to: number } | null)[] {
  return anchors.map(a => resolveAnchor(doc, a))
}

// ─── Exact match with disambiguation ───────────────────────────

function findExact(doc: string, exact: string, prefix: string, suffix: string, hint: number): { from: number; to: number } | null {
  const matches: number[] = []
  let idx = 0
  while (true) {
    const found = doc.indexOf(exact, idx)
    if (found === -1) break
    matches.push(found)
    idx = found + 1
  }

  if (matches.length === 0) return null
  if (matches.length === 1) return { from: matches[0], to: matches[0] + exact.length }

  // Score each match by prefix/suffix + proximity to hint
  let bestScore = -1
  let bestMatch: { from: number; to: number } | null = null
  for (const start of matches) {
    const end = start + exact.length
    let score = 0

    if (prefix) {
      const before = doc.slice(Math.max(0, start - prefix.length), start)
      if (before.endsWith(prefix)) score += 3
      else if (before.includes(prefix.slice(-10))) score += 1
    }
    if (suffix) {
      const after = doc.slice(end, end + suffix.length)
      if (after.startsWith(suffix)) score += 3
      else if (after.includes(suffix.slice(0, 10))) score += 1
    }

    // Proximity bonus (closer to hint = better)
    if (hint != null) {
      const dist = Math.abs(start - hint)
      score += Math.max(0, 2 - dist / 500)
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = { from: start, to: end }
    }
  }

  return bestMatch
}

// ─── Fuzzy matching (Bitap) ────────────────────────────────────

function fuzzyFind(text: string, pattern: string, maxErrors: number, hint: number): { start: number; end: number; errors: number } | null {
  const m = pattern.length
  if (m === 0) return null
  if (m > 31) return seedAndValidate(text, pattern, maxErrors, hint)

  const patternMask = new Array(256).fill(~0)
  for (let i = 0; i < m; i++) {
    patternMask[pattern.charCodeAt(i)] &= ~(1 << i)
  }

  const matchBit = 1 << (m - 1)
  let bestErrors = maxErrors + 1
  let bestEnd = -1

  const R = new Array(maxErrors + 1).fill(~0)

  for (let i = 0; i < text.length; i++) {
    const charMask = patternMask[text.charCodeAt(i)] ?? ~0
    const oldR = R.slice()

    R[0] = (oldR[0] << 1) | charMask
    for (let d = 1; d <= maxErrors; d++) {
      R[d] =
        ((oldR[d] << 1) | charMask) &
        (oldR[d - 1] << 1) &
        ((oldR[d - 1] | R[d - 1]) << 1) &
        oldR[d - 1]
    }

    for (let d = 0; d <= maxErrors; d++) {
      if ((R[d] & matchBit) === 0) {
        if (d < bestErrors) {
          bestErrors = d
          bestEnd = i
        }
        break
      }
    }
  }

  if (bestEnd === -1) return null

  // Approximate start
  const start = Math.max(0, bestEnd - m - bestErrors + 1)
  return { start, end: bestEnd + 1, errors: bestErrors }
}

function seedAndValidate(text: string, pattern: string, maxErrors: number, _hint: number): { start: number; end: number; errors: number } | null {
  const seedLen = 28
  const seed = pattern.slice(0, seedLen)
  const seedMaxErrors = Math.min(3, Math.floor(seedLen * 0.15))
  const seedHits = bitapAll(text, seed, seedMaxErrors)
  if (seedHits.length === 0) return null

  const m = pattern.length
  let bestDist = maxErrors + 1
  let bestStart = -1

  for (const hit of seedHits) {
    const candEnd = Math.min(text.length, hit.start + m + maxErrors)
    const candidate = text.slice(hit.start, candEnd)
    const dist = levenshteinBounded(candidate, pattern, bestDist)
    if (dist < bestDist) {
      bestDist = dist
      bestStart = hit.start
      if (dist === 0) break
    }
  }

  if (bestStart === -1 || bestDist > maxErrors) return null
  return { start: bestStart, end: Math.min(text.length, bestStart + m + bestDist), errors: bestDist }
}

function bitapAll(text: string, pattern: string, maxErrors: number): { start: number; end: number; errors: number }[] {
  const m = pattern.length
  if (m === 0 || m > 31) return []

  const patternMask = new Array(256).fill(~0)
  for (let i = 0; i < m; i++) {
    patternMask[pattern.charCodeAt(i)] &= ~(1 << i)
  }
  const matchBit = 1 << (m - 1)
  const hits: { start: number; end: number; errors: number }[] = []
  const R = new Array(maxErrors + 1).fill(~0)

  for (let i = 0; i < text.length; i++) {
    const charMask = patternMask[text.charCodeAt(i)] ?? ~0
    const oldR = R.slice()
    R[0] = (oldR[0] << 1) | charMask
    for (let d = 1; d <= maxErrors; d++) {
      R[d] =
        ((oldR[d] << 1) | charMask) &
        (oldR[d - 1] << 1) &
        ((oldR[d - 1] | R[d - 1]) << 1) &
        oldR[d - 1]
    }
    for (let d = 0; d <= maxErrors; d++) {
      if ((R[d] & matchBit) === 0) {
        hits.push({ start: Math.max(0, i - m - d + 1), end: i + 1, errors: d })
        break
      }
    }
  }
  return hits
}

function levenshteinBounded(a: string, b: string, bound: number): number {
  const m = a.length, n = b.length
  if (Math.abs(m - n) > bound) return bound + 1
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    let rowMin = Infinity
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
      )
      rowMin = Math.min(rowMin, dp[i][j])
    }
    if (rowMin > bound) return bound + 1
  }
  return dp[m][n]
}
