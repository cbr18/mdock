# Callout Component Specification

**Status**: READY FOR IMPLEMENTATION  
**Priority**: P0-3 (Callout Rendering in Live Preview)  
**Type**: Molecule (combines Icon + Text + optional Fold trigger)

---

## 1. Anatomy Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Callout Container                                          │
│  ┌────┐                                                     │
│  │ ●  │  Icon (type-specific, 20×20)                        │
│  └────┘                                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Title Area                                            │  │
│  │ ┌──────────────────┐  ┌────────────────────────────┐  │  │
│  │ │ Callout Title    │  │ [Fold Button] (optional)   │  │  │
│  │ │ (custom or type) │  │ ▼ / ▶ (24×24 touch target) │  │  │
│  │ └──────────────────┘  └────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Content Area (markdown-rendered)                      │  │
│  │ • Paragraphs, lists, code blocks                      │  │
│  │ • Nested callouts                                     │  │
│  │ • All inline formatting                               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Variants (7 Types + Custom)

| Type | Icon (Lucide) | Border Color | Background | Text Color | Use Case |
|------|---------------|--------------|------------|------------|----------|
| `note` | `info` | `--callout-note-border` | `--callout-note-bg` | `--callout-note-text` | General info |
| `info` | `help-circle` | `--callout-info-border` | `--callout-info-bg` | `--callout-info-text` | Reference info |
| `tip` | `lightbulb` | `--callout-tip-border` | `--callout-tip-bg` | `--callout-tip-text` | Tips, hints |
| `warning` | `alert-triangle` | `--callout-warning-border` | `--callout-warning-bg` | `--callout-warning-text` | Caution |
| `danger` | `alert-octagon` | `--callout-danger-border` | `--callout-danger-bg` | `--callout-danger-text` | Critical warning |
| `success` | `check-circle-2` | `--callout-success-border` | `--callout-success-bg` | `--callout-success-text` | Positive outcome |
| `question` | `help-circle` | `--callout-question-border` | `--callout-question-bg` | `--callout-question-text` | FAQ, help |

### Custom Type (CSS Extensibility)
```css
/* User-defined in vault CSS snippet */
.callout-custom-type {
  --callout-border: var(--custom-border);
  --callout-bg: var(--custom-bg);
  --callout-text: var(--custom-text);
  --callout-icon: var(--custom-icon);
}
```
Selector: `[data-callout-type="custom-type"]`

---

## 3. Sizes

Callouts are **fluid width** (100% of container), no fixed sizes.

| Context | Container Width | Padding |
|---------|-----------------|---------|
| Default | 100% (max 800px in preview) | `var(--space-4)` = 16px |
| Nested | 100% of parent | `var(--space-3)` = 12px |
| Mobile | 100vw - 2×gutter | `var(--space-3)` = 12px |

---

## 4. States (All Variants × All States)

| State | Visual Changes | Token Mapping |
|-------|----------------|---------------|
| **Default** | Base styling | `--callout-{type}-bg`, `--callout-{type}-border`, `--callout-{type}-text` |
| **Hover** | Subtle background elevation | `--callout-{type}-bg-hover` = `color-mix(var(--callout-{type}-bg) 92%, var(--surface-hover))` |
| **Focus** | Focus ring (keyboard nav to fold btn) | `--shadow-focus-ring` (3px, `--accent`) |
| **Folded** | Content hidden, fold btn shows ▶ | `height: auto` → `height: 0` via grid animation |
| **Unfolded** | Content visible, fold btn shows ▼ | `grid-template-rows: 1fr` |
| **Disabled** | N/A (not interactive except fold) | — |
| **Loading** | N/A | — |
| **Error** | N/A | — |

### Fold State (Special)
| State | Fold Button | Content |
|-------|-------------|---------|
| Folded | `▶` (rotate -90°) | `hidden`, `grid-template-rows: 0fr` |
| Unfolded | `▼` (rotate 0°) | `visible`, `grid-template-rows: 1fr` |

---

## 5. Token Mapping

### New Design Tokens Required

Add to `tokens/colors.json` (or CSS variables in `:root`):

