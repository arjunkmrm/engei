/**
 * Performance Test — Phase 4
 *
 * Benchmarks the Pretext-enhanced height oracle to verify it doesn't
 * add perceptible latency to scroll and editing operations.
 *
 * Run with: bunx playwright test tests/live-layout/perf.spec.ts
 */

import { test, expect } from "@playwright/test"

test("height estimation performance on long document", async ({ page }) => {
  await page.goto("/?fixture=/fixtures/long-scroll.md")
  await page.waitForSelector(".cm-editor", { timeout: 10000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => (window as any).__cm, { timeout: 5000 })
  await page.waitForTimeout(1000)

  const result = await page.evaluate(async () => {
    const view = (window as any).__cm
    const scroller = document.querySelector(".cm-scroller") as HTMLElement
    if (!view || !scroller) return { error: "no view" }

    // Benchmark: rapid scroll through document measuring frame timing
    const frameTimes: number[] = []
    const scrollHeight = scroller.scrollHeight
    const steps = 20

    for (let i = 0; i <= steps; i++) {
      const start = performance.now()
      scroller.scrollTop = (i / steps) * scrollHeight
      await new Promise(r => requestAnimationFrame(r))
      const elapsed = performance.now() - start
      frameTimes.push(Math.round(elapsed * 100) / 100)
    }

    // Benchmark: typing at cursor position (triggers heightmap re-estimation)
    const typeTimes: number[] = []
    for (let i = 0; i < 10; i++) {
      const start = performance.now()
      view.dispatch({ changes: { from: 0, insert: "x" } })
      await new Promise(r => requestAnimationFrame(r))
      const elapsed = performance.now() - start
      typeTimes.push(Math.round(elapsed * 100) / 100)
    }
    // Clean up
    view.dispatch({ changes: { from: 0, to: 10, insert: "" } })

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b) / arr.length
    const max = (arr: number[]) => Math.max(...arr)
    const p95 = (arr: number[]) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length * 0.95)] }

    return {
      scroll: { avg: Math.round(avg(frameTimes) * 10) / 10, max: Math.round(max(frameTimes) * 10) / 10, p95: Math.round(p95(frameTimes) * 10) / 10 },
      type: { avg: Math.round(avg(typeTimes) * 10) / 10, max: Math.round(max(typeTimes) * 10) / 10, p95: Math.round(p95(typeTimes) * 10) / 10 },
      docLines: view.state.doc.lines,
    }
  })

  if ("error" in result) {
    test.skip()
    return
  }

  console.log(`Performance on ${result.docLines}-line document:`)
  console.log(`  Scroll: avg=${result.scroll.avg}ms, p95=${result.scroll.p95}ms, max=${result.scroll.max}ms`)
  console.log(`  Type:   avg=${result.type.avg}ms, p95=${result.type.p95}ms, max=${result.type.max}ms`)

  // Frame budget: 16.7ms for 60fps
  // Allow 2x budget (33ms) for scroll operations (includes Pretext + DOM)
  expect(result.scroll.p95, "Scroll p95 frame time").toBeLessThan(33)
  // Typing should be fast — Pretext only runs for the changed line
  expect(result.type.p95, "Type p95 frame time").toBeLessThan(33)
})
