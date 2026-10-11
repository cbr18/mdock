# Editor Backlog — Prioritized

**Status**: DRAFT  
**Source**: [Capability Matrix](editor-obsidian-capability-matrix.md)  
**Created**: 2026-10-07  

---

## Prioritization Framework (RICE-like)

| Factor | Weight | Description |
|--------|--------|-------------|
| **Reach** | 25% | % of users who need this (estimated) |
| **Impact** | 35% | How critical for Obsidian parity |
| **Confidence** | 20% | How well we understand effort |
| **Effort** | 20% | Engineering weeks (inverse) |

Score = (Reach × 0.25) + (Impact × 0.35) + (Confidence × 0.20) - (Effort × 0.20)

---

## P0 — Critical for Obsidian Parity (Do First)

---

### [P0-1] Wikilink Navigation & Autocomplete
**User Story**: As a vault user, I want to create `[[Page]]` links with autocomplete and click them to navigate, so I can link notes like in Obsidian.

**Current State**: Source edit works (insert `[[ ]]`), preview shows as text, no navigation, no autocomplete.

**Acceptance Criteria**:
- [ ] Toolbar "Wikilink" command opens page picker modal
- [ ] Typing `[[` triggers autocomplete with page titles
- [ ] Selected page inserts `[[Page]]` or `[[Page|Alias]]`
- [ ] Click wikilink in live preview → navigate to page (or open in new pane)
- [ ] Hover wikilink → show preview tooltip (title + first lines)
- [ ] Broken links styled differently (red/italic)

**Dependencies**: Vault page index API, routing/navigation system
**Effort**: L (3-4 weeks)
**Risks**: Page index performance on large vaults (10k+ notes); routing integration with web app

---

### [P0-2] Live Preview Interaction Model (Click→Edit)
**User Story**: As a user, I want to select/copy text in live preview, and double-click or type to edit a block, so it behaves like Obsidian.

**Current State**: Single click on rendered block → immediately switches to source edit mode (blocks selection/copy).

**Acceptance Criteria**:
- [ ] Single click on rendered block → places cursor at click position (no edit mode)
- [ ] Text selection works normally in live preview
- [ ] Copy (Ctrl/Cmd+C) works in live preview
- [ ] Double-click on block → switches to source edit mode for that block
- [ ] Start typing on focused block → switches to source edit mode
- [ ] Enter in empty block → creates new paragraph (already works)
- [ ] Visual hover indicator on blocks (subtle border/bg)

**Dependencies**: `livePreviewExtension` refactor (widget interaction model)
**Effort**: M (2-3 weeks)
**Risks**: Block boundary edge cases; cursor position mapping between rendered↔source

---

### [P0-3] Callout Rendering in Live Preview
**User Story**: As a user, I want callouts `> [!warning] Title` to render with proper styling (icon, color, fold) in live preview, like Obsidian.

**Current State**: Source edit works; live preview renders as plain blockquote.

**Acceptance Criteria**:
- [ ] Callout types render with correct icons/colors: note, info, tip, warning, danger, success, question
- [ ] Callout title displays correctly
- [ ] Foldable callouts (`> [!note]-`) - click to collapse/expand
- [ ] Nested callouts render correctly
- [ ] Callout content preserves markdown rendering
- [ ] Custom callout types via CSS (extensibility)

**Effort**: M (2-3 weeks)
**Risks**: CSS specificity conflicts; fold state persistence

---

### [P0-4] Wikilink Autocomplete (Page Picker)
**User Story**: As a writer, I want `[[` to trigger a fuzzy-search page picker so I can link notes without memorizing titles.

**Current State**: Wikilink command opens form with manual text input.

**Acceptance Criteria**:
- [ ] Typing `[[` triggers debounced search (200ms)
- [ ] Fuzzy search matches title, aliases, content
- [ ] Results show: title, alias, path, preview snippet
- [ ] Keyboard navigation (↑/↓, Enter to select, Esc to cancel)
- [ ] Recent/linked pages prioritized
- [ ] Creates `[[Page]]` or `[[Page|Alias]]` on selection

**Dependencies**: Vault search/index API
**Effort**: M (2-3 weeks)
**Risks**: Search performance on 10k+ notes; debounce tuning

---

### [P0-5] Math Rendering (KaTeX)
**User Story**: As a technical writer, I want `$x^2$` and `$$E=mc^2$$` to render beautifully in live preview.

**Current State**: Source works; preview shows raw LaTeX.

**Acceptance Criteria**:
- [ ] Inline math `$...$` renders with KaTeX
- [ ] Block math `$$...$$` renders centered
- [ ] Copy math as LaTeX (context menu)
- [ ] Math rendering errors shown gracefully
- [ ] Configurable: delimiters, macros, output format

**Effort**: S-M (1-2 weeks)
**Dependencies**: KaTeX integration; CSP considerations
**Risks**: CSP `script-src` for KaTeX; bundle size (+40KB gzipped)

