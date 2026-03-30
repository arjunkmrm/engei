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

// ─── Interactive sequences (how a user actually types) ───────

test("ordered: type 3 items interactively", async ({ page }) => {
  await set(page, "1. a")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(200)
  await page.keyboard.type("b", { delay: 20 })
  await page.keyboard.press("Enter")
  await page.waitForTimeout(200)
  await page.keyboard.type("c", { delay: 20 })
  expect(await get(page)).toBe("1. a\n2. b\n3. c")
})

test("ordered: nest then unnest", async ({ page }) => {
  await set(page, "1. a")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(200)
  await page.keyboard.type("b", { delay: 20 })
  await page.keyboard.press("Tab")
  await page.waitForTimeout(200)
  const r1 = await get(page)
  console.log("after tab:", JSON.stringify(r1))
  expect(r1).toBe("1. a\n    1. b")

  await page.keyboard.press("Shift+Tab")
  await page.waitForTimeout(200)
  const r2 = await get(page)
  console.log("after shift-tab:", JSON.stringify(r2))
  expect(r2).toBe("1. a\n2. b")
})

test("ordered: nest, add items, empty-enter outdent, tab back in", async ({ page }) => {
  await set(page, "1. a")

  // Enter → "2. " → type "b" → Tab → becomes "    1. b"
  await page.keyboard.press("Enter")
  await page.waitForTimeout(200)
  await page.keyboard.type("b", { delay: 20 })
  await page.keyboard.press("Tab")
  await page.waitForTimeout(200)

  // Enter → "    2. " → type "c"
  await page.keyboard.press("Enter")
  await page.waitForTimeout(200)
  await page.keyboard.type("c", { delay: 20 })
  await page.waitForTimeout(200)

  const mid1 = await get(page)
  console.log("after nested typing:", JSON.stringify(mid1))
  expect(mid1).toBe("1. a\n    1. b\n    2. c")

  // Enter → "    3. " (empty)
  await page.keyboard.press("Enter")
  await page.waitForTimeout(200)
  const mid2 = await get(page)
  console.log("after enter (empty):", JSON.stringify(mid2))

  // Enter on empty → outdent to "2. "
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  const mid3 = await get(page)
  console.log("after outdent:", JSON.stringify(mid3))
  expect(mid3).toBe("1. a\n    1. b\n    2. c\n2. ")

  // Tab → should nest back as "    3. " (continuing after 2. c)
  await page.keyboard.press("Tab")
  await page.waitForTimeout(300)
  const mid4 = await get(page)
  console.log("after tab back in:", JSON.stringify(mid4))
  expect(mid4).toBe("1. a\n    1. b\n    2. c\n    3. ")
})

test("ordered: triple nest and back", async ({ page }) => {
  await set(page, "1. a")

  await page.keyboard.press("Enter")
  await page.waitForTimeout(150)
  await page.keyboard.type("b", { delay: 20 })
  await page.keyboard.press("Tab")
  await page.waitForTimeout(150)

  await page.keyboard.press("Enter")
  await page.waitForTimeout(150)
  await page.keyboard.type("c", { delay: 20 })
  await page.keyboard.press("Tab")
  await page.waitForTimeout(150)

  const deep = await get(page)
  console.log("triple nested:", JSON.stringify(deep))
  expect(deep).toBe("1. a\n    1. b\n        1. c")

  // Empty enter → outdent to middle
  await page.keyboard.press("Enter")
  await page.waitForTimeout(150)
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  const mid = await get(page)
  console.log("after first outdent:", JSON.stringify(mid))

  // Empty enter → outdent to top
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  const top = await get(page)
  console.log("after second outdent:", JSON.stringify(top))

  // Empty enter → exit list
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  const done = await get(page)
  console.log("after exit:", JSON.stringify(done))
  expect(done).not.toMatch(/\d+\.\s*$/)
})

test("bullet: Tab then Shift-Tab roundtrip", async ({ page }) => {
  await set(page, "- a\n- b")
  await page.keyboard.press("Tab")
  await page.waitForTimeout(200)
  expect(await get(page)).toBe("- a\n    - b")

  await page.keyboard.press("Shift+Tab")
  await page.waitForTimeout(200)
  expect(await get(page)).toBe("- a\n- b")
})

test("mixed: ordered inside bullet", async ({ page }) => {
  await set(page, "- top\n    1. nested")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(200)
  const r = await get(page)
  console.log("mixed:", JSON.stringify(r))
  expect(r).toBe("- top\n    1. nested\n    2. ")
})

test("ordered: Shift-Tab with content continues parent numbering", async ({ page }) => {
  await set(page, "1. a\n2. b\n    1. nested")
  await page.keyboard.press("Shift+Tab")
  await page.waitForTimeout(300)
  const r = await get(page)
  console.log("shift-tab with content:", JSON.stringify(r))
  expect(r).toBe("1. a\n2. b\n3. nested")
})

test("continuation: shift-enter then enter creates sibling", async ({ page }) => {
  await set(page, "- hello")
  await page.keyboard.press("Shift+Enter")
  await page.waitForTimeout(200)
  await page.keyboard.type("world", { delay: 20 })
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  const r = await get(page)
  console.log("continuation then enter:", JSON.stringify(r))
  expect(r).toBe("- hello\n  world\n- ")
})
