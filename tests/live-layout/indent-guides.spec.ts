/**
 * List Indent Guides — Playwright Test
 *
 * Verifies that nested list items show subtle vertical indent guide lines.
 *
 * Run with: bunx playwright test tests/live-layout/indent-guides.spec.ts
 */

import { test, expect } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector(".cm-editor", { timeout: 10000 })
  await page.waitForFunction(() => (window as any).__cm, { timeout: 5000 })
  await page.waitForTimeout(500)
})

test("nested list lines have background indent guides", async ({ page }) => {
  await page.evaluate(() => {
    const view = (window as any).__cm
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "- top\n    - nested\n        - deep" },
    })
    view.focus()
  })
  await page.waitForTimeout(500)

  // The nested line should have background (indent guide from parent)
  const nestedLine = page.locator(".cm-line", { hasText: "nested" })
  const style = await nestedLine.getAttribute("style")
  expect(style).toContain("background")
  expect(style).toContain("linear-gradient")

  // The deep line should have multiple background values (two guides)
  const deepLine = page.locator(".cm-line", { hasText: "deep" })
  const deepStyle = await deepLine.getAttribute("style")
  // Should have 2 inset shadows (one for each ancestor)
  const gradientCount = (deepStyle?.match(/linear-gradient/g) || []).length
  expect(gradientCount).toBe(2)
})

test("top-level list line has no indent guides", async ({ page }) => {
  await page.evaluate(() => {
    const view = (window as any).__cm
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "- top level only\n\nparagraph" },
    })
    view.focus()
  })
  await page.waitForTimeout(500)

  const topLine = page.locator(".cm-line", { hasText: "top level" })
  const style = await topLine.getAttribute("style")
  // Should have padding/text-indent but no background
  expect(style).not.toContain("background")
})

test("visual snapshot — indent guides", async ({ page }) => {
  await page.evaluate(() => {
    const view = (window as any).__cm
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: [
          "- First item",
          "    - Nested under first",
          "        - Deep nested",
          "    - Another nested",
          "- Second item",
          "    - Under second",
        ].join("\n"),
      },
    })
  })
  await page.waitForTimeout(500)
  await page.evaluate(() => document.fonts.ready)

  const editor = page.locator(".cm-editor")
  await expect(editor).toHaveScreenshot("indent-guides.png", { maxDiffPixelRatio: 0.01 })
})
