/**
 * Globe widget plugin — renders an interactive WebGL globe using COBE.
 * Loads COBE (~5kB) from CDN on first use.
 */

import type { WidgetPlugin } from "../types"

const COBE_CDN = "https://cdn.jsdelivr.net/npm/cobe@2.0.0/+esm"

let cobeModule: Promise<any> | null = null

function loadCobe(): Promise<any> {
  if (!cobeModule) {
    cobeModule = import(/* @vite-ignore */ COBE_CDN)
  }
  return cobeModule
}

export const globePlugin: WidgetPlugin = {
  type: "globe",
  codeBlockLang: "globe",
  hydrate: (container, spec, theme) => {
    const wrapper = document.createElement("div")
    wrapper.style.display = "flex"
    wrapper.style.justifyContent = "center"
    wrapper.style.margin = "1em 0"

    const canvas = document.createElement("canvas")
    const size = spec.size || 600
    canvas.width = size
    canvas.height = size
    canvas.style.width = `${size / 2}px`
    canvas.style.height = `${size / 2}px`
    canvas.style.maxWidth = "100%"
    canvas.style.aspectRatio = "1"

    wrapper.appendChild(canvas)
    container.innerHTML = ""
    container.appendChild(wrapper)

    let globe: any = null
    let disposed = false
    let phi = spec.phi || 0

    const isDark = theme === "dark"
    const baseColor: [number, number, number] = isDark ? [0.18, 0.15, 0.12] : [0.9, 0.88, 0.85]
    const glowColor: [number, number, number] = isDark ? [0.1, 0.08, 0.06] : [0.98, 0.96, 0.94]
    const markerColor: [number, number, number] = spec.markerColor || [0.42, 0.54, 0.75] // koen blue

    loadCobe()
      .then((mod) => {
        if (disposed) return
        const createGlobe = mod.default || mod.createGlobe || mod
        globe = createGlobe(canvas, {
          devicePixelRatio: 2,
          width: size,
          height: size,
          phi: spec.phi || 0,
          theta: spec.theta || 0.2,
          dark: isDark ? 1 : 0,
          diffuse: 1.2,
          mapSamples: 16000,
          mapBrightness: isDark ? 8 : 3,
          baseColor,
          markerColor,
          glowColor,
          markers: (spec.markers || []).map((m: any) => ({
            location: m.location,
            size: m.size || 0.05,
          })),
          onRender: (state: any) => {
            if (disposed) return
            state.phi = phi
            phi += spec.rotateSpeed || 0.005
          },
        })
      })
      .catch((err) => {
        if (disposed) return
        container.textContent = `Failed to load globe: ${err.message}`
      })

    return () => {
      disposed = true
      globe?.destroy()
    }
  },
}

export const globeWidget = globePlugin
