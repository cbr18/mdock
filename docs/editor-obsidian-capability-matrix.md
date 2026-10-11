# Editor vs Obsidian Capability Matrix

**Status**: DRAFT  
**Created**: 2026-10-07  
**Purpose**: Comprehensive comparison of mdock editor capabilities vs Obsidian features

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully supported (source + live preview + save) |
| ⚠️ | Partially supported (source works, preview limited) |
| ❌ | Not supported |
| 🔄 | In progress / planned |
| 📝 | Source-only (no live preview) |
| 🎯 | P0 - Critical for Obsidian parity |
| 🔥 | P1 - Important for workflow |
| 📋 | P2 - Nice to have |

---

## 1. Basic Markdown (CommonMark + GFM)

| Feature | Obsidian Syntax | Source Edit | Live Preview | Split View | Priority | Notes |
|---------|----------------|-------------|--------------|------------|----------|-------|
| Paragraphs | plain text | ✅ | ✅ | ✅ | 🎯 | Base requirement |
| Hard line breaks | single `\n` | ✅ | ✅ | ✅ | 🎯 | `remark-breaks` enabled |
| Soft line breaks | `Shift+Enter` | ✅ | ✅ | ✅ | 🔥 | Works in live mode |
| ATX Headings 1-6 | `#` - `######` | ✅ | ✅ | ✅ | 🎯 | Toolbar + shortcuts |
| Setext Headings | `===` / `---` | ✅ | ✅ | ✅ | 📝 | Parse only, no toolbar |
| Bold | `**text**` | ✅ | ✅ | ✅ | 🎯 | Toggle on selection |
| Italic | `*text*` | ✅ | ✅ | ✅ | 🎯 | Toggle on selection |
| Bold+Italic | `***text***` | ✅ | ✅ | ✅ | 🔥 | Separate command |
| Strikethrough | `~~text~~` | ✅ | ✅ | ✅ | 🎯 | GFM/Obsidian |
| Highlight | `==text==` | ✅ | ⚠️ | ⚠️ | 🔥 | Source OK, preview renders as text |
| Inline code | `` `code` `` | ✅ | ✅ | ✅ | 🎯 | Auto double backticks |
| Blockquote | `> text` | ✅ | ✅ | ✅ | 🎯 | Toggle on lines |
| Horizontal rule | `---` / `***` | ✅ | ✅ | ✅ | 🎯 | Insert command |
| Fenced code blocks | \`\`\`lang | ✅ | ✅ | ✅ | 🎯 | Language dropdown |
| Indented code blocks | 4 spaces | ✅ | ⚠️ | ⚠️ | 📝 | Limited support |
| Links | `[text](url)` | ✅ | ✅ | ✅ | 🎯 | Popover with URL+label |
| Images | `![alt](url)` | ✅ | ✅ | ✅ | 🎯 | Popover with alt+URL |
| Autolinks | `<url>` | ✅ | ✅ | ✅ | 📝 | Auto-detected |
| HTML blocks | `<div>...</div>` | ✅ | ❌ | ❌ | 📝 | Preserved, not rendered |
| HTML inline | `<span>...</span>` | ✅ | ❌ | ❌ | 📝 | Preserved, sanitized |

---

## 2. GFM Extensions

| Feature | Obsidian Syntax | Source Edit | Live Preview | Split View | Priority | Notes |
|---------|----------------|-------------|--------------|------------|----------|-------|
| Tables | Pipe syntax | ✅ | ✅ | ✅ | 🎯 | Insert 2×2 template |
| Table alignment | `:--`, `:--:`, `--:` | ✅ | ✅ | ✅ | 🔥 | Manual in template |
| Task lists | `- [ ] item` | ✅ | ✅ | ✅ | 🎯 | Checkbox toggle |
| Task done | `- [x] item` | ✅ | ✅ | ✅ | 🎯 | Toggle command |
| Strikethrough | `~~text~~` | ✅ | ✅ | ✅ | 🎯 | Already in Basic |
| Autolinks | `www.example.com` | ✅ | ✅ | ✅ | 📝 | Auto-detected |

---

## 3. Lists

| Feature | Obsidian Syntax | Source Edit | Live Preview | Split View | Priority | Notes |
|---------|----------------|-------------|--------------|------------|----------|-------|
| Bullet lists | `- item` | ✅ | ✅ | ✅ | 🎯 | Toggle command |
| Ordered lists | `1. item` | ✅ | ✅ | ✅ | 🎯 | Auto-numbering |
| Nested lists | indent 2 spaces | ✅ | ✅ | ✅ | 🎯 | Indent/Outdent |
| Task lists | `- [ ] item` | ✅ | ✅ | ✅ | 🎯 | Checkbox toggle |
| Task done | `- [x] item` | ✅ | ✅ | ✅ | 🎯 | Toggle done |
| Start number | `5. item` | ⚠️ | ⚠️ | ⚠️ | 📝 | Not auto-adjusted |
| List continuation | blank lines | ✅ | ✅ | ✅ | 🔥 | Blank line handling |
| List markers | `-`, `*`, `+` | ✅ | ✅ | ✅ | 📝 | `-` preferred |

---

## 4. Obsidian Extensions (Core)

| Feature | Obsidian Syntax | Source Edit | Live Preview | Split View | Priority | Notes |
|---------|----------------|-------------|--------------|------------|----------|-------|
| Wikilinks | `[[Page]]` | ✅ | ❌ | ❌ | 🎯 | Source OK, preview=text |
| Wikilink alias | `[[Page\|Alias]]` | ✅ | ❌ | ❌ | 🔥 | Popover target+alias |
| Wikilink heading | `[[Page#Heading]]` | ✅ | ❌ | ❌ | 📝 | Requires heading index |
| Wikilink block | `[[Page#^block]]` | ✅ | ❌ | ❌ | 📝 | Requires block index |
| Embeds | `![[File.png]]` | ✅ | ❌ | ❌ | 🎯 | Source OK, preview=text |
| Embed sizing | `![[img\|100]]` | ❌ | ❌ | ❌ | 📝 | Not implemented |
| Callouts | `> [!note]` | ✅ | ⚠️ | ⚠️ | 🎯 | Renders as blockquote |
| Callout types | note,info,tip... | ✅ | ⚠️ | ⚠️ | 🔥 | 7 types supported |
| Callout fold | `> [!note]-` | ✅ | ❌ | ❌ | 📝 | Not implemented |
| Callout title | `> [!note] Title` | ✅ | ⚠️ | ⚠️ | 🔥 | Title support |
| Footnotes | `[^id]` | ✅ | ⚠️ | ⚠️ | 🔥 | Insert ref+def |
| Inline footnotes | `^[text]` | ✅ | ⚠️ | ⚠️ | 📝 | Insert command |
| Comments | `%%text%%` | ✅ | ❌ | ❌ | 🔥 | Toggle command |
| Highlight | `==text==` | ✅ | ⚠️ | ⚠️ | 🔥 | Already in Basic |
| Block IDs | `^block-id` | ❌ | ❌ | ❌ | 📝 | Not implemented |
| YAML frontmatter | `--- ... ---` | ✅ | ✅ | ✅ | 🎯 | Insert/update helper |
| Properties (Obsidian) | key: value | ✅ | ✅ | ✅ | 🔥 | Same as frontmatter |
| Tags in frontmatter | tags: [a,b] | ✅ | ✅ | ✅ | 🔥 | Preserved as YAML |
| Aliases in frontmatter | aliases: [a,b] | ✅ | ✅ | ✅ | 📝 | Preserved as YAML |

---

## 5. Math

| Feature | Obsidian Syntax | Source Edit | Live Preview | Split View | Priority | Notes |
|---------|----------------|-------------|--------------|------------|----------|-------|
| Inline math | `$x^2$` | ✅ | ⚠️ | ⚠️ | 🔥 | Source OK, no KaTeX |
| Block math | `$$...$$` | ✅ | ⚠️ | ⚠️ | 🔥 | Source OK, no KaTeX |
| LaTeX macros | `\frac{a}{b}` | ✅ | ❌ | ❌ | 📝 | Requires KaTeX |

---

## 6. Diagrams & Embeds

| Feature | Obsidian Syntax | Source Edit | Live Preview | Split View | Priority | Notes |
|---------|----------------|-------------|--------------|------------|----------|-------|
| Mermaid | \`\`\`mermaid | ✅ | ❌ | ❌ | 🔥 | Source OK, no render |
| PlantUML | \`\`\`plantuml | ✅ | ❌ | ❌ | 📝 | Not implemented |
| GraphViz | \`\`\`dot | ✅ | ❌ | ❌ | 📝 | Not implemented |
| Excalidraw | `![[drawing.excalidraw]]` | ✅ | ❌ | ❌ | 📝 | Not implemented |
| Canvas | `![[canvas.canvas]]` | ✅ | ❌ | ❌ | 📝 | Not implemented |
| PDF embed | `![[file.pdf]]` | ✅ | ❌ | ❌ | 📝 | Preview needs API |
| Video embed | `![[video.mp4]]` | ✅ | ❌ | ❌ | 📝 | Preview needs API |
| Audio embed | `![[audio.mp3]]` | ✅ | ❌ | ❌ | 📝 | Preview needs API |
| IFrame embed | `![[url]]` | ✅ | ❌ | ❌ | 📝 | Not implemented |

---

## 7. Editing Experience (Live Preview)

| Feature | Obsidian Behavior | mdock Status | Priority | Notes |
|---------|------------------|--------------|----------|-------|
| Click to edit | Click rendered → edit source | ❌ | 🎯 | Currently click = edit |
| Double-click to edit | DblClick → edit source | ❌ | 🎯 | Not implemented |
| Type to edit | Typing in rendered → edit | ❌ | 🎯 | Not implemented |
| Text selection | Select text in rendered | ❌ | 🎯 | Blocked by click=edit |
| Copy from rendered | Copy text from preview | ❌ | 🎯 | Blocked by click=edit |
| Cursor position sync | Rendered ↔ source sync | ⚠️ | 🔥 | Partial via block activation |
| Scroll sync | Rendered ↔ source scroll | ❌ | 🔥 | Not implemented |
| Vim mode | Vim keybindings | ❌ | 📝 | Not planned |
| Typewriter mode | Centered line | ❌ | 📝 | Not planned |
| Focus mode | Dim other paragraphs | ❌ | 📝 | Not planned |

---

## 8. Keyboard Shortcuts

| Shortcut | Obsidian Action | mdock Status | Priority |
|----------|----------------|--------------|----------|
| `Ctrl/Cmd+B` | Bold | ✅ | 🎯 |
| `Ctrl/Cmd+I` | Italic | ✅ | 🎯 |
| `Ctrl/Cmd+Shift+S` | Strikethrough | ✅ | 🎯 |
| `Ctrl/Cmd+Shift+K` | Code block | ✅ | 🎯 |
| `Ctrl/Cmd+Shift+L` | Link | ✅ | 🎯 |
| `Ctrl/Cmd+Shift+I` | Image | ✅ | 🎯 |
| `Ctrl/Cmd+Enter` | Hard break | ✅ | 🔥 |
| `Ctrl/Cmd+Shift+Enter` | Soft break | ✅ | 🔥 |
| `Ctrl/Cmd+]` / `[` | Indent/Outdent | ✅ | 🔥 |
| `Ctrl/Cmd+Shift+7` | Ordered list | ✅ | 🔥 |
| `Ctrl/Cmd+Shift+8` | Bullet list | ✅ | 🔥 |
| `Ctrl/Cmd+Shift+9` | Task list | ✅ | 🔥 |
| `Ctrl/Cmd+/` | Comment | ✅ | 🔥 |
| `Ctrl/Cmd+Shift+C` | Code | ✅ | 🔥 |

---

## 9. Mobile / Touch

| Feature | Obsidian | mdock | Priority |
|---------|----------|-------|----------|
| Touch selection | ✅ | ❌ | 🔥 |
| Virtual keyboard handling | ✅ | ⚠️ | 🔥 |
| Toolbar accessibility | ✅ | ⚠️ | 🔥 |
| Swipe gestures | ✅ | ❌ | 📝 |
| Toolbar on mobile | ✅ | ⚠️ | 🔥 |

---

## 10. Accessibility (WCAG 2.2)

| Criterion | Obsidian | mdock | Priority |
|-----------|----------|-------|----------|
| 1.4.3 Contrast (AA) | ✅ | ✅ | 🎯 |
| 1.4.11 Non-text contrast | ✅ | ✅ | 🎯 |
| 2.1.1 Keyboard | ✅ | ⚠️ | 🎯 |
| 2.4.3 Focus order | ✅ | ⚠️ | 🎯 |
| 2.4.7 Focus visible | ✅ | ⚠️ | 🎯 |
| 3.2.2 On input | ✅ | ✅ | 🎯 |
| 4.1.2 Name/role/value | ✅ | ⚠️ | 🎯 |
| ARIA live regions | ✅ | ⚠️ | 🔥 |
| Screen reader labels | ✅ | ⚠️ | 🔥 |

---

## 11. Advanced / Ecosystem

| Feature | Obsidian | mdock | Priority |
|---------|----------|-------|----------|
| Dataview queries | ✅ | ❌ | 📝 |
| Datacore | ✅ | ❌ | 📝 |
| Backlinks panel | ✅ | ❌ | 📝 |
| Graph view | ✅ | ❌ | 📝 |
| Outliner plugin | ✅ | ❌ | 📝 |
| Kanban plugin | ✅ | ❌ | 📝 |
| Calendar plugin | ✅ | ❌ | 📝 |
| Templater plugin | ✅ | ❌ | 📝 |
| QuickAdd plugin | ✅ | ❌ | 📝 |
| Custom CSS snippets | ✅ | ❌ | 📝 |

---

## Summary Statistics

| Category | Total | ✅ Full | ⚠️ Partial | ❌ Missing | 🎯 P0 | 🔥 P1 | 📝 P2 |
|----------|-------|---------|------------|------------|-------|-------|-------|
| Basic Markdown | 20 | 17 | 2 | 1 | 8 | 2 | 1 |
| GFM Extensions | 6 | 6 | 0 | 0 | 3 | 2 | 0 |
| Lists | 7 | 7 | 0 | 0 | 4 | 1 | 1 |
| Obsidian Extensions | 20 | 8 | 5 | 7 | 5 | 4 | 3 |
| Math | 3 | 1 | 1 | 1 | 0 | 2 | 1 |
| Diagrams/Embeds | 8 | 1 | 0 | 7 | 0 | 1 | 6 |
| Live Editing | 7 | 0 | 1 | 6 | 3 | 2 | 0 |
| Keyboard | 15 | 15 | 0 | 0 | 6 | 9 | 0 |
| Mobile | 5 | 0 | 1 | 4 | 0 | 3 | 1 |
| Accessibility | 8 | 1 | 6 | 1 | 3 | 3 | 1 |
| Ecosystem | 8 | 0 | 0 | 8 | 0 | 0 | 8 |
| **TOTAL** | **107** | **56** | **16** | **35** | **32** | **32** | **19** |

---

## Key Gaps for Obsidian Parity (P0)

1. **Wikilinks** - Source OK, preview/navigation missing
2. **Callouts** - Source OK, preview as blockquote only
3. **Wikilinks/Embeds navigation** - Core Obsidian workflow
4. **Live Preview interaction** - Click→edit blocks selection/copy
5. **Wikilink autocomplete** - Core productivity feature
6. **Math rendering** - No KaTeX/MathJax in preview
7. **Mermaid/Excalidraw** - Core Obsidian diagrams
8. **Wikilink autocomplete** - Core productivity feature