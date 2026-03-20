import { EditorView } from "@codemirror/view"
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { tags } from "@lezer/highlight"
import type { Extension } from "@codemirror/state"

export function buildSonoTheme(isDark: boolean) {
  return EditorView.theme({
    "&": {
      backgroundColor: "var(--editor-bg)",
      color: "var(--editor-fg)",
    },
    ".cm-content": {
      caretColor: "var(--editor-cursor)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--editor-cursor)",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
      background: "var(--editor-selection)",
    },
    "& .cm-selectionBackground, .cm-content ::selection": {
      background: "var(--editor-selection)",
    },
    "& .cm-content :focus::selection, & .cm-content :focus ::selection, & .cm-line ::selection, & .cm-line::selection": {
      background: "var(--editor-selection) !important",
    },
    ".cm-activeLine": {
      backgroundColor: "var(--editor-line-highlight)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--editor-bg)",
      color: "var(--editor-line-number)",
      border: "none",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "var(--editor-line-number-active)",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "var(--widget-bg)",
      border: "none",
      color: "var(--icon-fg)",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--widget-bg)",
      border: "1px solid var(--widget-border)",
      color: "var(--editor-fg)",
    },
    ".cm-panels": {
      backgroundColor: "var(--panel-bg)",
      color: "var(--editor-fg)",
    },
    ".cm-searchMatch": {
      backgroundColor: "var(--editor-selection)",
    },
  }, { dark: isDark })
}

const darkHighlight = HighlightStyle.define([
  { tag: tags.comment,                color: "#5a554d", fontStyle: "italic" },
  { tag: tags.lineComment,            color: "#5a554d", fontStyle: "italic" },
  { tag: tags.blockComment,           color: "#5a554d", fontStyle: "italic" },
  { tag: tags.string,                 color: "#a8c076" },
  { tag: tags.special(tags.string),   color: "#a8c076" },
  { tag: tags.number,                 color: "#d4a06a" },
  { tag: tags.bool,                   color: "#d4a06a" },
  { tag: tags.null,                   color: "#d4a06a" },
  { tag: tags.keyword,                color: "#c47a5a" },
  { tag: tags.modifier,               color: "#c47a5a" },
  { tag: tags.controlKeyword,         color: "#c47a5a" },
  { tag: tags.definitionKeyword,      color: "#c47a5a" },
  { tag: tags.operatorKeyword,        color: "#c47a5a" },
  { tag: tags.operator,               color: "#a09888" },
  { tag: tags.function(tags.variableName), color: "#d4b87a" },
  { tag: tags.definition(tags.variableName), color: "#d4b87a" },
  { tag: tags.typeName,               color: "#c4a872" },
  { tag: tags.className,              color: "#c4a872" },
  { tag: tags.variableName,           color: "#e8e6e3" },
  { tag: tags.propertyName,           color: "#c4b8a8" },
  { tag: tags.tagName,                color: "#c47a5a" },
  { tag: tags.attributeName,          color: "#d4a06a" },
  { tag: tags.attributeValue,         color: "#a8c076" },
  { tag: tags.punctuation,            color: "#7a7068" },
  { tag: tags.bracket,                color: "#7a7068" },
  { tag: tags.meta,                   color: "#7a7068" },
  { tag: tags.heading,                color: "#C15F3C", fontWeight: "bold" },
  { tag: tags.emphasis,               fontStyle: "italic" },
  { tag: tags.strong,                 fontWeight: "bold" },
])

const lightHighlight = HighlightStyle.define([
  { tag: tags.comment,                color: "#a09888", fontStyle: "italic" },
  { tag: tags.lineComment,            color: "#a09888", fontStyle: "italic" },
  { tag: tags.blockComment,           color: "#a09888", fontStyle: "italic" },
  { tag: tags.string,                 color: "#6a8a40" },
  { tag: tags.special(tags.string),   color: "#6a8a40" },
  { tag: tags.number,                 color: "#b07830" },
  { tag: tags.bool,                   color: "#b07830" },
  { tag: tags.null,                   color: "#b07830" },
  { tag: tags.keyword,                color: "#a85a3a" },
  { tag: tags.modifier,               color: "#a85a3a" },
  { tag: tags.controlKeyword,         color: "#a85a3a" },
  { tag: tags.definitionKeyword,      color: "#a85a3a" },
  { tag: tags.operatorKeyword,        color: "#a85a3a" },
  { tag: tags.operator,               color: "#6a6058" },
  { tag: tags.function(tags.variableName), color: "#8a7030" },
  { tag: tags.definition(tags.variableName), color: "#8a7030" },
  { tag: tags.typeName,               color: "#8a7030" },
  { tag: tags.className,              color: "#8a7030" },
  { tag: tags.variableName,           color: "#2a2520" },
  { tag: tags.propertyName,           color: "#4a4238" },
  { tag: tags.tagName,                color: "#a85a3a" },
  { tag: tags.attributeName,          color: "#b07830" },
  { tag: tags.attributeValue,         color: "#6a8a40" },
  { tag: tags.punctuation,            color: "#8a7f72" },
  { tag: tags.bracket,                color: "#8a7f72" },
  { tag: tags.meta,                   color: "#8a7f72" },
  { tag: tags.heading,                color: "#C15F3C", fontWeight: "bold" },
  { tag: tags.emphasis,               fontStyle: "italic" },
  { tag: tags.strong,                 fontWeight: "bold" },
])

export function getSyntaxHighlighting(isDark: boolean): Extension {
  return syntaxHighlighting(isDark ? darkHighlight : lightHighlight)
}
