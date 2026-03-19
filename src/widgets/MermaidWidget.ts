/**
 * Mermaid widget hydrator — renders Mermaid diagrams from declarative specs.
 * Loads Mermaid from CDN on first use.
 */

import { registerWidget } from "./registry"

const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"

let mermaidLoaded: Promise<void> | null = null

function loadMermaid(): Promise<void> {
  if (mermaidLoaded) return mermaidLoaded
  if ((window as any).mermaid) {
    mermaidLoaded = Promise.resolve()
    return mermaidLoaded
  }

  mermaidLoaded = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = MERMAID_CDN
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Mermaid"))
    document.head.appendChild(script)
  })

  return mermaidLoaded
}

let renderCounter = 0

registerWidget("mermaid", (container, spec, theme) => {
  const diagram = spec.diagram
  if (!diagram) {
    container.textContent = "Mermaid widget missing 'diagram'"
    return
  }

  const wrapper = document.createElement("div")
  wrapper.style.display = "flex"
  wrapper.style.justifyContent = "center"
  wrapper.style.margin = "1em 0"
  wrapper.style.overflow = "auto"
  container.innerHTML = ""
  container.appendChild(wrapper)

  const id = `mermaid-${spec.widgetId || ++renderCounter}`

  loadMermaid()
    .then(async () => {
      const mermaid = (window as any).mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === "dark" ? "dark" : "default",
        themeVariables: theme === "dark" ? {
          primaryColor: "#3a3530",
          primaryTextColor: "#e8e6e3",
          primaryBorderColor: "#5a5550",
          lineColor: "#6a8ac0",
          secondaryColor: "#2a2520",
          tertiaryColor: "#1a1816",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        } : {
          primaryColor: "#e8e4de",
          primaryTextColor: "#2a2520",
          primaryBorderColor: "#c8c0b8",
          lineColor: "#6a8ac0",
          secondaryColor: "#f0ece6",
          tertiaryColor: "#faf8f5",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
      })

      const { svg } = await mermaid.render(id, diagram)
      wrapper.innerHTML = svg
    })
    .catch((err) => {
      container.textContent = `Failed to render diagram: ${err.message}`
    })
})