```json
{
  "callout": {
    "note": {
      "border": "{color.blue.500}",
      "bg": "{color.blue.500/10}",
      "bgHover": "{color.blue.500/15}",
      "text": "{color.blue.700}",
      "icon": "{color.blue.500}"
    },
    "info": {
      "border": "{color.cyan.500}",
      "bg": "{color.cyan.500/10}",
      "bgHover": "{color.cyan.500/15}",
      "text": "{color.cyan.700}",
      "icon": "{color.cyan.500}"
    },
    "tip": {
      "border": "{color.amber.500}",
      "bg": "{color.amber.500/10}",
      "bgHover": "{color.amber.500/15}",
      "text": "{color.amber.700}",
      "icon": "{color.amber.500}"
    },
    "warning": {
      "border": "{color.orange.500}",
      "bg": "{color.orange.500/10}",
      "bgHover": "{color.orange.500/15}",
      "text": "{color.orange.700}",
      "icon": "{color.orange.500}"
    },
    "danger": {
      "border": "{color.red.500}",
      "bg": "{color.red.500/10}",
      "bgHover": "{color.red.500/15}",
      "text": "{color.red.700}",
      "icon": "{color.red.500}"
    },
    "success": {
      "border": "{color.green.500}",
      "bg": "{color.green.500/10}",
      "bgHover": "{color.green.500/15}",
      "text": "{color.green.700}",
      "icon": "{color.green.500}"
    },
    "question": {
      "border": "{color.violet.500}",
      "bg": "{color.violet.500/10}",
      "bgHover": "{color.violet.500/15}",
      "text": "{color.violet.700}",
      "icon": "{color.violet.500}"
    }
  }
}
```

### CSS Variable Mapping (in `:root` / themes)

```css
:root {
  /* Note */
  --callout-note-border: var(--color-blue-500);
  --callout-note-bg: color-mix(in srgb, var(--color-blue-500) 10%, transparent);
  --callout-note-bg-hover: color-mix(in srgb, var(--color-blue-500) 15%, transparent);
  --callout-note-text: var(--color-blue-700);
  --callout-note-icon: var(--color-blue-500);

  /* Info */
  --callout-info-border: var(--color-cyan-500);
  --callout-info-bg: color-mix(in srgb, var(--color-cyan-500) 10%, transparent);
  --callout-info-bg-hover: color-mix(in srgb, var(--color-cyan-500) 15%, transparent);
  --callout-info-text: var(--color-cyan-700);
  --callout-info-icon: var(--color-cyan-500);

  /* Tip */
  --callout-tip-border: var(--color-amber-500);
  --callout-tip-bg: color-mix(in srgb, var(--color-amber-500) 10%, transparent);
  --callout-tip-bg-hover: color-mix(in srgb, var(--color-amber-500) 15%, transparent);
  --callout-tip-text: var(--color-amber-700);
  --callout-tip-icon: var(--color-amber-500);

  /* Warning */
  --callout-warning-border: var(--color-orange-500);
  --callout-warning-bg: color-mix(in srgb, var(--color-orange-500) 10%, transparent);
  --callout-warning-bg-hover: color-mix(in srgb, var(--color-orange-500) 15%, transparent);
  --callout-warning-text: var(--color-orange-700);
  --callout-warning-icon: var(--color-orange-500);

  /* Danger */
  --callout-danger-border: var(--color-red-500);
  --callout-danger-bg: color-mix(in srgb, var(--color-red-500) 10%, transparent);
  --callout-danger-bg-hover: color-mix(in srgb, var(--color-red-500) 15%, transparent);
  --callout-danger-text: var(--color-red-700);
  --callout-danger-icon: var(--color-red-500);

  /* Success */
  --callout-success-border: var(--color-green-500);
  --callout-success-bg: color-mix(in srgb, var(--color-green-500) 10%, transparent);
  --callout-success-bg-hover: color-mix(in srgb, var(--color-green-500) 15%, transparent);
  --callout-success-text: var(--color-green-700);
  --callout-success-icon: var(--color-green-500);

  /* Question */
  --callout-question-border: var(--color-violet-500);
  --callout-question-bg: color-mix(in srgb, var(--color-violet-500) 10%, transparent);
  --callout-question-bg-hover: color-mix(in srgb, var(--color-violet-500) 15%, transparent);
  --callout-question-text: var(--color-violet-700);
  --callout-question-icon: var(--color-violet-500);

  /* Generic (fallback) */
  --callout-border: var(--border);
  --callout-bg: var(--surface-2);
  --callout-bg-hover: var(--surface-hover);
  --callout-text: var(--text);
  --callout-icon: var(--text-muted);
  --callout-radius: var(--radius);
  --callout-padding: var(--space-4);
  --callout-gap: var(--space-3);
  --callout-title-gap: var(--space-2);
  --callout-fold-btn-size: 24px;
  --callout-icon-size: 20px;
}
```

