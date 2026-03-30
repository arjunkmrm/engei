/**
 * List Editing — Comprehensive Test Suite
 *
 * Tests all list editing keyboard behaviors:
 *   Enter, Shift+Enter, Tab, Shift+Tab
 *
 * Run: bunx playwright test tests/live-layout/list-editing.spec.ts
 */

import { test, expect } from "@playwright/test"

async function set(page: any, doc: string) {
  await page.evaluate((d: string) => {
    const view = (window as any).__cm
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: d },
      selection: { anchor: d.length },
    })
    view.focus()
  }, doc)
  await page.waitForTimeout(500)
  // Force tree parse
  await page.evaluate(() => {
    const v = (window as any).__cm
    v.dispatch({ selection: v.state.selection })
  })
  await page.waitForTimeout(200)
}

async function get(page: any): Promise<string> {
  return page.evaluate(() => (window as any).__cm.state.doc.toString())
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector(".cm-editor", { timeout: 10000 })
  await page.waitForFunction(() => (window as any).__cm, { timeout: 5000 })
  await page.waitForTimeout(500)
})

// ─── Rule 1: Enter on line with content → new list item ──────

test("Enter: bullet with content → new bullet", async ({ page }) => {
  await set(page, "- foo")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- foo\n- ")
})

test("Enter: ordered with content → next number", async ({ page }) => {
  await set(page, "1. foo")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. foo\n2. ")
})

test("Enter: nested bullet with content → new sibling", async ({ page }) => {
  await set(page, "- top\n    - nested")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- top\n    - nested\n    - ")
})

test("Enter: nested ordered with content → next number", async ({ page }) => {
  await set(page, "1. top\n    1. nested")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. top\n    1. nested\n    2. ")
})

// ─── Rule 2: Enter on empty nested → outdent ─────────────────

test("Enter: empty nested bullet → outdent to parent bullet", async ({ page }) => {
  await set(page, "- top\n    - nested\n    - ")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- top\n    - nested\n- ")
})

test("Enter: empty nested ordered → outdent + renumber to parent", async ({ page }) => {
  await set(page, "1. top\n    1. nested\n    2. ")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. top\n    1. nested\n2. ")
})

// ─── Rule 3: Enter on empty top-level → exit list ────────────

test("Enter: empty top-level bullet → exit list", async ({ page }) => {
  await set(page, "- foo\n- ")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- foo\n")
})

test("Enter: empty top-level ordered → exit list", async ({ page }) => {
  await set(page, "1. foo\n2. ")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. foo\n")
})

// ─── Rule 4: Enter on continuation → new sibling ─────────────

test("Enter: continuation line → new sibling list item", async ({ page }) => {
  await set(page, "- foo\n  bar")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- foo\n  bar\n- ")
})

// ─── Rule 5: Shift+Enter in list → soft continuation ─────────

test("Shift+Enter: in bullet → continuation with spaces", async ({ page }) => {
  await set(page, "- foo")
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- foo\n  ")
})

test("Shift+Enter: in nested → deeper continuation", async ({ page }) => {
  await set(page, "- top\n    - nested")
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- top\n    - nested\n      ")
})

// ─── Rule 6: Shift+Enter outside list → plain newline ────────

test("Shift+Enter: outside list → plain newline", async ({ page }) => {
  await set(page, "plain text")
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("plain text\n")
})

// ─── Rule 7: Tab → indent + renumber ─────────────────────────

test("Tab: bullet → indent", async ({ page }) => {
  await set(page, "- foo\n- bar")
  await page.keyboard.press("Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- foo\n    - bar")
})

test("Tab: ordered no siblings → reset to 1", async ({ page }) => {
  await set(page, "1. foo\n2. bar")
  await page.keyboard.press("Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. foo\n    1. bar")
})

test("Tab: ordered with siblings → continue sequence", async ({ page }) => {
  await set(page, "1. foo\n    1. a\n    2. b\n2. bar")
  await page.keyboard.press("Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. foo\n    1. a\n    2. b\n    3. bar")
})

// ─── Rule 8: Shift+Tab → outdent + renumber ──────────────────

test("Shift+Tab: nested bullet → outdent", async ({ page }) => {
  await set(page, "- foo\n    - bar")
  await page.keyboard.press("Shift+Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- foo\n- bar")
})

test("Shift+Tab: nested ordered → outdent + continue parent sequence", async ({ page }) => {
  await set(page, "1. foo\n    1. bar")
  await page.keyboard.press("Shift+Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. foo\n2. bar")
})

// ─── Rule 9: Shift+Tab at top level → no-op ──────────────────

test("Shift+Tab: top-level → no change", async ({ page }) => {
  await set(page, "- foo")
  await page.keyboard.press("Shift+Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- foo")
})

// ─── Composite sequences ─────────────────────────────────────

test("sequence: type → Enter → Enter → outdent recursively → exit", async ({ page }) => {
  await set(page, "1. foo")

  // Enter → "2. "
  await page.keyboard.press("Enter")
  await page.waitForTimeout(200)
  await page.keyboard.type("bar", { delay: 20 })
  await page.waitForTimeout(100)

  // Tab → indent to "    1. bar"
  await page.keyboard.press("Tab")
  await page.waitForTimeout(200)

  // Enter → "    2. "
  await page.keyboard.press("Enter")
  await page.waitForTimeout(200)

  // Enter on empty → outdent to "2. "
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)

  const r1 = await get(page)
  expect(r1).toBe("1. foo\n    1. bar\n2. ")

  // Enter on empty → exit list
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)

  const r2 = await get(page)
  expect(r2).toBe("1. foo\n    1. bar\n")
})

test("sequence: Tab then Tab again renumbers correctly", async ({ page }) => {
  await set(page, "1. a\n2. b\n3. c")

  // Tab on "3. c" → should become "    1. c"
  await page.keyboard.press("Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. a\n2. b\n    1. c")

  // Tab on "    1. c" → should become "        1. c"
  await page.keyboard.press("Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. a\n2. b\n        1. c")
})
