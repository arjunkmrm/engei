/**
 * Soft Continuation (Shift+Enter) — Playwright Test
 *
 * Run with: bunx playwright test tests/live-layout/soft-continuation.spec.ts
 */

import { test, expect } from "@playwright/test"

async function setContent(page: any, doc: string) {
  await page.evaluate((d: string) => {
    const view = (window as any).__cm
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: d },
      selection: { anchor: d.length },
    })
    view.focus()
  }, doc)
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    const view = (window as any).__cm
    view.dispatch({ selection: view.state.selection })
  })
  await page.waitForTimeout(200)
}

async function getContent(page: any): Promise<string> {
  return page.evaluate(() => (window as any).__cm.state.doc.toString())
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector(".cm-editor", { timeout: 10000 })
  await page.waitForFunction(() => (window as any).__cm, { timeout: 5000 })
  await page.waitForTimeout(500)
})

test("Shift+Enter in list item creates continuation with spaces", async ({ page }) => {
  await setContent(page, "- Hello world")
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(300)

  const result = await getContent(page)
  expect(result).toBe("- Hello world\n  ")
})

test("Shift+Enter in nested list creates deeper indent", async ({ page }) => {
  await setContent(page, "- Top\n    - Nested item")
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(300)

  const result = await getContent(page)
  expect(result).toBe("- Top\n    - Nested item\n      ")
})

test("Shift+Enter outside list inserts plain newline", async ({ page }) => {
  await setContent(page, "Just text")
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(300)

  const result = await getContent(page)
  expect(result).toBe("Just text\n")
})

test("Enter still creates new list item", async ({ page }) => {
  await setContent(page, "- First item")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)

  const result = await getContent(page)
  expect(result).toBe("- First item\n- ")
})

test("continuation text stays indented on subsequent Shift+Enter", async ({ page }) => {
  await setContent(page, "- Hello world")

  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(200)
  await page.keyboard.type("line two", { delay: 20 })
  await page.waitForTimeout(200)
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(300)

  const result = await getContent(page)
  expect(result).toBe("- Hello world\n  line two\n  ")
})

test("Enter on continuation line creates new list item", async ({ page }) => {
  await setContent(page, "- foo")
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(200)
  await page.keyboard.type("bar", { delay: 20 })
  await page.waitForTimeout(200)
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)

  const result = await getContent(page)
  expect(result).toBe("- foo\n  bar\n- ")
})

test("Enter on nested continuation creates sibling", async ({ page }) => {
  await setContent(page, "- top\n    - nested")
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(200)
  await page.keyboard.type("cont", { delay: 20 })
  await page.waitForTimeout(200)
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)

  const result = await getContent(page)
  expect(result).toBe("- top\n    - nested\n      cont\n    - ")
})
