import { describe, expect, test, vi } from 'vitest';
import { StateEffect } from '@codemirror/state';
import { __livePreviewInternals } from './livePreviewExtension.js';

const { activeBlockRange, splitBlocks, blockAtPosition, createHandleEnter, createHandleSoftEnter, commitLineBreak, isCaretInsideFence } = __livePreviewInternals;

// Mock setActiveBlock for testing
const mockSetActiveBlock = StateEffect.define();
const handleEnter = createHandleEnter(mockSetActiveBlock);
const handleSoftEnter = createHandleSoftEnter(mockSetActiveBlock);

function fakeView(text, selection = { from: 0, to: 0, empty: true }) {
  let doc = text;
  const stateDoc = {
    toString: () => doc,
    get length() { return doc.length; },
    lineAt: (pos) => {
      const lines = doc.split('\n');
      let lineNum = 1;
      let offset = 0;
      for (let i = 0; i < lines.length; i++) {
        if (offset + lines[i].length >= pos) {
          lineNum = i + 1;
          break;
        }
        offset += lines[i].length + 1;
      }
      return { number: lineNum, from: offset, to: offset + lines[lineNum - 1].length, length: lines[lineNum - 1].length };
    },
    get lines() { return doc.split('\n').length; }
  };
  const dispatches = [];
  return {
    state: {
      doc: stateDoc,
      selection: { main: { ...selection, head: selection.to ?? selection.from } }
    },
    dispatch(spec) {
      dispatches.push(spec);
      if (spec.changes) {
        const { from: changeFrom, to: changeTo, insert } = spec.changes;
        doc = `${doc.slice(0, changeFrom)}${insert}${doc.slice(changeTo)}`;
      }
    },
    dispatches
  };
}

describe('live preview extension internals', () => {
  test('tracks list block source and rendered ranges separately', () => {
    const content = '- first\n- second\n\nParagraph';
    const [listBlock] = splitBlocks(content);
    const activeBlock = activeBlockRange(listBlock);

    expect(listBlock.type).toBe('list');
    expect(activeBlock.from).toBe(listBlock.from);
    expect(activeBlock.to).toBe(listBlock.to);
    expect(activeBlock.sourceTo).toBe(listBlock.sourceTo);
    expect(activeBlock.to).toBeGreaterThan(activeBlock.sourceTo);
  });

  test('finds separate blocks so rendered clicks can switch active block explicitly', () => {
    const content = '- first\n- second\n\nParagraph';
    const [listBlock, paragraphBlock] = splitBlocks(content);

    expect(listBlock.type).toBe('list');
    expect(paragraphBlock.type).toBe('paragraph');
    expect(activeBlockRange(paragraphBlock).from).toBeGreaterThan(activeBlockRange(listBlock).sourceTo);
  });

  test('blockAtPosition picks the block covering an insertion position', () => {
    const content = '- first\n- second\n\nParagraph';
    const [listBlock, paragraphBlock] = splitBlocks(content);

    expect(blockAtPosition({ doc: { toString: () => content } }, 0)).toEqual(listBlock);
    expect(blockAtPosition({ doc: { toString: () => content } }, content.indexOf('P'))).toEqual(paragraphBlock);
  });

  test('blockAtPosition falls back to the last block for a position at the very end', () => {
    const content = 'First\n\nSecond';
    const blocks = splitBlocks(content);
    expect(blockAtPosition({ doc: { toString: () => content } }, content.length)).toEqual(blocks[blocks.length - 1]);
  });

  test('blockAtPosition returns null for an empty document', () => {
    expect(blockAtPosition({ doc: { toString: () => '' } }, 0)).toBeNull();
  });
});

describe('live preview Enter key handling', () => {
  test('handleEnter inserts blank line (paragraph break) at end of paragraph', () => {
    const view = fakeView('Test paragraph', { from: 14, to: 14, empty: true });
    handleEnter(view);
    expect(view.dispatches).toHaveLength(1);
    expect(view.dispatches[0].changes.insert).toBe('\n\n');
    expect(view.state.doc.toString()).toBe('Test paragraph\n\n');
  });

  test('handleSoftEnter inserts single newline (soft break)', () => {
    const view = fakeView('Test paragraph', { from: 14, to: 14, empty: true });
    handleSoftEnter(view);
    expect(view.dispatches).toHaveLength(1);
    expect(view.dispatches[0].changes.insert).toBe('\n');
    expect(view.state.doc.toString()).toBe('Test paragraph\n');
  });

  test('handleEnter inserts single newline inside code fence', () => {
    const view = fakeView('```\ncode\n```', { from: 4, to: 4, empty: true });
    handleEnter(view);
    expect(view.dispatches[0].changes.insert).toBe('\n');
    const result = view.state.doc.toString();
    expect(result).toBe('```\n\ncode\n```');
  });

  test('isCaretInsideFence detects caret in code fence', () => {
    const state = {
      doc: { toString: () => '```\ncode\n```' },
      selection: { main: { head: 5 } }
    };
    expect(isCaretInsideFence(state)).toBe(true);
  });

  test('isCaretInsideFence returns false for caret outside code fence', () => {
    const state = {
      doc: { toString: () => '```\ncode\n```\nParagraph' },
      selection: { main: { head: 15 } }
    };
    expect(isCaretInsideFence(state)).toBe(false);
  });

  test('commitLineBreak uses separator when not in fence', () => {
    const view = fakeView('Paragraph', { from: 9, to: 9, empty: true });
    commitLineBreak(view, '\n\n', mockSetActiveBlock);
    expect(view.dispatches[0].changes.insert).toBe('\n\n');
  });
});