### Dark Theme Adjustments (`.theme-root[data-theme="dark"]`)
```css
.theme-root[data-theme="dark"] {
  /* Darker backgrounds for better contrast */
  --callout-note-bg: color-mix(in srgb, var(--color-blue-500) 15%, transparent);
  --callout-info-bg: color-mix(in srgb, var(--color-cyan-500) 15%, transparent);
  --callout-tip-bg: color-mix(in srgb, var(--color-amber-500) 15%, transparent);
  --callout-warning-bg: color-mix(in srgb, var(--color-orange-500) 15%, transparent);
  --callout-danger-bg: color-mix(in srgb, var(--color-red-500) 15%, transparent);
  --callout-success-bg: color-mix(in srgb, var(--color-green-500) 15%, transparent);
  --callout-question-bg: color-mix(in srgb, var(--color-violet-500) 15%, transparent);
  
  /* Lighter text for dark mode */
  --callout-note-text: var(--color-blue-300);
  --callout-info-text: var(--color-cyan-300);
  --callout-tip-text: var(--color-amber-300);
  --callout-warning-text: var(--color-orange-300);
  --callout-danger-text: var(--color-red-300);
  --callout-success-text: var(--color-green-300);
  --callout-question-text: var(--color-violet-300);
}
```

### Light Theme Adjustments (`.theme-root[data-theme="light"]`)
```css
.theme-root[data-theme="light"] {
  --callout-note-bg: color-mix(in srgb, var(--color-blue-500) 8%, transparent);
  --callout-info-bg: color-mix(in srgb, var(--color-cyan-500) 8%, transparent);
  --callout-tip-bg: color-mix(in srgb, var(--color-amber-500) 8%, transparent);
  --callout-warning-bg: color-mix(in srgb, var(--color-orange-500) 8%, transparent);
  --callout-danger-bg: color-mix(in srgb, var(--color-red-500) 8%, transparent);
  --callout-success-bg: color-mix(in srgb, var(--color-green-500) 8%, transparent);
  --callout-question-bg: color-mix(in srgb, var(--color-violet-500) 8%, transparent);
  
  --callout-note-text: var(--color-blue-800);
  --callout-info-text: var(--color-cyan-800);
  --callout-tip-text: var(--color-amber-800);
  --callout-warning-text: var(--color-orange-800);
  --callout-danger-text: var(--color-red-800);
  --callout-success-text: var(--color-green-800);
  --callout-question-text: var(--color-violet-800);
}
```

---

## 6. Accessibility (ARIA + Keyboard)

### ARIA Pattern: `role="region"` with `aria-labelledby`

```html
<div class="callout callout-note" data-callout-type="note" role="region" aria-labelledby="callout-title-1">
  <div class="callout-header">
    <span class="callout-icon" aria-hidden="true"><svg>...</svg></span>
    <div class="callout-title-area">
      <h4 id="callout-title-1" class="callout-title">Note</h4>
      <button class="callout-fold-btn" aria-expanded="true" aria-controls="callout-content-1" aria-label="Collapse callout">
        <svg class="fold-icon" aria-hidden="true">▼</svg>
      </button>
    </div>
  </div>
  <div id="callout-content-1" class="callout-content" role="region">
    <!-- markdown content -->
  </div>
</div>
```

### Keyboard Model

| Key | Action |
|-----|--------|
| `Tab` | Move to fold button (only interactive element) |
| `Enter` / `Space` | Toggle fold state |
| `Escape` | Close if folded? (no — keep simple) |

### Screen Reader Behavior

- Region announced as "Note region, [title], expanded/collapsed"
- Fold button announces "Collapse Note" / "Expand Note"
- Icon is decorative (`aria-hidden="true"`)
- Nested callouts are separate regions

