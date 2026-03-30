/**
 * List Hanging Indent — Playwright Test
 *
 * Verifies that wrapped list item text aligns with content start,
 * not the list marker. Only applies to wrapping within a single
 * .cm-line (the marker line). Continuation lines use literal spaces.
 *
 * Run with: bunx playwright test tests/live-layout/list-indent.spec.ts
 */

import { test, expect } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector(".cm-editor", { timeout: 10000 })
  await page.waitForFunction(() => (window as any).__cm, { timeout: 5000 })
  await page.waitForTimeout(500)
})

test("list item line has hanging indent style", async ({ page }) => {
  await page.evaluate(() => {
    const view = (window as any).__cm
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "- Short item\n\nParagraph" },
      selection: { anchor: 0 },
    })
    view.focus()
  })
  await page.waitForTimeout(500)

  const listLine = page.locator(".cm-line", { hasText: "Short item" })
  const style = await listLine.getAttribute("style")

  expect(style).toContain("padding-left")
  expect(style).toContain("text-indent")
})

test("wrapped list text has px-based hanging indent", async ({ page }) => {
  const longText = "This is a very long list item that should definitely wrap to the next line because it contains so much text"
  await page.evaluate((text) => {
    const view = (window as any).__cm
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: `- ${text}\n\nParagraph after` },
      selection: { anchor: 0 },
    })
    view.focus()
  }, longText)
  await page.waitForTimeout(500)

  const listLine = page.locator(".cm-line", { hasText: "This is a very long" })
  const style = await listLine.getAttribute("style")

  // Should have px-based padding-left and text-indent (measured from DOM)
  expect(style).toMatch(/padding-left:\s*[\d.]+px/)
  expect(style).toMatch(/text-indent:\s*-[\d.]+px/)
})

test("nested list has deeper hanging indent", async ({ page }) => {
  await page.evaluate(() => {
    const view = (window as any).__cm
    const doc = "- Top level\n    - Nested item with some longer text that might wrap"
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: doc },
      selection: { anchor: 0 },
    })
    view.focus()
  })
  await page.waitForTimeout(500)

  // Get both lines' padding values
  const topStyle = await page.locator(".cm-line", { hasText: "Top level" }).getAttribute("style")
  const nestedStyle = await page.locator(".cm-line", { hasText: "Nested item" }).getAttribute("style")

  const topPx = parseFloat(topStyle?.match(/padding-left:\s*([\d.]+)px/)?.[1] || "0")
  const nestedPx = parseFloat(nestedStyle?.match(/padding-left:\s*([\d.]+)px/)?.[1] || "0")

  // Nested should have a larger indent than top-level
  expect(nestedPx).toBeGreaterThan(topPx)
})

test("non-list lines have no hanging indent", async ({ page }) => {
  await page.evaluate(() => {
    const view = (window as any).__cm
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "Just a paragraph\n\n- A list item" },
      selection: { anchor: 0 },
    })
    view.focus()
  })
  await page.waitForTimeout(500)

  const paraLine = page.locator(".cm-line", { hasText: "Just a paragraph" })
  const style = await paraLine.getAttribute("style")

  expect(style ?? "").not.toContain("text-indent")
})

test("visual snapshot — hanging indent", async ({ page }) => {
  const longText = "This is a very long list item that should wrap to show the hanging indent behavior where wrapped text aligns with content"
  await page.evaluate((text) => {
    const view = (window as any).__cm
    const doc = [
      `- ${text}`,
      `- Short item`,
      `    - ${text}`,
      ``,
      `Normal paragraph for comparison`,
    ].join("\n")
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: doc },
    })
  }, longText)
  await page.waitForTimeout(500)
  await page.evaluate(() => document.fonts.ready)

  const editor = page.locator(".cm-editor")
  await expect(editor).toHaveScreenshot("list-hanging-indent.png", { maxDiffPixelRatio: 0.01 })
})
