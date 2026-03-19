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
- **Extensible widgets** — built-in chart, mermaid, and diff widgets
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
| `author` | `string` | `"You"` | Display name for new comments |
| `className` | `string` | `""` | Extra CSS class on root |
| `onChange` | `(content: string) => void` | — | Content changed |
| `onAddComment` | `(anchor: Anchor, body: string) => void` | — | New comment created |
| `onDeleteComment` | `(commentId: string) => void` | — | Comment deleted |
| `onAddReply` | `(commentId: string, body: string) => void` | — | Reply added |
| `onActiveCommentChange` | `(id: string \| null) => void` | — | Comment focus changed |
| `onLinkClick` | `(href: string) => void` | — | Internal link clicked |

## Exports

```ts
// Main component
import { Editor } from "koen"

// File tree
import { FileTree, useFileTreeStore } from "koen"

// Comment anchoring utilities
import { createAnchor, resolveAnchor, resolveAnchors } from "koen"

// CodeMirror extensions (advanced)
import { commentField, setComments, addComment, removeComment } from "koen"

// Widget registry
import { registerWidget, hydrateWidgets } from "koen"
```

## License

MIT
