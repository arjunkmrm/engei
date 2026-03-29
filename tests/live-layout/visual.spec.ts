/**
 * Visual Regression Test — Phase 4
 *
 * Screenshots the editor at key scroll positions. These serve as golden
 * images for detecting layout regressions after future changes.
 *
 * Run with: bunx playwright test tests/live-layout/visual.spec.ts
 * Update goldens: bunx playwright test tests/live-layout/visual.spec.ts --update-snapshots
 */

import { test, expect } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/?fixture=/fixtures/long-scroll.md")
  await page.waitForSelector(".cm-editor", { timeout: 10000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => (window as any).__cm, { timeout: 5000 })
  await page.waitForTimeout(1000)
})

test("editor renders correctly at top", async ({ page }) => {
  const editor = page.locator(".cm-editor")
  await expect(editor).toHaveScreenshot("editor-top.png", { maxDiffPixelRatio: 0.01 })
})

test("editor renders correctly at middle", async ({ page }) => {
  await page.evaluate(async () => {
    const scroller = document.querySelector(".cm-scroller") as HTMLElement
    scroller.scrollTop = scroller.scrollHeight / 2
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
  await page.waitForTimeout(300)

  const editor = page.locator(".cm-editor")
  await expect(editor).toHaveScreenshot("editor-middle.png", { maxDiffPixelRatio: 0.01 })
})

test("editor renders correctly at bottom", async ({ page }) => {
  await page.evaluate(async () => {
    const scroller = document.querySelector(".cm-scroller") as HTMLElement
    scroller.scrollTop = scroller.scrollHeight
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
  await page.waitForTimeout(300)

  const editor = page.locator(".cm-editor")
  await expect(editor).toHaveScreenshot("editor-bottom.png", { maxDiffPixelRatio: 0.01 })
})
