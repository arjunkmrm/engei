import { useFileTreeStore } from "./store"

describe("useFileTreeStore", () => {
  beforeEach(() => {
    // Reset to initial state
    useFileTreeStore.setState({ expanded: new Set(["__root__"]) })
  })

  it("starts with __root__ expanded", () => {
    expect(useFileTreeStore.getState().expanded.has("__root__")).toBe(true)
    expect(useFileTreeStore.getState().expanded.size).toBe(1)
  })

  it("toggle adds a path", () => {
    useFileTreeStore.getState().toggle("src")
    expect(useFileTreeStore.getState().expanded.has("src")).toBe(true)
  })

  it("toggle removes an existing path", () => {
    useFileTreeStore.getState().toggle("src")
    useFileTreeStore.getState().toggle("src")
    expect(useFileTreeStore.getState().expanded.has("src")).toBe(false)
  })

  it("collapseAll resets to default", () => {
    useFileTreeStore.getState().toggle("src")
    useFileTreeStore.getState().toggle("lib")
    useFileTreeStore.getState().collapseAll()
    const expanded = useFileTreeStore.getState().expanded
    expect(expanded.size).toBe(1)
    expect(expanded.has("__root__")).toBe(true)
  })

  it("collapseAll with custom keep list", () => {
    useFileTreeStore.getState().toggle("src")
    useFileTreeStore.getState().collapseAll(["__root__", "src"])
    const expanded = useFileTreeStore.getState().expanded
    expect(expanded.size).toBe(2)
    expect(expanded.has("src")).toBe(true)
    expect(expanded.has("__root__")).toBe(true)
  })

  it("expandAll adds multiple paths", () => {
    useFileTreeStore.getState().expandAll(["a", "b", "c"])
    const expanded = useFileTreeStore.getState().expanded
    expect(expanded.has("a")).toBe(true)
    expect(expanded.has("b")).toBe(true)
    expect(expanded.has("c")).toBe(true)
    expect(expanded.has("__root__")).toBe(true) // still there
  })

  it("expandAll does not remove existing paths", () => {
    useFileTreeStore.getState().toggle("existing")
    useFileTreeStore.getState().expandAll(["new"])
    const expanded = useFileTreeStore.getState().expanded
    expect(expanded.has("existing")).toBe(true)
    expect(expanded.has("new")).toBe(true)
  })
})
