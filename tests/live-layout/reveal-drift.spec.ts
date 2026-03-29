/**
 * Reveal-Drift Test — Layer 3 Integration
 *
 * The key HeightMapGap test: scrolls to off-screen positions that were
 * estimated by the oracle, waits for DOM measurement to replace the estimate,
 * and checks how much the position shifted. This directly tests the
 * user-visible failure mode (scroll jump on reveal).
 *
 * Run with: bunx playwright test tests/live-layout/reveal-drift.spec.ts
 */

import { test, expect } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector(".cm-editor", { timeout: 10000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => (window as any).__cm, { timeout: 5000 })
  await page.waitForTimeout(300)
})

test("offscreen estimate stays stable after reveal", async ({ page }) => {
  const drift = await page.evaluate(async () => {
    const view = (window as any).__cm
    if (!view) return { error: "no view" }

    const scroller = document.querySelector(".cm-scroller") as HTMLElement
    if (!scroller) return { error: "no scroller" }

    const doc = view.state.doc
    const drifts: Array<{ pos: number; line: number; before: number; after: number; drift: number }> = []

    // Test 5 positions in the bottom half of the document (likely off-screen)
    for (let i = 0; i < 5; i++) {
      // Reset to top first
      scroller.scrollTop = 0
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      // Pick a position in the bottom half
      const frac = 0.5 + (i / 10)
      const pos = Math.floor(frac * doc.length)
      const lineNum = doc.lineAt(pos).number

      // Read the estimated position (before scrolling into view)
      const before = view.lineBlockAt(pos).top

      // Scroll to reveal it
      scroller.scrollTop = Math.max(0, before - 120)
      // Wait for CM6 to measure and update
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      await new Promise(r => requestAnimationFrame(r))

      // Read the measured position (after DOM measurement)
      const after = view.lineBlockAt(pos).top
      const d = Math.abs(after - before)

      drifts.push({ pos, line: lineNum, before: Math.round(before), after: Math.round(after), drift: Math.round(d * 10) / 10 })
    }

    return { drifts }
  })

  if ("error" in drift) {
    console.log("Could not access EditorView:", drift.error)
    test.skip()
    return
  }

  console.log("Reveal drift results:")
  let maxDrift = 0
  for (const d of drift.drifts) {
    console.log(`  Line ${d.line} (pos ${d.pos}): before=${d.before}px after=${d.after}px drift=${d.drift}px`)
    maxDrift = Math.max(maxDrift, d.drift)
  }
  console.log(`  Max drift: ${maxDrift}px (threshold: 8px)`)

  // Hard gate: reveal drift must be <= 8px
  for (const d of drift.drifts) {
    expect(d.drift, `Line ${d.line} drift exceeded threshold`).toBeLessThanOrEqual(8)
  }
})

test("full scroll — no large jumps", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const view = (window as any).__cm
    if (!view) return { error: "no view" }

    const scroller = document.querySelector(".cm-scroller") as HTMLElement
    if (!scroller) return { error: "no scroller" }

    const scrollHeight = scroller.scrollHeight
    const viewportHeight = scroller.clientHeight
    const steps = Math.ceil(scrollHeight / (viewportHeight * 0.5))
    const jumps: Array<{ step: number; scrollTop: number; contentHeight: number; delta: number }> = []

    let prevContentHeight = view.contentHeight

    for (let step = 0; step <= steps; step++) {
      scroller.scrollTop = step * viewportHeight * 0.5
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      const contentHeight = view.contentHeight
      const delta = Math.abs(contentHeight - prevContentHeight)

      // Content height shouldn't jump dramatically between scroll steps
      // (small changes are expected as measurements replace estimates)
      if (delta > 20) {
        jumps.push({
          step,
          scrollTop: Math.round(scroller.scrollTop),
          contentHeight: Math.round(contentHeight),
          delta: Math.round(delta),
        })
      }
      prevContentHeight = contentHeight
    }

    return {
      totalSteps: steps,
      jumps,
      finalContentHeight: Math.round(view.contentHeight),
    }
  })

  if ("error" in result) {
    test.skip()
    return
  }

  console.log(`Scrolled ${result.totalSteps} steps, ${result.jumps.length} large jumps (>20px content height change)`)
  if (result.jumps.length > 0) {
    for (const j of result.jumps.slice(0, 10)) {
      console.log(`  Step ${j.step}: scrollTop=${j.scrollTop}px contentHeight=${j.contentHeight}px Δ=${j.delta}px`)
    }
  }
  console.log(`Final content height: ${result.finalContentHeight}px`)

  // Soft gate: flag but don't fail on moderate jumps
  // Hard gate: no single jump > 50px
  for (const j of result.jumps) {
    expect(j.delta, `Step ${j.step}: content height jumped ${j.delta}px`).toBeLessThanOrEqual(50)
  }
})