---

## P1 — Important for Workflow

---

### [P1-1] Embeds (`![[File.png]]`) in Live Preview
**User Story**: As a user, I want image/note embeds `![[image.png]]` to render in live preview.

**Current State**: Source works; preview shows as text.

**Acceptance Criteria**:
- [ ] Image embeds `![[image.png]]` → render `<img>` with correct path
- [ ] Note embeds `![[Note]]` → render transcluded content
- [ ] PDF embeds `![[doc.pdf]]` → iframe/preview
- [ ] Size syntax `![[img\|100]]` respected
- [ ] Missing files shown as placeholder with error

**Effort**: M (2-3 weeks)
**Dependencies**: Vault file API, image proxy, PDF.js for PDFs

---

### [P1-2] Mermaid Diagram Rendering
**User Story**: As a technical writer, I want Mermaid diagrams to render in live preview.

**Acceptance Criteria**:
- [ ] Mermaid blocks render in live preview
- [ ] Mermaid version configurable
- [ ] Theme sync (light/dark)
- [ ] Pan/zoom on large diagrams
- [ ] Copy as SVG/PNG (context menu)

**Effort**: M (2-3 weeks)
**Risks**: Mermaid bundle size (+150KB); CSP for dynamic SVG

---

### [P1-3] Footnotes in Live Preview
**User Story**: As a writer, I want footnotes `[^1]` and `^[inline]` to render with hover preview and backlinks.

**Acceptance Criteria**:
- [ ] Reference `[^1]` renders as superscript link
- [ ] Hover footnote ref → shows tooltip with content
- [ ] Footnote definition at bottom with backlink `↩`
- [ ] Inline footnotes `^[text]` render correctly
- [ ] Click ref → scroll to definition; click backlink → scroll to ref

**Effort**: S (1-2 weeks)

---

### [P1-4] Wikilink Heading/Block References
**User Story**: As a user, I want to link to specific headings `[[Page#Heading]]` and blocks `[[Page#^block]]`.

**Acceptance Criteria**:
- [ ] Heading references `[[Page#Heading]]` navigate to heading
- [ ] Block references `[[Page#^block]]` navigate to block
- [ ] Block IDs `^id` can be added via command
- [ ] Auto-generate unique block IDs
- [ ] Heading references update on heading rename

**Effort**: M (2-3 weeks)
**Dependencies**: Heading/block index API

---

### [P1-5] Embed Sizing & PDF Preview
**User Story**: As a user, I want `![[image\|100]]` to respect size and `![[doc.pdf]]` to preview.

**Acceptance Criteria**:
- [ ] Size syntax `![[img\|100]]` / `![[img\|50x50]]` respected
- [ ] PDF embeds render via PDF.js in iframe
- [ ] Video/audio embeds with native controls
- [ ] Missing files show placeholder with error

**Effort**: M (2-3 weeks)
**Dependencies**: PDF.js, media API

---

### [P1-6] Callout Folding
**User Story**: As a user, I want to collapse/expand callouts with `> [!note]-` syntax.

**Acceptance Criteria**:
- [ ] `> [!note]-` renders collapsed by default
- [ ] Click header → expand/collapse with animation
- [ ] Fold state persists in session
- [ ] Nested callouts fold independently

**Effort**: S (1-2 weeks)

---

### [P1-7] Keyboard Navigation in Live Preview
**User Story**: As a power user, I want full keyboard navigation in live preview (arrow keys, Home/End, PgUp/PgDn).

**Acceptance Criteria**:
- [ ] Arrow keys move cursor by visual line
- [ ] Home/End go to line start/end
- [ ] PgUp/PgDn scroll by viewport
- [ ] Ctrl/Cmd+Arrow navigate by word
- [ ] Shift+Arrow extend selection

**Effort**: S (1-2 weeks)
**Dependencies**: Live preview interaction model (P0-2)

---

### [P1-8] Mobile Touch Support
**User Story**: As a mobile user, I want to select text, scroll, and edit on touch devices.

**Acceptance Criteria**:
- [ ] Touch selection works in live preview
- [ ] Virtual keyboard appears on edit
- [ ] Toolbar accessible on mobile (responsive)
- [ ] Pinch zoom on diagrams/images
- [ ] Long-press context menu

**Effort**: M (2-3 weeks)
**Risks**: iOS Safari quirks; virtual keyboard viewport issues

---

## P2 — Nice to Have

---

### [P2-1] Inline Math Delimiters Config
**Effort**: XS (0.5 weeks)
- Configurable delimiters: `$...$`, `\(...\)`, etc.

### [P2-2] Custom Callout Types via CSS
**Effort**: XS (0.5 weeks)
- Document `data-callout-type` attribute for custom CSS

### [P2-3] Custom Wikilink Resolver
**Effort**: S (1 week)
- Hook for custom link resolution (e.g., external URLs)

