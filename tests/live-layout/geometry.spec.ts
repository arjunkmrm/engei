/**
 * Geometry Tests — Layer 3 Integration
 *
 * Verifies that the Pretext-enhanced HeightOracle produces correct
 * block positions and heights in the running editor. Tests the
 * public CM6 API (lineBlockAt, coordsAtPos, posAtCoords).
 *
 * Run with: bunx playwright test tests/live-layout/geometry.spec.ts
 */

import { test, expect } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector(".cm-editor", { timeout: 10000 })
  await page.evaluate(() => document.fonts.ready)
  // Wait for EditorView to be exposed on window.__cm
  await page.waitForFunction(() => (window as any).__cm, { timeout: 5000 })
  await page.waitForTimeout(300)
})

test("visible line blocks match DOM positions", async ({ page }) => {
  const results = await page.evaluate(() => {
    const view = (window as any).__cm
    if (!view) return { error: "no view found" }

    const lines = document.querySelectorAll(".cm-line")
    const errors: Array<{ line: number; topErr: number; heightErr: number }> = []

    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      const el = lines[i] as HTMLElement
      const rect = el.getBoundingClientRect()
      if (rect.height === 0) continue

      // Get the document position for the start of this line
      const pos = view.posAtDOM(el, 0)
      if (pos == null) continue

      const block = view.lineBlockAt(pos)
      const docTop = view.documentTop

      const domTop = rect.top - docTop
      const topErr = Math.abs(domTop - block.top)
      const heightErr = Math.abs(rect.height - block.height)

      if (topErr > 1 || heightErr > 1) {
        errors.push({ line: i + 1, topErr: Math.round(topErr * 10) / 10, heightErr: Math.round(heightErr * 10) / 10 })
      }
    }

    return { errors, lineCount: lines.length }
  })

  if ("error" in results) {
    console.log("Could not access EditorView — checking alternative access method")
    // Try finding the view via window.__cm (would need to expose it in demo)
    test.skip()
    return
  }

  console.log(`Checked ${results.lineCount} lines, ${results.errors.length} with errors > 1px`)
  if (results.errors.length > 0) {
    for (const e of results.errors.slice(0, 10)) {
      console.log(`  Line ${e.line}: topErr=${e.topErr}px heightErr=${e.heightErr}px`)
    }
  }

  // Hard gate: no line should have > 1px error
  expect(results.errors.length).toBe(0)
})

test("coordsAtPos round-trip", async ({ page }) => {
  const result = await page.evaluate(() => {
    const view = (window as any).__cm
    if (!view) return { error: "no view" }

    let failures = 0
    let tested = 0
    const doc = view.state.doc

    // Test 20 positions spread across the document
    for (let i = 0; i < 20; i++) {
      const pos = Math.floor((i / 20) * doc.length)
      const coords = view.coordsAtPos(pos)
      if (!coords) continue

      const back = view.posAtCoords({ x: coords.left, y: (coords.top + coords.bottom) / 2 })
      tested++

      // posAtCoords returns {pos} or null
      if (back == null || Math.abs(back.pos - pos) > 1) {
        failures++
      }
    }

    return { failures, tested }
  })

  if ("error" in result) {
    test.skip()
    return
  }

  console.log(`Round-trip tested ${result.tested} positions, ${result.failures} failures`)
  expect(result.failures).toBe(0)
})
