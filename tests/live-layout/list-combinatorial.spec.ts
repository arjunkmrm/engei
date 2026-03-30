/**
 * Combinatorial list editing tests.
 *
 * State: (listType, depth, content, hasSiblingsAtTargetLevel) × Action
 * Generates all valid combinations and asserts correct behavior.
 */
import { test, expect } from "@playwright/test"

async function set(page: any, doc: string) {
  await page.evaluate((d: string) => {
    const view = (window as any).__cm
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: d }, selection: { anchor: d.length } })
    view.focus()
  }, doc)
  await page.waitForTimeout(500)
  await page.evaluate(() => { const v = (window as any).__cm; v.dispatch({ selection: v.state.selection }) })
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

// ═══════════════════════════════════════════════════════════════
// ENTER × (type, depth, content)
// ═══════════════════════════════════════════════════════════════

// Enter + bullet + top + content → new sibling
test("E bullet top content", async ({ page }) => {
  await set(page, "- foo")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- foo\n- ")
})

// Enter + ordered + top + content → new sibling, next number
test("E ordered top content", async ({ page }) => {
  await set(page, "1. foo")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. foo\n2. ")
})

// Enter + bullet + nested + content → new sibling at same depth
test("E bullet nested content", async ({ page }) => {
  await set(page, "- a\n    - foo")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- a\n    - foo\n    - ")
})

// Enter + ordered + nested + content → new sibling, next number
test("E ordered nested content", async ({ page }) => {
  await set(page, "1. a\n    1. foo")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. a\n    1. foo\n    2. ")
})

// Enter + bullet + top + empty → exit list
test("E bullet top empty", async ({ page }) => {
  await set(page, "- foo\n- ")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- foo\n")
})

// Enter + ordered + top + empty → exit list
test("E ordered top empty", async ({ page }) => {
  await set(page, "1. foo\n2. ")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. foo\n")
})

// Enter + bullet + nested + empty → outdent to parent bullet
test("E bullet nested empty", async ({ page }) => {
  await set(page, "- a\n    - b\n    - ")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- a\n    - b\n- ")
})

// Enter + ordered + nested + empty → outdent + renumber parent
test("E ordered nested empty", async ({ page }) => {
  await set(page, "1. a\n    1. b\n    2. ")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. a\n    1. b\n2. ")
})

// Enter + ordered + nested(2) + empty → outdent one level
test("E ordered deep empty", async ({ page }) => {
  await set(page, "1. a\n    1. b\n        1. c\n        2. ")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. a\n    1. b\n        1. c\n    2. ")
})

// ═══════════════════════════════════════════════════════════════
// TAB × (type, depth, siblings-at-target)
// ═══════════════════════════════════════════════════════════════

// Tab + bullet + top → indent
test("T bullet top", async ({ page }) => {
  await set(page, "- a\n- b")
  await page.keyboard.press("Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- a\n    - b")
})

// Tab + ordered + top + no siblings → reset 1
test("T ordered top no-siblings", async ({ page }) => {
  await set(page, "1. a\n2. b")
  await page.keyboard.press("Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. a\n    1. b")
})

// Tab + ordered + top + has siblings → continue
test("T ordered top has-siblings", async ({ page }) => {
  await set(page, "1. a\n    1. x\n    2. y\n2. b")
  await page.keyboard.press("Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. a\n    1. x\n    2. y\n    3. b")
})

// Tab + ordered + nested + no siblings → reset 1
test("T ordered nested no-siblings", async ({ page }) => {
  await set(page, "1. a\n    1. b\n    2. c")
  await page.keyboard.press("Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. a\n    1. b\n        1. c")
})

// Tab + ordered + nested + has siblings → continue
test("T ordered nested has-siblings", async ({ page }) => {
  await set(page, "1. a\n    1. b\n        1. x\n    2. c")
  await page.keyboard.press("Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. a\n    1. b\n        1. x\n        2. c")
})

// ═══════════════════════════════════════════════════════════════
// SHIFT-TAB × (type, depth, siblings-at-target)
// ═══════════════════════════════════════════════════════════════

// Shift-Tab + bullet + nested → outdent
test("ST bullet nested", async ({ page }) => {
  await set(page, "- a\n    - b")
  await page.keyboard.press("Shift+Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- a\n- b")
})

// Shift-Tab + ordered + nested + no parent siblings → 1
test("ST ordered nested no-parent-siblings", async ({ page }) => {
  await set(page, "    1. only")
  await page.keyboard.press("Shift+Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. only")
})

