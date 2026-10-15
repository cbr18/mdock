# Task: Mobile Touch Support (P1-8) for Live Preview

## Status: DONE

## Plan: [2026_10_12_15_00_mobile_touch_support_plan.md](../plans/2026_10_12_15_00_mobile_touch_support_plan.md)

## Problem
Live preview lacks proper mobile touch support. Users cannot select text, edit blocks, use toolbar, pinch-zoom images/diagrams, or access context menus on touch devices.

## Evidence
- Touch events not handled in `livePreview.ts` (only mouse events)
- Toolbar not responsive (fixed layout, small touch targets)
- No pinch zoom on images/diagrams/PDFs
- No long-press context menu for wikilinks/embeds
- Virtual keyboard doesn't appear on edit

## Non-functional Constraints
- Minimum touch target: 44×44px (WCAG 2.5.8)
- Use `touch-action: manipulation` where appropriate
- Respect `prefers-reduced-motion`
- Test on iOS Safari + Chrome Android
- Don't break existing desktop mouse/keyboard navigation

## Out of Scope
- Full PWA/offline support
- Native app wrapper
- Gesture navigation (swipe back/forward)

## Desired Behavior
1. **Touch selection**: Touch+drag selects text in rendered blocks; selection handles appear on mobile
2. **Virtual keyboard**: Double-tap block → focus source → show keyboard
3. **Responsive toolbar**: Collapsible groups on mobile, overflow scroll, 44×44px minimum touch targets
4. **Pinch zoom**: Two-finger pinch on images, diagrams, PDF embeds with zoom limits (0.5x–3x)
4. **Long-press context menu**: On wikilinks, embeds, images → show actions (open, copy link, copy embed)

## Affected Areas
- `packages/mdock-editor/src/core/extensions/livePreview.ts` - touch handlers
- `packages/mdock-editor/src/core/widgets/RenderedBlockWidget.ts` - touch events for widgets
- `packages/mdock-editor/src/styles.css` - mobile styles, touch targets, pinch zoom
- `web/src/features/editor/MarkdownEditor.jsx` - responsive toolbar

## Implementation Notes
- Add touchstart/touchmove/touchend handlers for text selection mapping
- Add touch event listeners in RenderedMarkdownBlockWidget for pinch zoom
- Use CSS media queries for responsive toolbar (< 768px)
- Add long-press detection (500ms hold)
- Ensure touch-action CSS for proper gesture handling

## Acceptance Criteria
- [ ] Touch selection works in live preview rendered blocks
- [ ] Double-tap on block activates edit mode (shows virtual keyboard)
- [ ] Toolbar collapses to scrollable groups on mobile (< 768px)
- [ ] All toolbar buttons meet 44×44px minimum touch target
- [ ] Pinch zoom works on images, mermaid diagrams, PDF embeds
- [ ] Long-press (500ms) shows context menu on wikilinks/embeds/images
- [ ] Existing desktop functionality unchanged
- [ ] Builds pass: `npm run build` in editor and web packages
- [ ] Tests pass: `npm test` in editor package

## Rollback
Revert changes to the four modified files if issues arise.