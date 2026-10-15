# Embed Component Specification

**Status**: READY FOR IMPLEMENTATION  
**Priority**: P1-1 (Embeds in Live Preview)  
**Type**: Molecule (combines resource detection + rendering)

---

## 1. Anatomy Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Embed Container (varies by type)                           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ IMAGE EMBED                                          │    │
│  │ ┌─────────────────────────────────────────────────┐  │    │
│  │ │                                                 │  │    │
│  │ │              [Image]                            │  │    │
│  │ │                                                 │  │    │
│  │ └─────────────────────────────────────────────────┘  │    │
│  │ [filename.png]                              [100px]  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ NOTE EMBED (Transclusion)                           │    │
│  │ ┌─────────────────────────────────────────────────┐  │    │
│  │ │ 📄 Note Title                                   │  │    │
│  │ │                                                 │  │    │
│  │ │    Transcluded markdown content...              │  │    │
│  │ │    • Lists                                      │  │    │
│  │ │    • Code blocks                                │  │    │
│  │ │    • Nested embeds                              │  │    │
│  │ │                                                 │  │    │
│  │ └─────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ PDF EMBED                                           │    │
│  │ ┌─────────────────────────────────────────────────┐  │    │
│  │ │  [PDF.js viewer toolbar]                        │  │    │
│  │ │                                                 │  │    │
│  │ │              [PDF Page 1]                       │  │    │
│  │ │                                                 │  │    │
│  │ │              [PDF Page 2]                       │  │    │
│  │ │                                                 │  │    │
│  │ └─────────────────────────────────────────────────┘  │    │
│  │ document.pdf (15 pages)                     [600px]  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ MISSING / ERROR                                     │    │
│  │ ┌─────────────────────────────────────────────────┐  │    │
│  │ │ ⚠  missing-file.png                             │  │    │
│  │ │     File not found in vault                     │  │    │
│  │ └─────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Variants (by Resource Type)

| Type | Detection | Rendering | API Dependency |
|------|-----------|-----------|----------------|
| **Image** | `![[file.png]]`, `![[file.jpg]]`, `![[file.webp]]`, `![[file.gif]]`, `![[file.svg]]` | `<img>` with vault path | `/api/vaults/{slug}/files/{path}` |
| **Note** | `![[Note]]`, `![[Note.md]]` | Transcluded markdown (recursive) | `/api/vaults/{slug}/files/content?path=Note.md` |
| **PDF** | `![[file.pdf]]` | `<iframe>` with PDF.js | `/api/vaults/{slug}/files/{path}` + PDF.js |
| **Audio** | `![[file.mp3]]`, `![[file.wav]]`, `![[file.ogg]]` | `<audio controls>` | `/api/vaults/{slug}/files/{path}` |
| **Video** | `![[file.mp4]]`, `![[file.webm]]` | `<video controls>` | `/api/vaults/{slug}/files/{path}` |
| **Missing** | Any unresolvable path | Error placeholder | — |

---

## 3. Syntax

### Basic Embeds
```markdown
![[image.png]]
![[Note]]
![[document.pdf]]
```

### With Size (Images Only)
```markdown
![[image.png|100]]           # width 100px
![[image.png|100x200]]       # width x height
![[image.png|50%]]           # percentage of container
```

### Note Embeds (Transclusion)
```markdown
![[Note]]                    # Full note content
![[Note#Heading]]            # Section only (future: P1-4)
![[Note#^block]]             # Block only (future: P2-4)
```

---

## 4. States

| State | Visual | Token |
|-------|--------|-------|
| **Default** | Normal rendering | Base tokens |
| **Hover (image)** | Slight zoom (1.02×) + overlay | `--embed-image-hover-scale` |
| **Hover (note)** | Border highlight | `--callout-border` |
| **Hover (PDF)** | Toolbar visibility | — |
| **Loading** | Skeleton / spinner | `--embed-loading-bg`, `--spinner-color` |
| **Error** | Red border, warning icon, filename | `--danger`, `--warning` |
| **Disabled** | N/A | — |

---

## 5. Token Mapping

### New CSS Variables (add to `:root`)

