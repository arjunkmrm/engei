import { create } from "zustand"
import type { EditorView } from "@codemirror/view"

interface SearchOps {
  applyQuery: (view: EditorView, term: string) => void
  findNext: (view: EditorView) => void
  findPrevious: (view: EditorView) => void
  clearQuery: (view: EditorView) => void
  countMatches: (view: EditorView, term: string) => { current: number; total: number }
}

interface SearchState {
  open: boolean
  term: string
  current: number
  total: number
  ops: SearchOps | null
  setOpen: (open: boolean) => void
  setTerm: (term: string) => void
  setMatches: (current: number, total: number) => void
  setOps: (ops: SearchOps) => void
}

export const useSearchStore = create<SearchState>((set) => ({
  open: false,
  term: "",
  current: 0,
  total: 0,
  ops: null,
  setOpen: (open) => set({ open, ...(!open ? { term: "", current: 0, total: 0 } : {}) }),
  setTerm: (term) => set({ term }),
  setMatches: (current, total) => set({ current, total }),
  setOps: (ops) => set({ ops }),
}))
