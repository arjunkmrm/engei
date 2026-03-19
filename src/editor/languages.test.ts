import { describe, it, expect } from "vitest"
import { getLanguage } from "./languages"

describe("getLanguage", () => {
  it("returns javascript for .js/.jsx/.ts/.tsx", () => {
    for (const ext of ["js", "jsx", "ts", "tsx"]) {
      const result = getLanguage(`file.${ext}`)
      expect(result).toHaveLength(1)
    }
  })

  it("returns python for .py", () => {
    expect(getLanguage("script.py")).toHaveLength(1)
  })

  it("returns rust for .rs", () => {
    expect(getLanguage("main.rs")).toHaveLength(1)
  })

  it("returns markdown for .md", () => {
    expect(getLanguage("README.md")).toHaveLength(1)
  })

  it("returns css for .css", () => {
    expect(getLanguage("styles.css")).toHaveLength(1)
  })

  it("returns json for .json", () => {
    expect(getLanguage("package.json")).toHaveLength(1)
  })

  it("returns html for .html", () => {
    expect(getLanguage("index.html")).toHaveLength(1)
  })

  it("returns empty array for unknown extensions", () => {
    expect(getLanguage("file.xyz")).toEqual([])
    expect(getLanguage("file.txt")).toEqual([])
  })

  it("returns empty array for undefined", () => {
    expect(getLanguage(undefined)).toEqual([])
  })
})
