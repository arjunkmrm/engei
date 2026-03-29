/**
 * Resize Test — Phase 3 Hardening
 *
 * Verifies that the Pretext height oracle handles container resize correctly:
 * cache invalidation, width update, and height re-estimation.
 *
 * Run with: bunx playwright test tests/live-layout/resize.spec.ts
 */

import { test, expect } from "@playwright/test"

test("height estimation adapts to viewport resize", async ({ page }) => {
  await page.goto("/?fixture=/fixtures/long-scroll.md")
  await page.waitForSelector(".cm-editor", { timeout: 10000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => (window as any).__cm, { timeout: 5000 })
  await page.waitForTimeout(1000)

  // Measure content height at initial width (1280px viewport)
  const initial = await page.evaluate(() => {
    const view = (window as any).__cm
    return {
      contentHeight: Math.round(view.contentHeight),
      docLines: view.state.doc.lines,
    }
  })

  console.log(`Initial: ${initial.contentHeight}px for ${initial.docLines} lines at 1280px viewport`)

  // Resize to narrow viewport
  await page.setViewportSize({ width: 800, height: 720 })
  await page.waitForTimeout(500)

  const narrow = await page.evaluate(() => {
    const view = (window as any).__cm
    const cmContent = document.querySelector(".cm-content") as HTMLElement
    return {
      contentHeight: Math.round(view.contentHeight),
      contentWidth: Math.round(cmContent?.getBoundingClientRect().width || 0),
    }
  })

  console.log(`Narrow (800px): ${narrow.contentHeight}px, content width: ${narrow.contentWidth}px`)

  // Content should be taller when container is narrower (more wrapping)
  expect(narrow.contentHeight).toBeGreaterThan(initial.contentHeight)

  // Resize back to wide viewport
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.waitForTimeout(500)

  const restored = await page.evaluate(() => {
    const view = (window as any).__cm
    return { contentHeight: Math.round(view.contentHeight) }
  })

  console.log(`Restored (1280px): ${restored.contentHeight}px`)

  // Content height should return close to initial (within 5%)
  const drift = Math.abs(restored.contentHeight - initial.contentHeight)
  const driftPct = (drift / initial.contentHeight) * 100
  console.log(`Resize round-trip drift: ${drift}px (${driftPct.toFixed(1)}%)`)

  expect(driftPct, "Resize round-trip should be within 5%").toBeLessThan(5)
})
