/** Shared constants and utilities used across components. */

export const COMMENT_COLORS = ["#C15F3C", "#7aa874", "#6a8ac0", "#c4a050", "#a070b0", "#c07070", "#50a0a0", "#b08050"]

export function getTimeAgo(isoStr: string): string {
  if (!isoStr) return ""
  const ts = isoStr.endsWith("Z") || isoStr.includes("+") ? isoStr : isoStr + "Z"
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** Lazy-load a script from CDN. Caches the promise and checks for a global before loading. */
export function loadCDN(url: string, globalName: string): Promise<void> {
  const key = `__cdn_${globalName}`
  if ((window as any)[key]) return (window as any)[key]
  if ((window as any)[globalName]) {
    return ((window as any)[key] = Promise.resolve())
  }
  return ((window as any)[key] = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script")
    s.src = url
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${globalName}`))
    document.head.appendChild(s)
  }))
}
