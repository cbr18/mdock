# Wikilink Heading/Block References Component Specification

**Status**: READY FOR IMPLEMENTATION  
**Priority**: P1-4 (Wikilink Heading/Block References)  
**Type**: Extension to existing Wikilink system

---

## 1. Anatomy Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Wikilink with Heading/Block Reference                      │
│                                                              │
│  Syntax: [[Page#Heading]] or [[Page#^block-id]]            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Autocomplete Suggestion                             │    │
│  │ ┌─────────────────────────────────────────────────┐  │    │
│  │ │ Page Title                    ▲                 │  │    │
│  │ │ ├── # Getting Started                  │         │  │    │
│  │ │ ├── # Installation                     │         │  │    │
│  │ │ │   └── # Prerequisites                │         │  │    │
│  │ │ ├── # Configuration                    │         │  │    │
│  │ │ ├── ^block-abc123 (paragraph)          │         │  │    │
│  │ │ └── ^block-def456 (code block)         │         │  │    │
│  │ └─────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Rendered Link (Live Preview)                        │    │
│  │ ┌─────────────────────────────────────────────────┐  │    │
│  │ │ Page Title > Installation                       │  │    │
│  │ └─────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Syntax

### Heading References
```markdown
[[Page Name#Heading]]
[[Page Name#Heading|Alias]]
[[Page Name##Sub-heading]]
[[Page Name###Deep Heading]]
```

### Block References
```markdown
[[Page Name#^block-id]]
[[Page Name#^block-id|Alias]]
```

### Combined
```markdown
[[Page Name#Heading#^block-id]]  /* heading then block within */
```

---

## 3. Variants

| Reference Type | Syntax | Target | Navigation Behavior |
|----------------|--------|--------|---------------------|
| Page only | `[[Page]]` | Page top | Scroll to top |
| Heading | `[[Page#Heading]]` | Heading element | Scroll to heading |
| Block | `[[Page#^block-id]]` | Block element | Scroll to block |
| Heading + Block | `[[Page#Heading#^block]]` | Block within heading | Scroll to block |

---

## 4. Autocomplete Enhancement

### Current: Page-level only
```
[[Page Title]]
```

### Enhanced: Hierarchical suggestions
```
Page Title
├── # Getting Started
├── # Installation
│   └── # Prerequisites
├── # Configuration
├── ^block-abc123 (First paragraph)
├── ^block-def456 (Code block)
└── ^block-ghi789 (List item)
```

### API Response Format
```json
{
  "results": [
    {
      "path": "Page Title",
      "title": "Page Title",
      "type": "page",
      "preview": "First paragraph...",
      "headings": [
        { "level": 1, "text": "Getting Started", "id": "getting-started" },
        { "level": 2, "text": "Prerequisites", "id": "prerequisites" }
      ],
      "blocks": [
        { "id": "block-abc123", "type": "paragraph", "preview": "First paragraph..." },
        { "id": "block-def456", "type": "code", "preview": "const x = 1;" }
      ]
    }
  ]
}
```

---

## 5. Implementation Plan

### 5.1 Extended Wikilink Regex
Update `findWikilinks` and autocomplete to parse:
- `[[page#heading]]`
- `[[page#^block]]`
- `[[page#heading|alias]]`

### 5.2 Heading/Block Index API
Extend `/api/vaults/{slug}/pages/search` to return:
- `headings[]`: { level, text, id, slug }
- `blocks[]`: { id, type, preview }

### 5.3 Autocomplete Enhancement
- Group results by page
- Show headings/blocks as nested items
- Keyboard navigation through hierarchy

### 5.4 Navigation Logic
- Click → scroll to heading/block via `element.scrollIntoView()`
- Highlight target briefly (flash animation)
- Update URL hash: `#heading-id` or `#^block-id`

### 5.5 Heading IDs
- Generate stable IDs from heading text (slugify)
- Handle duplicates: `heading`, `heading-1`, `heading-2`
- Store in page index

### 5.6 Block IDs
- Auto-generate `^block-{hash}` for each block
- Allow manual `^custom-id` via command
- Store in block metadata

---

## 6. Token Mapping (No New Tokens)

Reuses existing:
- `--callout-border` → link border
- `--accent` → link color
- `--shadow` → autocomplete dropdown
- `--surface` → autocomplete background

---

## 7. Acceptance Criteria (from Backlog)

- [ ] Heading references `[[Page#Heading]]` navigate to heading
- [ ] Block references `[[Page#^block]]` navigate to block
- [ ] Block IDs `^id` can be added via command
- [ ] Auto-generate unique block IDs
- [ ] Heading references update on heading rename

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Heading ID changes on edit | High | High | Store heading slug in index, update on rename |
| Block ID stability | High | High | Use content hash + position, allow manual override |
| Autocomplete performance | Medium | Medium | Debounce, limit results, paginate |
| Cross-page navigation | Medium | High | Reuse existing `navigateToPage` + hash scroll |

---

## 9. Dependencies

- Existing: Wikilink autocomplete (`wikilinkAutocomplete`)
- Existing: Page Index API (`/api/vaults/{slug}/pages/search`)
- New: Heading/Block index in page metadata
- New: Block ID generation/storage

---

## 10. Rollout Checklist

- [ ] Extend wikilink regex for `#heading` and `#^block`
- [ ] Update Page Index API to include headings/blocks
- [ ] Enhance autocomplete with hierarchical results
- [ ] Implement click navigation with scroll
- [ ] Add Block ID command (toolbar)
- [ ] Auto-generate block IDs on block creation
- [ ] Heading rename → update references
- [ ] Tests for all reference types