### [P2-4] Block References (`^id`)
**Effort**: M (2-3 weeks)
- Add `^block-id` command
- Unique ID generation
- Transclusion `![[#^block]]`

### [P2-5] Dataview-like Queries
**Effort**: XL (8+ weeks)
- In-editor query language for vault metadata

### [P2-6] Graph View
**Effort**: XL (8+ weeks)
- Force-directed graph of wikilinks

### [P2-7] Custom CSS Snippets
**Effort**: M (2-3 weeks)
- User CSS injection per vault

### [P2-8] Templates System
**Effort**: M (2-3 weeks)
- Template folder, variables, hotkeys

### [P2-9] Plugin Architecture
**Effort**: XL (8+ weeks)
- Safe plugin sandbox (WebAssembly/iframe)

### [P2-10] Vim Mode
**Effort**: L (3-4 weeks)
- CodeMirror vim extension integration

### [P2-10] Typewriter / Focus Mode
**Effort**: S (1-2 weeks)
- Centered line, dim other paragraphs

---

## Effort Summary by Priority

| Priority | Count | Total Effort | Key Items |
|----------|-------|--------------|-----------|
| **P0** | 5 | ~12-15 weeks | Wikilinks, Live Preview Interaction, Callouts, Autocomplete, Math |
| **P1** | 8 | ~16-22 weeks | Embeds, Mermaid, Footnotes, Heading Refs, PDF, Callout Fold, Keys, Mobile |
| **P2** | 10 | ~30+ weeks | Block Refs, Dataview, Graph, CSS, Templates, Plugins, Vim |

---

## Suggested Sprint Plan (2-week sprints)

| Sprint | Focus | Deliverables |
|--------|-------|--------------|
| 1-2 | P0-1 Wikilinks + P0-4 Autocomplete | Page index, picker modal, autocomplete |
| 3-4 | P0-2 Live Preview Interaction | Click/dblclick/type handlers, selection |
| 5-6 | P0-3 Callouts + P0-5 Math | Callout renderer, KaTeX |
| 7-8 | P1-1 Embeds + P1-2 Mermaid | Image/note embeds, Mermaid |
| 9-10 | P1-3 Footnotes + P1-4 Wikilink Refs | Footnotes, heading/block refs |
| 9-10 | P1-5 PDF/Size + P1-6 Callout Fold | PDF.js, fold state |
| 11-12 | P1-7 Keys + P1-8 Mobile | Keyboard nav, touch |
| 13+ | P2 items | Prioritize by user feedback |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Page index performance on 10k+ notes | High | High | Incremental indexing, web workers, pagination |
| CodeMirror 6 view mocking in tests | Medium | Medium | Extract pure functions; integration tests in Cypress |
| KaTeX/Mermaid bundle size | Medium | Low | Dynamic import; lazy load on first use |
| CSP for KaTeX/Mermaid | Low | High | `script-src 'self' 'wasm-unsafe-eval'` |
| Wikilink routing + multi-pane | Medium | High | Design routing before implementation |
| Mobile virtual keyboard | Medium | Medium | Test on real devices early |
| Mermaid bundle size (+150KB) | Medium | Medium | Dynamic import; lazy load |

---

## Dependencies Between Features

```
P0-1 Wikilinks
    ├── P0-4 Autocomplete (depends on page index)
    ├── P1-4 Wikilink Refs (depends on heading/block index)
    └── P1-1 Embeds (shares file resolution)

P0-2 Live Preview Interaction
    ├── P1-7 Keyboard Nav (depends on interaction model)
    ├── P1-8 Mobile Touch (depends on interaction model)
    └── P1-3 Footnotes (depends on block activation)

P0-3 Callouts
    ├── P1-6 Callout Fold (extends callout renderer)
    └── P0-5 Math (separate but similar renderer)

P0-5 Math
    └── P2-1 Configurable Delimiters (trivial after KaTeX)

P1-1 Embeds
    ├── P1-5 PDF/Size (extends embed system)
    └── P2-4 Block Refs (transclusion `![[#^block]]`)
```

---

## Definition of Done per Feature

- [ ] Unit tests for core logic (≥80% coverage)
- [ ] Integration test in library test suite
- [ ] E2E test in web app (Cypress/Playwright)
- [ ] Accessibility audit (axe + manual)
- [ ] Mobile test (iOS Safari + Chrome Android)
- [ ] Performance budget met (<100ms interaction)
- [ ] Documentation updated (README + API docs)
- [ ] Changelog entry

---

## Notes for Implementation

1. **Page Index API** — Critical path for P0-1, P0-4, P1-4. Design first.
2. **Live Preview Architecture** — Refactor interaction model before P1-7/P1-8.
3. **CSS Architecture** — Use CSS custom properties for theming callouts/math/embeds.
4. **Dynamic Imports** — Lazy-load KaTeX, Mermaid, PDF.js on first use.
5. **Test Strategy** — Unit tests for pure functions; Cypress for integration; skip CodeMirror view mocks.