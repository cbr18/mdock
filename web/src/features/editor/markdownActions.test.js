import { describe, expect, test } from 'vitest';
import {
  ensureFrontmatter,
  indentLines,
  insertBlockMath,
  insertCallout,
  insertCodeBlock,
  insertFootnote,
  insertHorizontalRule,
  insertImage,
  insertMarkdownLink,
  insertTable,
  insertWikilink,
  outdentLines,
  setHeading,
  setParagraph,
  toggleBlockquote,
  toggleBulletList,
  toggleComment,
  toggleInlineCode,
  toggleInlineMark,
  toggleOrderedList,
  toggleTaskDone,
  toggleTaskList
} from './markdownActions.js';

function state(text, selectionStart = 0, selectionEnd = text.length) {
  return { text, selectionStart, selectionEnd };
}

describe('markdown editor actions', () => {
  test('toggles inline markers around selection', () => {
    expect(toggleInlineMark(state('hello', 0, 5), '**').text).toBe('**hello**');
    expect(toggleInlineMark(state('**hello**', 2, 7), '**').text).toBe('hello');
    expect(toggleComment(state('secret', 0, 6)).text).toBe('%%secret%%');
  });

  test('keeps structural prefix when applying inline markers over a heading', () => {
    expect(toggleInlineMark(state('## Title', 0, 8), '**').text).toBe('## **Title**');
    expect(toggleInlineMark(state('- item', 0, 6), '**').text).toBe('- **item**');
    expect(toggleInlineMark(state('> quote', 0, 7), '**').text).toBe('> **quote**');
    expect(toggleInlineMark(state('## **Title**', 0, 13), '**').text).toBe('## Title');
  });

  test('applies inline markers per line over a multi-line selection', () => {
    expect(toggleInlineMark(state('one\ntwo', 0, 7), '**').text).toBe('**one**\n**two**');
  });

  test('uses double backticks when inline code contains a backtick', () => {
    expect(toggleInlineCode(state('a ` b', 0, 5)).text).toBe('``a ` b``');
  });

  test('sets heading and paragraph for selected line', () => {
    expect(setHeading(state('Title', 0, 5), 2).text).toBe('## Title');
    expect(setParagraph(state('### Title', 0, 8)).text).toBe('Title');
  });

  test('toggles quote and list blocks', () => {
    expect(toggleBlockquote(state('one\ntwo', 0, 7)).text).toBe('> one\n> two');
    expect(toggleBulletList(state('one\ntwo', 0, 7)).text).toBe('- one\n- two');
    expect(toggleOrderedList(state('one\ntwo', 0, 7)).text).toBe('1. one\n2. two');
    expect(toggleTaskList(state('one', 0, 3)).text).toBe('- [ ] one');
  });

  test('toggles task completion', () => {
    expect(toggleTaskDone(state('- [ ] one', 0, 9)).text).toBe('- [x] one');
    expect(toggleTaskDone(state('- [x] one', 0, 9)).text).toBe('- [ ] one');
  });

  test('indents and outdents selected lines', () => {
    expect(indentLines(state('one\ntwo', 0, 7)).text).toBe('  one\n  two');
    expect(outdentLines(state('  one\n  two', 0, 11)).text).toBe('one\ntwo');
  });

  test('inserts block templates', () => {
    expect(insertCodeBlock(state('const x = 1;', 0, 12), 'js').text).toBe('```js\nconst x = 1;\n```');
    expect(insertHorizontalRule(state('', 0, 0)).text).toBe('---');
    expect(insertTable(state('', 0, 0), 1, 2).text).toBe('|  |  |\n| --- | --- |\n|  |  |');
    expect(insertBlockMath(state('x = 1', 0, 5)).text).toBe('$$\nx = 1\n$$');
  });

  test('inserts links and Obsidian links', () => {
    expect(insertMarkdownLink(state('site', 0, 4), 'https://example.com').text).toBe('[site](https://example.com)');
    expect(insertImage(state('alt', 0, 3), 'https://example.com/a.png').text).toBe('![alt](https://example.com/a.png)');
    expect(insertWikilink(state('Page', 0, 4)).text).toBe('[[Page]]');
    expect(insertWikilink(state('', 0, 0), 'Page', 'Alias').text).toBe('[[Page|Alias]]');
  });

  test('inserts callouts and footnotes', () => {
    expect(insertCallout(state('body', 0, 4), 'warning', 'Careful').text).toBe('> [!warning] Careful\n> body');
    expect(insertFootnote(state('text', 4, 4), 'note', 'details').text).toBe('text[^note]\n\n[^note]: details');
  });

  test('inserts or replaces frontmatter', () => {
    expect(ensureFrontmatter(state('Body', 0, 0), { tags: ['work'], draft: false }).text).toBe('---\ntags: ["work"]\ndraft: false\n---\nBody');
    expect(ensureFrontmatter(state('---\ntitle: old\n---\nBody', 0, 0), { title: 'new' }).text).toBe('---\ntitle: "new"\n---\nBody');
  });
});
