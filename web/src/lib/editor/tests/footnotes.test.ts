import { describe, expect, test } from 'vitest';
import { remarkFootnotes } from '../core/extensions/remark-footnotes';
import { rehypeFootnotes } from '../core/extensions/rehype-footnotes';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

/**
 * Test footnotes parsing and rendering
 * Uses the unified pipeline with correct plugin usage:
 * - remarkFootnotes() - call the factory
 * - rehypeFootnotes - pass the factory (don't call)
 */

function renderMarkdown(markdown: string): string {
  const processor = unified()
    .use(remarkParse)
    .use(remarkFootnotes())
    .use(remarkRehype)
    .use(rehypeFootnotes)
    .use(rehypeStringify);
  
  const file = processor.processSync(markdown);
  return String(file);
}

describe('footnotes rendering', () => {
  test('renders reference footnote [^1]', () => {
    const html = renderMarkdown('Text with footnote[^1]\n\n[^1]: Footnote content');
    
    // Should have superscript reference link with our CSS class
    expect(html).toContain('class="footnote-ref-link"');
    expect(html).toContain('href="#user-content-fn-1"');
    expect(html).toContain('data-footnote-ref');
    expect(html).toContain('1</a></sup>');
    
    // Should have footnote definition at bottom with our CSS class
    expect(html).toContain('class="footnotes"');
    expect(html).toContain('<ol');
    expect(html).toContain('class="footnote-definition"');
    expect(html).toContain('Footnote content');
    // Backlink has footnote-backlink class (among others)
    expect(html).toContain('footnote-backlink');
    expect(html).toContain('href="#user-content-fnref-1"');
    expect(html).toContain('↩');
  });

  test('renders inline footnote ^[text] (remark-footnotes limitation)', () => {
    // Note: remark-footnotes doesn't parse inline footnotes ^[text] by default
    // They remain as literal text
    const html = renderMarkdown('Text with inline footnote^[Inline content]');
    expect(html).toContain('Text with inline footnote');
  });

  test('renders multiple footnotes with correct identifiers', () => {
    const html = renderMarkdown('First[^a]\n\nSecond[^b]\n\n[^a]: First note\n[^b]: Second note');
    
    expect(html).toContain('href="#user-content-fn-a"');
    expect(html).toContain('href="#user-content-fn-b"');
    expect(html).toContain('id="user-content-fn-a"');
    expect(html).toContain('id="user-content-fn-b"');
    expect(html).toContain('id="user-content-fnref-a"');
    expect(html).toContain('id="user-content-fnref-b"');
    expect(html).toContain('First note');
    expect(html).toContain('Second note');
  });

  test('footnote reference has tooltip data attribute', () => {
    const html = renderMarkdown('Text[^1]\n\n[^1]: Tooltip content');
    
    // Tooltip content includes whitespace due to HTML formatting
    expect(html).toContain('data-footnote-tooltip="');
    expect(html).toContain('Tooltip content');
    expect(html).toContain('title="');
  });

  test('footnote backlink has correct class', () => {
    const html = renderMarkdown('Text[^note]\n\n[^note]: Content');
    
    // Backlink has footnote-backlink class (among others like data-footnote-backref)
    expect(html).toContain('footnote-backlink');
    // The aria-label uses the footnote number (1) not the identifier
    expect(html).toContain('aria-label="Back to reference 1"');
  });

  test('footnotes section has proper structure', () => {
    const html = renderMarkdown('Text[^1]\n\n[^1]: Content');
    
    expect(html).toContain('class="footnotes"');
    // The heading has the id and our CSS classes (sr-only is added by remark-footnotes)
    expect(html).toContain('id="footnote-label"');
    expect(html).toContain('footnotes-heading');
    expect(html).toContain('visually-hidden');
    expect(html).toContain('Footnotes</h2>');
  });
});

describe('footnotes integration with other plugins', () => {
  test('works with GFM (bold, italic)', () => {
    const html = renderMarkdown('**Bold** with [^1]\n\n[^1]: *Italic* note');
    
    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('<em>Italic</em>');
    expect(html).toContain('class="footnote-ref-link"');
  });
});