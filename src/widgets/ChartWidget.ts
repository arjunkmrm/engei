/**
 * Chart widget plugin — renders Chart.js charts from declarative specs.
 * Loads Chart.js from CDN on first use.
 */

import type { WidgetPlugin } from "../types"

const CHART_JS_CDN = "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"

let chartJsLoaded: Promise<void> | null = null

function loadChartJs(): Promise<void> {
  if (chartJsLoaded) return chartJsLoaded
  if ((window as any).Chart) {
    chartJsLoaded = Promise.resolve()
    return chartJsLoaded
  }

  chartJsLoaded = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = CHART_JS_CDN
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Chart.js"))
    document.head.appendChild(script)
  })

  return chartJsLoaded
}

function getThemeColors(theme: "dark" | "light") {
  if (theme === "dark") {
    return {
      textColor: "#e8e6e3",
      gridColor: "rgba(255, 255, 255, 0.08)",
      borderColor: "rgba(255, 255, 255, 0.15)",
    }
  }
  return {
    textColor: "#2a2520",
    gridColor: "rgba(0, 0, 0, 0.08)",
    borderColor: "rgba(0, 0, 0, 0.15)",
  }
}

// Default color palette (matches koen theme)
const PALETTE = [
  "#6a8ac0", // blue
  "#7aa874", // green
  "#c4a050", // amber
  "#C15F3C", // coral/accent
  "#a070b0", // purple
  "#50a0a0", // teal
  "#c07070", // red
  "#b08050", // brown
]

export const chartPlugin: WidgetPlugin = {
  type: "chart",
  hydrate: (container, spec, theme) => {
    const config = spec.config
    if (!config) {
      container.textContent = "Chart widget missing 'config'"
      return
    }

    // Create canvas
    const chartType = config.type || "bar"
    const wrapper = document.createElement("div")
    wrapper.style.position = "relative"
    wrapper.style.width = "100%"
    wrapper.style.maxWidth = ["radar", "pie", "doughnut", "polarArea"].includes(chartType) ? "500px" : "700px"
    wrapper.style.margin = "1em auto"

    // Calculate height based on chart type
    if (chartType === "horizontalBar" || (chartType === "bar" && config.options?.indexAxis === "y")) {
      const barCount = config.data?.labels?.length || 5
      wrapper.style.height = `${barCount * 40 + 80}px`
    } else {
      wrapper.style.height = chartType === "radar" ? "400px" : "340px"
    }

    const canvas = document.createElement("canvas")
    wrapper.appendChild(canvas)
    container.innerHTML = ""
    container.appendChild(wrapper)

    // Apply theme colors and palette to datasets
    const { textColor, gridColor } = getThemeColors(theme)
    const datasets = (config.data?.datasets || []).map((ds: any, i: number) => ({
      ...ds,
      backgroundColor: ds.backgroundColor || PALETTE[i % PALETTE.length],
      borderColor: ds.borderColor || PALETTE[i % PALETTE.length],
      borderWidth: ds.borderWidth ?? (["line", "radar"].includes(chartType) ? 2 : 0),
    }))

    // Radial charts (pie, doughnut, polarArea, radar) don't use x/y scales
    const isRadial = ["pie", "doughnut", "polarArea", "radar"].includes(chartType)

    const themedConfig = {
      ...config,
      data: { ...config.data, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...config.options,
        plugins: {
          ...config.options?.plugins,
          legend: {
            display: true,
            ...config.options?.plugins?.legend,
            labels: { usePointStyle: true, padding: 16, font: { size: 12 }, ...config.options?.plugins?.legend?.labels, color: textColor },
          },
          title: {
            ...config.options?.plugins?.title,
            color: textColor,
          },
        },
        ...(isRadial ? {} : {
          scales: {
            ...config.options?.scales,
            x: {
              ...config.options?.scales?.x,
              ticks: { font: { size: 11 }, ...config.options?.scales?.x?.ticks, color: textColor },
              grid: { ...config.options?.scales?.x?.grid, color: gridColor },
            },
            y: {
              ...config.options?.scales?.y,
              ticks: { font: { size: 11 }, ...config.options?.scales?.y?.ticks, color: textColor },
              grid: { ...config.options?.scales?.y?.grid, color: gridColor },
            },
          },
        }),
      },
    }

    let chartInstance: any = null
    let disposed = false

    loadChartJs()
      .then(() => {
        if (disposed) return // cleanup already ran — don't touch DOM
        const Chart = (window as any).Chart
        chartInstance = new Chart(canvas, themedConfig)
      })
      .catch((err) => {
        if (disposed) return
        container.textContent = `Failed to load Chart.js: ${err.message}`
      })

    // Return cleanup
    return () => {
      disposed = true
      chartInstance?.destroy()
    }
  },
}

// Backward compat: keep the old named export
export const chartWidget = chartPlugin
