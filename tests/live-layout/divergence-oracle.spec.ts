/**
 * Divergence Oracle — Phase 0
 *
 * Scrolls through the entire engei demo document, measuring every .cm-line
 * element's DOM height. Computes what Pretext would predict using canvas-based
 * text measurement with proper line-breaking. Outputs a divergence report.
 *
 * Run with: bunx playwright test tests/live-layout/divergence-oracle.spec.ts
 */

import { test, expect } from "@playwright/test"

// Font configs matching engei's live mode CSS (engei.css lines 91, 121-126, 203)
const FONT_CONFIGS: Record<string, { font: string; lineHeight: number; paddingTop: number; paddingBottom: number; border: number }> = {
  prose:        { font: '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: 26, paddingTop: 0, paddingBottom: 0, border: 0 },
  h1:           { font: '32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: 40, paddingTop: 0, paddingBottom: 16, border: 1 },
  h2:           { font: '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: 30, paddingTop: 19.2, paddingBottom: 7.2, border: 1 },
  h3:           { font: '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: 26, paddingTop: 16, paddingBottom: 0, border: 0 },
  h4:           { font: '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: 26, paddingTop: 11.2, paddingBottom: 0, border: 0 },
  h5:           { font: '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: 26, paddingTop: 11.2, paddingBottom: 0, border: 0 },
  h6:           { font: '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: 26, paddingTop: 11.2, paddingBottom: 0, border: 0 },
  "fenced-code": { font: '13px ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace', lineHeight: 19.5, paddingTop: 0, paddingBottom: 0, border: 0 },
}

// Content types where Pretext can't predict height (flex/widget layout)
const BLACKLISTED = new Set(["table-header", "table-row", "table-delimiter", "hr", "fence-line"])

interface LineMeasurement {
  lineNumber: number
  text: string
  decoClass: string
  domHeight: number
  containerWidth: number
}

test("divergence oracle — full document scan", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector(".cm-editor", { timeout: 10000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)

  // Collect ALL lines by scrolling through the document
  const allLines = await page.evaluate(async (): Promise<LineMeasurement[]> => {
    const scroller = document.querySelector(".cm-scroller") as HTMLElement
    if (!scroller) return []

    const seen = new Map<string, LineMeasurement>() // key: text content hash to dedup
    const scrollHeight = scroller.scrollHeight
    const viewportHeight = scroller.clientHeight
    const steps = Math.ceil(scrollHeight / (viewportHeight * 0.8))

    for (let step = 0; step <= steps; step++) {
      scroller.scrollTop = step * viewportHeight * 0.8
      // Wait for CM6 to render new viewport
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      const lines = document.querySelectorAll(".cm-line")
      for (let i = 0; i < lines.length; i++) {
        const el = lines[i] as HTMLElement
        const rect = el.getBoundingClientRect()
        if (rect.height === 0) continue // skip collapsed lines

        const text = el.textContent || ""
        // Use position as key (text can repeat)
        const key = `${Math.round(rect.top + scroller.scrollTop)}-${text.slice(0, 40)}`
        if (seen.has(key)) continue

        const classes = el.className
        let decoClass = "prose"
        if (classes.includes("cm-live-h1-line")) decoClass = "h1"
        else if (classes.includes("cm-live-h2-line")) decoClass = "h2"
        else if (classes.includes("cm-live-h3-line")) decoClass = "h3"
        else if (classes.includes("cm-live-h4-line")) decoClass = "h4"
        else if (classes.includes("cm-live-h5-line")) decoClass = "h5"
        else if (classes.includes("cm-live-h6-line")) decoClass = "h6"
        else if (classes.includes("cm-live-fence-line")) decoClass = "fence-line"
        else if (classes.includes("cm-live-fenced-code")) decoClass = "fenced-code"
        else if (classes.includes("cm-live-hr")) decoClass = "hr"
        else if (classes.includes("cm-table-header")) decoClass = "table-header"
        else if (classes.includes("cm-table-row")) decoClass = "table-row"
        else if (classes.includes("cm-table-delimiter")) decoClass = "table-delimiter"

        seen.set(key, {
          lineNumber: seen.size + 1,
          text: text.slice(0, 120),
          decoClass,
          domHeight: Math.round(rect.height * 100) / 100,
          containerWidth: Math.round((el.closest(".cm-content") as HTMLElement)?.getBoundingClientRect().width || 0),
        })
      }
    }

    // Scroll back to top
    scroller.scrollTop = 0
    return [...seen.values()]
  })

  // Compute Pretext predictions using canvas line-breaking
  const results = await page.evaluate((data: { lines: LineMeasurement[], configs: typeof FONT_CONFIGS, blacklisted: string[] }) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    const blackSet = new Set(data.blacklisted)

    return data.lines.map(line => {
      if (blackSet.has(line.decoClass)) {
        return { ...line, pretextHeight: -1, delta: 0 }
      }

      const config = data.configs[line.decoClass]
      if (!config) {
        return { ...line, pretextHeight: -1, delta: 0 }
      }

      // Use canvas to measure text and compute line-breaking
      ctx.font = config.font
      const contentWidth = line.containerWidth

      if (contentWidth <= 0 || !line.text.trim()) {
        // Empty or zero-width: one line height
        const h = config.lineHeight + config.paddingTop + config.paddingBottom + config.border
        return { ...line, pretextHeight: Math.round(h * 100) / 100, delta: Math.round((line.domHeight - h) * 100) / 100 }
      }

      // Word-wrap line breaking: split by words, accumulate widths
      const words = line.text.split(/(\s+)/)
      let lineCount = 1
      let currentWidth = 0

      for (const word of words) {
        if (!word) continue
        const wordWidth = ctx.measureText(word).width
        if (currentWidth + wordWidth > contentWidth && currentWidth > 0) {
          lineCount++
          currentWidth = wordWidth
        } else {
          currentWidth += wordWidth
        }
      }

      const textHeight = lineCount * config.lineHeight
      const totalHeight = textHeight + config.paddingTop + config.paddingBottom + config.border
      const pretextHeight = Math.round(totalHeight * 100) / 100
      const delta = Math.round((line.domHeight - pretextHeight) * 100) / 100

      return { ...line, pretextHeight, delta }
    })
  }, { lines: allLines, configs: FONT_CONFIGS, blacklisted: [...BLACKLISTED] })

  // Print report
  console.log("\n╔══════════════════════════════════════════════════════════════╗")
  console.log("║              DIVERGENCE ORACLE — Phase 0 Report            ║")
  console.log("╚══════════════════════════════════════════════════════════════╝\n")
  console.log(`Total lines scanned: ${results.length}\n`)

  // Group by content type
  const byType = new Map<string, { count: number; totalDelta: number; maxDelta: number; skipped: boolean }>()
  for (const r of results) {
    const entry = byType.get(r.decoClass) || { count: 0, totalDelta: 0, maxDelta: 0, skipped: r.pretextHeight === -1 }
    entry.count++
    if (r.pretextHeight !== -1) {
      entry.totalDelta += Math.abs(r.delta)
      entry.maxDelta = Math.max(entry.maxDelta, Math.abs(r.delta))
    }
    byType.set(r.decoClass, entry)
  }

  console.log("Summary by content type:")
  console.log("─".repeat(75))
  console.log(
    "Type".padEnd(18) +
    "Count".padEnd(8) +
    "Avg |Δ|".padEnd(12) +
    "Max |Δ|".padEnd(12) +
    "Status"
  )
  console.log("─".repeat(75))

  for (const [type, d] of [...byType.entries()].sort((a, b) => b[1].maxDelta - a[1].maxDelta)) {
    if (d.skipped) {
      console.log(type.padEnd(18) + String(d.count).padEnd(8) + "—".padEnd(12) + "—".padEnd(12) + "SKIP")
    } else {
      const avg = d.count > 0 ? (d.totalDelta / d.count).toFixed(1) : "0"
      const status = d.maxDelta <= 1 ? "OK" : d.maxDelta <= 5 ? "WARN" : "BAD"
      console.log(type.padEnd(18) + String(d.count).padEnd(8) + `${avg}px`.padEnd(12) + `${d.maxDelta.toFixed(1)}px`.padEnd(12) + status)
    }
  }
  console.log("─".repeat(75))

  // Per-line details for significant divergences
  const significant = results.filter(r => r.pretextHeight !== -1 && Math.abs(r.delta) > 2)
  if (significant.length > 0) {
    console.log(`\nSignificant divergences (|Δ| > 2px): ${significant.length} lines`)
    console.log("─".repeat(75))
    for (const r of significant.slice(0, 40)) {
      console.log(`  L${r.lineNumber} [${r.decoClass}] DOM=${r.domHeight}px predicted=${r.pretextHeight}px Δ=${r.delta}px`)
      console.log(`    "${r.text.slice(0, 70)}${r.text.length > 70 ? "..." : ""}"`)
    }
  } else {
    console.log("\nNo significant divergences found.")
  }

  // Per-type accuracy for measurable types
  const measurable = results.filter(r => r.pretextHeight !== -1)
  const totalDelta = measurable.reduce((s, r) => s + Math.abs(r.delta), 0)
  const maxDelta = measurable.reduce((m, r) => Math.max(m, Math.abs(r.delta)), 0)
  console.log(`\nOverall: ${measurable.length} measurable lines, avg |Δ|=${(totalDelta / Math.max(1, measurable.length)).toFixed(1)}px, max |Δ|=${maxDelta.toFixed(1)}px`)
  console.log("")

  // Sanity check: we found lines
  expect(results.length).toBeGreaterThan(10)
})
