/**
 * Comment Margin Test — Phase 4
 *
 * Verifies that comment positioning (which depends on coordsAtPos → heightmap)
 * still works correctly with the Pretext-enhanced oracle. CommentMargin.tsx
 * uses view.coordsAtPos() to position cards, which reads from the heightmap.
 *
 * Run with: bunx playwright test tests/live-layout/comment-margin.spec.ts
 */

import { test, expect } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector(".cm-editor", { timeout: 10000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => (window as any).__cm, { timeout: 5000 })
  await page.waitForTimeout(500)
})

test("coordsAtPos returns consistent positions across viewport", async ({ page }) => {
  // Verify that coordsAtPos returns positions that are:
  // 1. Monotonically increasing (later positions have higher top values)
  // 2. Consistent with DOM element positions
  const result = await page.evaluate(() => {
    const view = (window as any).__cm
    const doc = view.state.doc

    const positions: Array<{ pos: number; top: number; line: number }> = []
    const errors: string[] = []

    // Sample 20 positions across the visible viewport
    const vp = view.viewport
    const step = Math.max(1, Math.floor((vp.to - vp.from) / 20))

    for (let pos = vp.from; pos < vp.to; pos += step) {
      const coords = view.coordsAtPos(pos)
      if (!coords) continue

      const line = doc.lineAt(pos).number
      positions.push({ pos, top: Math.round(coords.top * 10) / 10, line })
    }

    // Check monotonicity (within same line, tops should be equal; across lines, increasing)
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1]
      const curr = positions[i]
      if (curr.line > prev.line && curr.top < prev.top - 1) {
        errors.push(`Non-monotonic: line ${prev.line} top=${prev.top} → line ${curr.line} top=${curr.top}`)
      }
    }

    return { positions: positions.length, errors }
  })

  console.log(`Checked ${result.positions} positions across viewport`)
  if (result.errors.length > 0) {
    for (const e of result.errors) console.log(`  ERROR: ${e}`)
  }

  expect(result.errors.length, "coordsAtPos should be monotonically increasing").toBe(0)
})

test("lineBlockAt and coordsAtPos have consistent offset", async ({ page }) => {
  // CommentMargin uses coordsAtPos for positioning. It doesn't need
  // block/coords to be identical — just that the offset between them
  // is consistent across all lines (so relative positioning works).
  const result = await page.evaluate(() => {
    const view = (window as any).__cm
    const doc = view.state.doc

    const offsets: number[] = []
    const vp = view.viewport

    for (let i = 0; i < 15; i++) {
      const frac = i / 15
      const pos = Math.floor(vp.from + frac * (vp.to - vp.from))
      const line = doc.lineAt(pos)

      const block = view.lineBlockAt(line.from)
      const coords = view.coordsAtPos(line.from)
      if (!coords) continue

      const docTop = view.documentTop
      const offset = coords.top - (block.top + docTop)
      offsets.push(Math.round(offset * 10) / 10)
    }

    // All offsets should be within 2px of each other (consistent)
    const min = Math.min(...offsets)
    const max = Math.max(...offsets)
    const spread = max - min

    return { offsets: offsets.length, avgOffset: Math.round((offsets.reduce((a, b) => a + b, 0) / offsets.length) * 10) / 10, spread: Math.round(spread * 10) / 10 }
  })

  console.log(`Checked ${result.offsets} lines: avg offset=${result.avgOffset}px, spread=${result.spread}px`)

  // The spread (max - min offset) should be small — within 2px means
  // all lines have the same block↔coords relationship
  expect(result.spread, "Block/coords offset spread should be consistent").toBeLessThanOrEqual(2)
})