```css
:root {
  /* Embed container */
  --embed-radius: var(--radius);
  --embed-border: var(--border);
  --embed-bg: var(--surface-2);
  --embed-padding: var(--space-3);
  --embed-gap: var(--space-2);
  
  /* Image embed */
  --embed-image-bg: var(--bg-subtle);
  --embed-image-hover-scale: 1.02;
  --embed-image-transition: transform var(--duration-fast) var(--ease-out),
                             box-shadow var(--duration-fast) var(--ease-out);
  --embed-image-max-width: 100%;
  --embed-image-object-fit: contain;
  
  /* Note embed (transclusion) */
  --embed-note-border: var(--border);
  --embed-note-bg: var(--surface-2);
  --embed-note-title-bg: var(--bg-subtle);
  --embed-note-title-text: var(--text-soft);
  --embed-note-icon: var(--text-muted);
  
  /* PDF embed */
  --embed-pdf-bg: var(--bg);
  --embed-pdf-border: var(--border);
  --embed-pdf-toolbar-bg: var(--surface-2);
  --embed-pdf-height: 600px;
  --embed-pdf-height-sm: 400px;
  
  /* Audio/Video */
  --embed-media-bg: var(--bg);
  --embed-media-controls-bg: var(--surface-2);
  
  /* Error placeholder */
  --embed-error-border: var(--danger);
  --embed-error-bg: color-mix(in srgb, var(--danger) 10%, transparent);
  --embed-error-text: var(--danger);
  --embed-error-icon: var(--danger);
  
  /* Loading skeleton */
  --embed-loading-bg: color-mix(in srgb, var(--text-muted) 15%, transparent);
  --embed-loading-shimmer: color-mix(in srgb, var(--text-muted) 25%, transparent);
}

/* Dark theme adjustments */
.theme-root[data-theme="dark"] {
  --embed-image-bg: var(--bg);
  --embed-note-bg: var(--surface-2);
  --embed-pdf-bg: var(--bg);
}

/* Light theme */
.theme-root[data-theme="light"] {
  --embed-image-bg: var(--surface);
  --embed-note-bg: var(--surface);
  --embed-pdf-bg: var(--surface);
}
```

---

## 6. Markdown Syntax

### Images
```markdown
![[diagram.png]]
![[diagram.png|300]]
![[diagram.png|300x200]]
![[diagram.png|50%]]
```

### Notes (Transclusion)
```markdown
![[Meeting Notes]]
![[Meeting Notes.md]]
![[folder/Note]]
```

### PDF
```markdown
![[spec.pdf]]
![[spec.pdf|600]]  # height override
```

### Audio/Video
```markdown
![[recording.mp3]]
![[demo.mp4|400]]  # width
```

---

## 7. Implementation Plan

### 7.1 remark Plugin: `remark-embed.ts`
- Parse `![[path|size]]` syntax in blockquotes/paragraphs
- Extract: path, optional size, resource type (by extension)
- Transform to custom AST node: `type: 'embed', data: { embedPath, embedSize, embedType }`

### 7.2 rehype Plugin: `rehype-embed.ts`
- Transform AST to HTML based on `embedType`
- **Images**: `<img src="/api/vaults/{slug}/files/{path}" data-embed-size="300">`
- **Notes**: `<div class="embed-note" data-embed-path="Note.md">` → fetch & render via JS
- **PDF**: `<iframe class="embed-pdf" src="/embed/pdf?path=doc.pdf">`
- **Audio/Video**: `<audio/video controls src="...">`
- **Error**: `<div class="embed-error">...</div>`

### 7.3 Client-side JS (for dynamic embeds)
- **Note transclusion**: Fetch content, parse markdown, inject (with recursion guard)
- **PDF.js**: Lazy-load PDF.js, initialize in iframe
- **Image loading**: Lazy-load with IntersectionObserver, blur-up placeholder

### 7.4 CSS (`styles.css`)
Add embed styles with all variants, states, responsive behavior.

### 7.5 API Integration
- Image/PDF/Audio/Video: Direct file serving endpoint
- Note content: Existing `/api/vaults/{slug}/files/content?path=...`

---

## 8. Acceptance Criteria (from Backlog)

- [ ] Image embeds `![[image.png]]` → render `<img>` with correct path
- [ ] Note embeds `![[Note]]` → render transcluded content
- [ ] PDF embeds `![[doc.pdf]]` → iframe/preview with PDF.js
- [ ] Size syntax `![[img|100]]` respected
- [ ] Missing files shown as placeholder with error

---

## 9. Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| **PDF.js** | PDF rendering in iframe | Need to add (lazy load) |
| **Vault File API** | `/api/vaults/{slug}/files/{path}` | Existing |
| **Note Content API** | `/api/vaults/{slug}/files/content?path=...` | Existing |
| **IntersectionObserver** | Lazy image loading | Native |

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Recursive note transclusion (A embeds B embeds A) | Medium | High | Track visited paths, max depth 10 |
| PDF.js bundle size (~2MB) | High | Medium | Lazy load only when PDF embed present |
| Large image loading performance | Medium | Medium | Lazy load + blur placeholder + WebP |
| Cross-vault embeds | Low | Medium | Validate path stays within vault |
| Missing file handling | High | Low | Graceful error placeholder with retry |

---

## 11. Rollout Checklist

- [ ] remark-embed plugin
- [ ] rehype-embed plugin  
- [ ] CSS styles for all embed types
- [ ] PDF.js integration (lazy)
- [ ] Note transclusion fetch + render
- [ ] Error placeholders
- [ ] Size parsing
- [ ] Integration in mdockEditorConfig
- [ ] Unit tests for parsing
- [ ] Visual regression for all types
- [ ] Accessibility audit