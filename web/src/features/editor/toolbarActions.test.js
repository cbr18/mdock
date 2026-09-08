import { describe, expect, test } from 'vitest';
import { applyCommandToView, COMMANDS, initialFormValues } from './toolbarActions.js';

function fakeView(text, from = 0, to = from) {
  const dispatches = [];
  let doc = text;
  return {
    state: {
      doc: { toString: () => doc },
      selection: { main: { from, to } }
    },
    dispatch(spec) {
      dispatches.push(spec);
      if (spec.changes) {
        const { from: changeFrom, to: changeTo, insert } = spec.changes;
        doc = `${doc.slice(0, changeFrom)}${insert}${doc.slice(changeTo)}`;
      }
    },
    focus() {},
    dispatches
  };
}

describe('markdown toolbar actions', () => {
  test('applies an inline command through the view and focuses', () => {
    const view = fakeView('hello', 0, 5);
    applyCommandToView(view, 'bold');
    expect(view.dispatches).toHaveLength(1);
    expect(view.dispatches[0].changes.insert).toBe('**hello**');
    expect(view.dispatches[0].selection.main.anchor).toBe(2);
  });

  test('applies a block command to the current selection', () => {
    const view = fakeView('Title', 0, 5);
    applyCommandToView(view, 'heading2');
    expect(view.dispatches[0].changes.insert).toBe('## Title');
  });

  test('applies a parametrized command with form values', () => {
    const view = fakeView('Page', 0, 4);
    applyCommandToView(view, 'wikilink', { target: 'Page', alias: 'Alias' });
    expect(view.dispatches[0].changes.insert).toBe('[[Page|Alias]]');
  });

  test('returns true and dispatches once when the command changes the doc', () => {
    const view = fakeView('hello', 0);
    expect(applyCommandToView(view, 'horizontalRule')).toBe(true);
    expect(view.dispatches).toHaveLength(1);
    expect(view.dispatches[0].changes.insert).toContain('---');
  });

  test('does not dispatch for an unknown command', () => {
    const view = fakeView('hello', 0);
    expect(applyCommandToView(view, 'missing')).toBe(false);
    expect(view.dispatches).toHaveLength(0);
  });

  test('commands map produces Obsidian-compatible source', () => {
    const state = { text: 'body', selectionStart: 0, selectionEnd: 4 };
    expect(COMMANDS.bold.run(state, {}).text).toBe('**body**');
    expect(COMMANDS.quote.run(state, {}).text).toBe('> body');
    expect(COMMANDS.taskList.run(state, {}).text).toBe('- [ ] body');
    expect(COMMANDS.link.run(state, { url: 'https://example.com', label: '' }).text).toBe('[body](https://example.com)');
    expect(COMMANDS.callout.run(state, { type: 'warning', title: 'Careful' }).text).toBe('> [!warning] Careful\n> body');
    expect(COMMANDS.metadata.run({ text: 'Body', selectionStart: 0, selectionEnd: 0 }, { key: 'title', value: 'New' }).text).toBe('---\ntitle: "New"\n---\nBody');
  });

  test('initialFormValues fills defaults for static and defaulted params', () => {
    expect(initialFormValues(COMMANDS.heading3)).toEqual({ level: 3 });
    expect(initialFormValues(COMMANDS.table)).toEqual({ rows: 2, cols: 2 });
    expect(initialFormValues(COMMANDS.callout)).toEqual({ type: 'note', title: '' });
  });
});