### Focus Management

- Fold button receives focus ring: `--shadow-focus-ring`
- When folded → unfolded, focus stays on button
- Content is not focusable (read via virtual cursor)

---

## 7. Markdown Syntax

### Basic Callout
```markdown
> [!note]
> This is a note callout.
```

### With Custom Title
```markdown
> [!note] Custom Title
> Content here.
```

### Foldable (Collapsed by Default)
```markdown
> [!note]- 
> This starts collapsed.
```

### Foldable (Expanded by Default)
```markdown
> [!note]+
> This starts expanded.
```

### Nested Callouts
```markdown
> [!note]
> Outer content.
> > [!warning]
> > Nested warning.
```

---

## 8. Implementation Plan

### 8.1 remark Plugin (AST Transform)
Create `remark-callout.ts`:
- Parse `> [!type]` blockquotes
- Extract type, fold modifier (`-`, `+`), custom title
- Transform to custom AST nodes with `data-callout-type`, `data-callout-fold`, `data-callout-title`

### 8.2 rehype Plugin (HTML Render)
Create `rehype-callout.ts`:
- Transform AST nodes to HTML structure above
- Inject Lucide icons via `<svg>` with `currentColor`
- Add `data-callout-type` for CSS customization

### 8.3 CSS (`styles.css`)
Add callout styles with:
- Base container styling
- 7 type variants
- Fold animation (grid-based, no JS measurement)
- Hover/focus states
- Nested callout styling
- RTL support (logical properties)
- Reduced motion support

### 8.4 Integration
Add to `markdownRemarkPlugins` and `markdownRehypePlugins` in `mdockEditorConfig.js`

---

## 9. Acceptance Criteria (from Backlog)

- [ ] Callout types render with correct icons/colors: note, info, tip, warning, danger, success, question
- [ ] Callout title displays correctly (custom or type default)
- [ ] Foldable callouts (`> [!note]-`) - click to collapse/expand with animation
- [ ] Nested callouts render correctly
- [ ] Callout content preserves markdown rendering
- [ ] Custom callout types via CSS (`[data-callout-type="custom"]`)

---

## 10. Testing Requirements

### Unit Tests
- [ ] Type detection from markdown syntax
- [ ] Fold state parsing (`-` vs `+`)
- [ ] Custom title extraction
- [ ] Nested callout parsing

### Integration Tests
- [ ] All 7 types render in live preview
- [ ] Fold/unfold works via click
- [ ] Keyboard: Tab → Enter toggles
- [ ] Focus ring visible on fold button
- [ ] Nested callouts don't break layout

### Visual Regression
- [ ] All types × states in light/dark themes
- [ ] All 6 accent colors
- [ ] Nested callouts
- [ ] Folded/unfolded states
- [ ] Mobile (280px, 320px, 414px)

### Accessibility
- [ ] axe-core: 0 violations
- [ ] Focus ring 3:1 contrast
- [ ] ARIA region announced
- [ ] Fold button labeled correctly
- [ ] Color not only info carrier (icon + border + text all convey type)

---

## 11. Dependencies

- **Lucide icons** (already in project): `info`, `help-circle`, `lightbulb`, `alert-triangle`, `alert-octagon`, `check-circle-2`
- **remark** / **rehype** (already in project)
- **CSS custom properties** (already used throughout)

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CSS specificity conflicts with existing blockquote styles | Medium | Medium | Use high-specificity selector `[data-callout-type]`; avoid generic `blockquote` overrides |
| Fold animation jank on slow devices | Low | Low | Use `grid-template-rows` animation (no layout thrashing); honor `prefers-reduced-motion` |
| Nested callout margin collapse | Medium | Low | Explicit padding on `.callout-content`; use `flow-root` |
| Icon alignment in title row | Low | Low | Flexbox with `align-items: center`; fixed icon size |

---

## 13. Rollout Checklist

- [ ] Tokens added to CSS
- [ ] remark plugin created & tested
- [ ] rehype plugin created & tested
- [ ] CSS added to `styles.css`
- [ ] Integrated in `mdockEditorConfig.js`
- [ ] Unit tests pass
- [ ] Visual regression captures all states
- [ ] Accessibility audit passes
- [ ] Documentation updated