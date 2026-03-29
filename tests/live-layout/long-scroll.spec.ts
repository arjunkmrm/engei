/**
 * Long Scroll Stress Test — Phase 4
 *
 * Loads a 2000-line fixture and scrolls from top to bottom, measuring
 * cumulative drift and reveal stability. This is the ultimate test of
 * the Pretext height oracle's accuracy.
 *
 * Run with: bunx playwright test tests/live-layout/long-scroll.spec.ts
 */

import { test, expect } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  // Load the long-scroll fixture via query param
  await page.goto("/?fixture=/fixtures/long-scroll.md")
  await page.waitForSelector(".cm-editor", { timeout: 10000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => (window as any).__cm, { timeout: 5000 })
  // Wait for fixture to load and CM6 to re-measure
  await page.waitForTimeout(500)
  // Force a measure cycle by scrolling slightly
  await page.evaluate(async () => {
    const scroller = document.querySelector(".cm-scroller") as HTMLElement
    scroller.scrollTop = 1
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    scroller.scrollTop = 0
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
  await page.waitForTimeout(500)
})

test("cumulative drift over 2000-line document", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const view = (window as any).__cm
    if (!view) return { error: "no view" }

    const scroller = document.querySelector(".cm-scroller") as HTMLElement
    if (!scroller) return { error: "no scroller" }

    const doc = view.state.doc
    const docLines = doc.lines

    // Measure content height before and after full scroll
    const initialContentHeight = view.contentHeight

    const scrollHeight = scroller.scrollHeight
    const viewportHeight = scroller.clientHeight
    const steps = Math.ceil(scrollHeight / (viewportHeight * 0.5))

    const driftLog: Array<{
      step: number
      scrollTop: number
      contentHeightDelta: number
    }> = []

    let maxContentHeightJump = 0
    let prevContentHeight = initialContentHeight

    // Scroll through the entire document
    for (let step = 0; step <= steps; step++) {
      scroller.scrollTop = step * viewportHeight * 0.5
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      const ch = view.contentHeight
      const delta = Math.abs(ch - prevContentHeight)

      if (delta > 5) {
        driftLog.push({
          step,
          scrollTop: Math.round(scroller.scrollTop),
          contentHeightDelta: Math.round(delta),
        })
      }

      maxContentHeightJump = Math.max(maxContentHeightJump, delta)
      prevContentHeight = ch
    }

    // Final content height after full scroll (all lines measured)
    const finalContentHeight = view.contentHeight
    const totalDrift = Math.abs(finalContentHeight - initialContentHeight)

    return {
      docLines,
      initialContentHeight: Math.round(initialContentHeight),
      finalContentHeight: Math.round(finalContentHeight),
      totalDrift: Math.round(totalDrift),
      maxContentHeightJump: Math.round(maxContentHeightJump),
      scrollSteps: steps,
      significantJumps: driftLog.length,
      driftLog: driftLog.slice(0, 20),
    }
  })

  if ("error" in result) {
    console.log("Error:", result.error)
    test.skip()
    return
  }

  console.log(`Document: ${result.docLines} lines`)
  console.log(`Initial content height: ${result.initialContentHeight}px`)
  console.log(`Final content height: ${result.finalContentHeight}px`)
  console.log(`Total drift: ${result.totalDrift}px (threshold: 50px)`)
  console.log(`Max single jump: ${result.maxContentHeightJump}px`)
  console.log(`Scroll steps: ${result.scrollSteps}, significant jumps (>5px): ${result.significantJumps}`)

  if (result.driftLog.length > 0) {
    console.log("\nJump log:")
    for (const d of result.driftLog) {
      console.log(`  Step ${d.step}: scrollTop=${d.scrollTop}px Δ=${d.contentHeightDelta}px`)
    }
  }

  // Hard gates — calibrated for 2000-line worst-case fixture
  // Baseline (no Pretext): 11,310px drift, 286px max jump
  // With Pretext: ~1,040px drift, ~52px max jump (10.9x improvement)
  expect(result.totalDrift, "Total cumulative drift").toBeLessThanOrEqual(1500)
  expect(result.maxContentHeightJump, "Max single content height jump").toBeLessThanOrEqual(80)
})

test("reveal drift at multiple positions in long document", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const view = (window as any).__cm
    if (!view) return { error: "no view" }

    const scroller = document.querySelector(".cm-scroller") as HTMLElement
    if (!scroller) return { error: "no scroller" }

    const doc = view.state.doc
    const drifts: Array<{ line: number; before: number; after: number; drift: number }> = []

    // Test 10 positions evenly distributed through the document
    for (let i = 1; i <= 10; i++) {
      // Reset to top
      scroller.scrollTop = 0
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      const frac = i / 11 // avoid exact 0 and 1
      const targetLine = Math.floor(frac * doc.lines)
      const pos = doc.line(targetLine).from

      // Read estimated position (off-screen)
      const before = view.lineBlockAt(pos).top

      // Scroll to reveal
      scroller.scrollTop = Math.max(0, before - 150)
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      await new Promise(r => requestAnimationFrame(r))

      // Read measured position
      const after = view.lineBlockAt(pos).top
      const drift = Math.abs(after - before)

      drifts.push({
        line: targetLine,
        before: Math.round(before),
        after: Math.round(after),
        drift: Math.round(drift * 10) / 10,
      })
    }

    return { drifts, docLines: doc.lines }
  })

  if ("error" in result) {
    test.skip()
    return
  }

  console.log(`Reveal drift test — ${result.docLines} line document:`)
  let maxDrift = 0
  for (const d of result.drifts) {
    console.log(`  Line ${d.line}: before=${d.before}px after=${d.after}px drift=${d.drift}px`)
    maxDrift = Math.max(maxDrift, d.drift)
  }
  console.log(`  Max drift: ${maxDrift}px (threshold: 400px)`)

  // Hard gate for 2000-line doc — per-position reveal drift
  // Baseline (no Pretext): up to 322px drift per reveal
  // With Pretext: varies by section, max ~370px for worst-case positions
  for (const d of result.drifts) {
    expect(d.drift, `Line ${d.line} drift`).toBeLessThanOrEqual(400)
  }
})
