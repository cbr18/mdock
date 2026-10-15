# Plan: Mobile Touch Support (P1-8) for Live Preview

## Task: [2026_10_12_15_00_mobile_touch_support.md](../tasks/2026_10_12_15_00_mobile_touch_support.md)

## Implementation Sequence

### Phase 1: Touch Selection & Double-Tap Edit (livePreview.ts)
1. Add touch event state tracking (touch start position, time, target block)
2. Add `touchstart`, `touchmove`, `touchend` handlers in `domEventHandlers`
3. Implement touch-to-source-position mapping for text selection
4. Add double-tap detection for block activation (edit mode)
5. Ensure `touch-action: manipulation` on rendered blocks

### Phase 2: Pinch Zoom on Images/Diagrams (RenderedBlockWidget.ts + styles.css)
1. Add pinch gesture detection (two-finger distance tracking)
2. Apply CSS transform scale on pinch-target elements (images, mermaid, PDF iframes)
3. Add zoom limits (0.5x–3x) and momentum decay
4. Add `touch-action: pinch-zoom` on zoomable elements
5. Respect `prefers-reduced-motion`

### Phase 3: Long-Press Context Menu (livePreview.ts + RenderedBlockWidget.ts)
1. Add long-press detection (500ms timer on touchstart)
2. Show context menu on wikilinks, embeds, images
3. Menu actions: open, copy link, copy embed, copy image URL
4. Dismiss on tap outside or escape

### Phase 4: Responsive Toolbar (MarkdownEditor.jsx + styles.css)
1. Add CSS media query for mobile (< 768px)
2. Make toolbar groups collapsible with overflow-x scroll
3. Ensure 44×44px minimum touch targets on all buttons
4. Increase padding/gap for touch-friendly spacing
5. Add `touch-action: manipulation` on toolbar buttons

### Phase 5: Mobile Styles (styles.css)
1. Add selection handle styles for mobile text selection
2. Add context menu styles (positioning, animation)
3. Add pinch zoom transition styles
4. Ensure proper touch target sizes across all interactive elements
5. Add mobile-specific focus styles

## Verification Checks
- `cd packages/mdock-editor && npm run build` - builds successfully
- `cd web && npm run build` - builds successfully
- `cd packages/mdock-editor && npm test` - tests pass
- Manual test on mobile browser (iOS Safari / Chrome Android)

## Risks
- Touch events may conflict with existing mouse handlers - use `pointerEvents` or careful event separation
- Pinch zoom on iframes (PDF) may be limited by browser security
- Context menu positioning near viewport edges
- Text selection mapping from touch to source position accuracy

## Rollback Notes
Revert the four modified files if any regression occurs:
- `packages/mdock-editor/src/core/extensions/livePreview.ts`
- `packages/mdock-editor/src/core/widgets/RenderedBlockWidget.ts`
- `packages/mdock-editor/src/styles.css`
- `web/src/features/editor/MarkdownEditor.jsx`