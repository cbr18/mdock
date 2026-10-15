# Plan: P1-5 PDF/Size for Embeds

**Task: [2026_10_11_15_00_pdf_size_embeds.md](../tasks/2026_10_11_15_00_pdf_size_embeds.md)**

## Последовательность реализации

### 1. Create PDF Viewer Page (web/src/pages/PdfViewerPage.jsx) ✅
- Lazy-load PDF.js via dynamic import ✅
- Support page navigation (prev/next, page input) ✅
- Support zoom in/out/fit-width/fit-page ✅
- Support text search ✅
- Handle loading/error states ✅
- URL params: `file` (required), `page` (optional), `width`, `height` ✅

### 2. Update rehype-embed.ts (packages/mdock-editor/src/core/extensions/rehype-embed.ts) ✅
- Apply width/height to PDF iframe from embed size ✅
- Apply width/height to video element from embed size ✅
- Apply width/height to audio element from embed size (width only) ✅
- Ensure missing file handling maps to error embed type ✅ (existing)
- Pass size data to iframe for PDF viewer ✅

### 3. Update styles.css (packages/mdock-editor/src/styles.css) ✅
- Add responsive constraints for embed sizes ✅
- Ensure iframe respects width/height ✅
- Add PDF viewer specific styles ✅
- Ensure video/audio controls are visible ✅

### 4. Copy to web/src/lib/editor/ ✅
- Copy updated rehype-embed.ts ✅
- Copy updated styles.css ✅
- Copy to web/src/styles.css ✅

### 5. Add PDF viewer route to App.jsx ✅
- Add PdfViewerPage as lazy-loaded route ✅
- Handle `/embed/pdf` path ✅

### 6. Build and test ✅
- Run builds in both packages ✅
- Run tests ✅

## Проверки
- ✅ Size syntax `100`, `100x200`, `50%`, `100px` works for images
- ✅ Size syntax works for PDF iframe
- ✅ Size syntax works for video
- ✅ PDF viewer loads and renders PDF
- ✅ PDF viewer has page navigation, zoom, search
- ✅ Video/audio have native controls
- ✅ Missing files show error placeholder
- ✅ Builds pass
- ✅ Tests pass (mdock-editor: 26 passed, 8 skipped)

## Риски
- PDF.js bundle size - using dynamic import ✅ (code-split into ~430KB chunk)
- CORS issues with PDF.js worker - configured workerSrc to unpkg CDN ✅
- Iframe sizing - flex-based layout ensures proper height propagation ✅
- API error handling - 404 maps to error embed via existing error handling ✅

## Заметки по откату
- Remove PdfViewerPage.jsx
- Revert rehype-embed.ts to previous version
- Revert styles.css to previous version
- Remove route from App.jsx
- Remove pdfjs-dist dependency