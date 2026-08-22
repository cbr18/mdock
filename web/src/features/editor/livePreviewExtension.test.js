import { expect, test } from 'vitest';
import { __livePreviewInternals } from './livePreviewExtension.js';

const { activeBlockRange, splitBlocks } = __livePreviewInternals;

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
