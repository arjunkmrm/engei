/**
 * Marker Visibility Test
 *
 * Verifies that markdown syntax markers (##, **, *, `, >, ~~) are
 * visible with muted styling (cm-live-marker) instead of hidden
 * (cm-live-hidden). The refactored design keeps markers visible
 * to avoid invisible characters that confuse cursor navigation.
 *
 * Run with: bunx playwright test tests/live-layout/marker-visibility.spec.ts
 */

import { test, expect } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector(".cm-editor", { timeout: 10000 })
  await page.waitForFunction(() => (window as any).__cm, { timeout: 5000 })
  await page.waitForTimeout(500)
})

test("no cm-live-hidden class exists in the DOM", async ({ page }) => {
  const hiddenCount = await page.locator(".cm-live-hidden").count()
  expect(hiddenCount).toBe(0)
})

test("cm-live-marker spans exist for heading markers", async ({ page }) => {
  // Set content with a heading
  await page.evaluate(() => {
    const view = (window as any).__cm
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "## Hello World\n\nSome text" },
    })
  })
  await page.waitForTimeout(300)

  const markers = page.locator(".cm-live-marker")
  const count = await markers.count()
  expect(count).toBeGreaterThan(0)

  // The marker should be visible (not display:none, not font-size:0)
  const firstMarker = markers.first()
  const box = await firstMarker.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThan(0)
  expect(box!.height).toBeGreaterThan(0)
})

test("heading ## marker has reduced opacity", async ({ page }) => {
  await page.evaluate(() => {
    const view = (window as any).__cm
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "## Heading\n\nBody text" },
    })
  })
  await page.waitForTimeout(300)

  const marker = page.locator(".cm-live-marker").first()
  const opacity = await marker.evaluate(el => getComputedStyle(el).opacity)
  expect(parseFloat(opacity)).toBeLessThan(1)
  expect(parseFloat(opacity)).toBeGreaterThan(0)
})

test("bold ** markers are visible with reduced opacity", async ({ page }) => {
  await page.evaluate(() => {
    const view = (window as any).__cm
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "Some **bold** text\n\naway" },
    })
  })
  await page.waitForTimeout(300)

  // Should have cm-live-marker for the ** delimiters
  const markers = page.locator(".cm-live-marker")
  const count = await markers.count()
  expect(count).toBeGreaterThan(0)

  // All markers should have non-zero dimensions
  for (let i = 0; i < count; i++) {
    const box = await markers.nth(i).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(0)
  }
})

test("blockquote > marker is visible", async ({ page }) => {
  await page.evaluate(() => {
    const view = (window as any).__cm
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "> Quoted text\n\nNormal text" },
    })
  })
  await page.waitForTimeout(300)

  const markers = page.locator(".cm-live-marker")
  const count = await markers.count()
  expect(count).toBeGreaterThan(0)

  const box = await markers.first().boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThan(0)
})

test("strikethrough ~~ markers are visible", async ({ page }) => {
  await page.evaluate(() => {
    const view = (window as any).__cm
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "Some ~~struck~~ text\n\naway" },
    })
  })
  await page.waitForTimeout(300)

  const markers = page.locator(".cm-live-marker")
  const count = await markers.count()
  expect(count).toBeGreaterThan(0)
})

test("marker text content matches expected syntax characters", async ({ page }) => {
  await page.evaluate(() => {
    const view = (window as any).__cm
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "## Heading\n\n**bold**\n\naway" },
    })
  })
  await page.waitForTimeout(300)

  const markerTexts = await page.locator(".cm-live-marker").allTextContents()
  // Should contain ## (with trailing space) and ** markers
  const joined = markerTexts.join("")
  expect(joined).toContain("##")
  expect(joined).toContain("**")
})

test("visual snapshot — markers muted not hidden", async ({ page }) => {
  await page.evaluate(() => {
    const view = (window as any).__cm
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: [
          "# Heading 1",
          "",
          "## Heading 2",
          "",
          "**bold** and *italic* and `code`",
          "",
          "> Blockquote text",
          "",
          "~~strikethrough~~",
          "",
          "Normal paragraph",
        ].join("\n"),
      },
    })
  })
  await page.waitForTimeout(500)
  await page.evaluate(() => document.fonts.ready)

  const editor = page.locator(".cm-editor")
  await expect(editor).toHaveScreenshot("markers-visible.png", { maxDiffPixelRatio: 0.01 })
})
