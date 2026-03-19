# koen

A React code editor component with inline comments, markdown preview, and extensible widgets. Built on CodeMirror 6.

## Install

```bash
npm install koen
```

## Usage

```tsx
import { Editor } from "koen"
import "koen/styles"

function App() {
  const [content, setContent] = useState("console.log('hello')")

  return (
    <Editor
      content={content}
      filename="index.ts"
      onChange={setContent}
    />
  )
}
```

## Features

- **Code editing** powered by CodeMirror 6 with language detection
- **Inline comments** with text anchoring that survives edits
- **Markdown preview** with bidirectional highlight linking
- **File tree** component with Zustand-backed state
- **Extensible widgets** — built-in chart, mermaid, diff, and globe widgets
- **Theming** — dark and light modes
- **Mobile support** — haptics and bottom sheet interactions

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | — | File content (controlled) |
| `filename` | `string` | `""` | Filename for language detection |
| `readOnly` | `boolean` | `false` | Disable editing |
| `mode` | `"source" \| "preview"` | `"source"` | Source editor or rendered markdown |
| `comments` | `Comment[]` | `[]` | Comment data |
| `activeCommentId` | `string \| null` | `null` | Currently focused comment |
| `commentsVisible` | `boolean` | `true` | Show/hide comment UI |
| `theme` | `"dark" \| "light"` | `"dark"` | Theme |
| `className` | `string` | `""` | Extra CSS class on root |
| `widgets` | `WidgetPlugin[]` | built-ins | Widget plugins for preview |
| `onChange` | `(content: string) => void` | — | Content changed |
| `onCreateComment` | `(anchor: Anchor) => void` | — | New comment from selection |
| `onUpdateComment` | `(commentId: string, body: string) => void` | — | Comment body submitted |
| `onDeleteComment` | `(commentId: string) => void` | — | Comment deleted |
| `onAddReply` | `(commentId: string, body: string) => void` | — | Reply added |
| `onActiveCommentChange` | `(id: string \| null) => void` | — | Comment focus changed |
| `onLinkClick` | `(href: string) => void` | — | Internal link clicked |

## Widget Plugins

Built-in widgets render automatically in markdown preview. Add custom widgets via the `widgets` prop:

```tsx
import { Editor, chartPlugin, mermaidPlugin, diffPlugin, globePlugin } from "koen"
import type { WidgetPlugin } from "koen"

const myPlugin: WidgetPlugin = {
  type: "csv",
  codeBlockLang: "csv",
  toSpec: (text) => ({ data: text }),
  hydrate: (container, spec, theme) => {
    container.textContent = spec.data
  },
}

<Editor widgets={[chartPlugin, mermaidPlugin, diffPlugin, globePlugin, myPlugin]} />
```

## Imperative API

```tsx
import { Editor, type EditorHandle } from "koen"

const ref = useRef<EditorHandle>(null)

<Editor ref={ref} content={code} />

// Later:
ref.current?.focus()
ref.current?.getContent()
ref.current?.getView() // CodeMirror EditorView
```

## Exports

```ts
// Main component
import { Editor } from "koen"
import type { EditorHandle, EditorProps } from "koen"

// File tree
import { FileTree, useFileTreeStore } from "koen"

// Types
import type { Comment, Anchor, WidgetPlugin } from "koen"

// Widget plugins
import { chartPlugin, mermaidPlugin, diffPlugin, globePlugin } from "koen"

// Comment anchoring utilities
import { createAnchor, resolveAnchor, resolveAnchors } from "koen"
```

## License

MIT