// Shift-Tab + ordered + nested + has parent siblings → continue
test("ST ordered nested has-parent-siblings", async ({ page }) => {
  await set(page, "1. a\n2. b\n    1. nested")
  await page.keyboard.press("Shift+Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. a\n2. b\n3. nested")
})

// Shift-Tab + top → no-op
test("ST bullet top noop", async ({ page }) => {
  await set(page, "- foo")
  await page.keyboard.press("Shift+Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- foo")
})

test("ST ordered top noop", async ({ page }) => {
  await set(page, "1. foo")
  await page.keyboard.press("Shift+Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. foo")
})

// ═══════════════════════════════════════════════════════════════
// SHIFT-ENTER × (type, depth, in-list)
// ═══════════════════════════════════════════════════════════════

test("SE bullet top", async ({ page }) => {
  await set(page, "- foo")
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- foo\n  ")
})

test("SE ordered top", async ({ page }) => {
  await set(page, "1. foo")
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. foo\n   ")
})

test("SE bullet nested", async ({ page }) => {
  await set(page, "- a\n    - foo")
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("- a\n    - foo\n      ")
})

test("SE not in list", async ({ page }) => {
  await set(page, "hello")
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("hello\n")
})

// ═══════════════════════════════════════════════════════════════
// COMPOUND SEQUENCES (action chains)
// ═══════════════════════════════════════════════════════════════

// Tab → Shift-Tab roundtrip preserves numbering
test("C: Tab then Shift-Tab roundtrip ordered", async ({ page }) => {
  await set(page, "1. a\n2. b")
  await page.keyboard.press("Tab")
  await page.waitForTimeout(200)
  expect(await get(page)).toBe("1. a\n    1. b")
  await page.keyboard.press("Shift+Tab")
  await page.waitForTimeout(200)
  expect(await get(page)).toBe("1. a\n2. b")
})

// Enter-empty → Tab: outdent then re-nest
test("C: Enter-empty then Tab re-nests with correct number", async ({ page }) => {
  await set(page, "1. a\n    1. b\n    2. c\n    3. ")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. a\n    1. b\n    2. c\n2. ")
  await page.keyboard.press("Tab")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. a\n    1. b\n    2. c\n    3. ")
})

// Full lifecycle: create → nest → add → empty-outdent → empty-exit
test("C: full ordered lifecycle", async ({ page }) => {
  await set(page, "1. first")

  await page.keyboard.press("Enter")
  await page.waitForTimeout(150)
  await page.keyboard.type("second", { delay: 15 })
  expect(await get(page)).toBe("1. first\n2. second")

  await page.keyboard.press("Enter")
  await page.waitForTimeout(150)
  await page.keyboard.type("nested", { delay: 15 })
  await page.keyboard.press("Tab")
  await page.waitForTimeout(200)
  expect(await get(page)).toBe("1. first\n2. second\n    1. nested")

  await page.keyboard.press("Enter")
  await page.waitForTimeout(150)
  await page.keyboard.type("nested2", { delay: 15 })
  expect(await get(page)).toBe("1. first\n2. second\n    1. nested\n    2. nested2")

  // Empty enter → outdent
  await page.keyboard.press("Enter")
  await page.waitForTimeout(150)
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. first\n2. second\n    1. nested\n    2. nested2\n3. ")

  // Empty enter → exit
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. first\n2. second\n    1. nested\n    2. nested2\n")
})

// Shift-Enter then Enter on continuation
test("C: shift-enter continuation then enter", async ({ page }) => {
  await set(page, "1. hello")
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(200)
  await page.keyboard.type("world", { delay: 15 })
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  expect(await get(page)).toBe("1. hello\n   world\n2. ")
})

// Multiple Tabs from top
test("C: multiple Tab indents", async ({ page }) => {
  await set(page, "1. a\n2. b")
  await page.keyboard.press("Tab")
  await page.waitForTimeout(200)
  expect(await get(page)).toBe("1. a\n    1. b")
  await page.keyboard.press("Tab")
  await page.waitForTimeout(200)
  expect(await get(page)).toBe("1. a\n        1. b")
})

// Multiple Shift-Tabs from deep
test("C: multiple Shift-Tab outdents", async ({ page }) => {
  await set(page, "1. a\n        1. deep")
  await page.keyboard.press("Shift+Tab")
  await page.waitForTimeout(200)
  expect(await get(page)).toBe("1. a\n    1. deep")
  await page.keyboard.press("Shift+Tab")
  await page.waitForTimeout(200)
  expect(await get(page)).toBe("1. a\n2. deep")
})
