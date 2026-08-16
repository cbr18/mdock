import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  Bold,
  CheckSquare,
  Code2,
  Heading,
  Highlighter,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  MessageSquare,
  Minus,
  Pilcrow,
  Quote,
  Rows2,
  Save,
  Sigma,
  Strikethrough
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';
import {
  ensureFrontmatter,
  indentLines,
  insertBlockMath,
  insertCallout,
  insertCodeBlock,
  insertEmbed,
  insertFootnote,
  insertHorizontalRule,
  insertImage,
  insertInlineMath,
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

export function MarkdownEditor({ value, dirty, lockStatus, readOnly = false, saveDisabled, onChange, onSave }) {
  const viewRef = useRef(null);
  const [openMenu, setOpenMenu] = useState('');
  const { t } = useLanguage();
  const { theme } = useTheme();
  const extensions = useMemo(() => {
    const items = [markdown({ base: markdownLanguage })];
    if (readOnly) {
      items.push(EditorState.readOnly.of(true), EditorView.editable.of(false));
    }
    return items;
  }, [readOnly]);
  const codeMirrorTheme = theme === 'light' || theme === 'warm' ? 'light' : 'dark';

  function run(action) {
    if (readOnly) return;
    const view = viewRef.current;
    if (!view) return;
    const doc = view.state.doc.toString();
    const selection = view.state.selection.main;
    const next = action({
      text: doc,
      selectionStart: selection.from,
      selectionEnd: selection.to
    });
    view.dispatch({
      changes: { from: 0, to: doc.length, insert: next.text },
      selection: { anchor: next.selectionStart, head: next.selectionEnd }
    });
    onChange(next.text);
    view.focus();
  }

  return (
    <section className="markdown-editor-shell" aria-label={t('markdownEditor')}>
      {!readOnly ? (
        <div className="editor-toolbar" aria-label={t('editorToolbar')}>
          <button type="button" className="icon-text-button" onClick={onSave} disabled={saveDisabled || !dirty}>
            <Save size={16} aria-hidden="true" />
            {t('save')}
          </button>
          <span className={`editor-lock-status editor-lock-${lockStatus}`} role="status" aria-live="polite">{t(lockStatusKey(lockStatus))}</span>
          <ToolbarMenu name="paragraph" icon={<Pilcrow size={16} aria-hidden="true" />} label={t('paragraph')} openMenu={openMenu} setOpenMenu={setOpenMenu}>
            <ToolbarButton icon={<Pilcrow size={16} aria-hidden="true" />} label={t('paragraph')} onClick={() => run(setParagraph)} />
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <ToolbarButton key={level} icon={<Heading size={16} aria-hidden="true" />} label={t(`heading${level}`)} onClick={() => run((state) => setHeading(state, level))} />
          ))}
          <ToolbarButton icon={<Quote size={16} aria-hidden="true" />} label={t('quote')} onClick={() => run(toggleBlockquote)} />
          <ToolbarButton icon={<Code2 size={16} aria-hidden="true" />} label={t('codeBlock')} onClick={() => run((state) => insertCodeBlock(state, ''))} />
        </ToolbarMenu>
          <ToolbarMenu name="inline" icon={<Bold size={16} aria-hidden="true" />} label={t('inlineFormatting')} openMenu={openMenu} setOpenMenu={setOpenMenu}>
          <ToolbarButton icon={<Bold size={16} aria-hidden="true" />} label={t('bold')} onClick={() => run((state) => toggleInlineMark(state, '**'))} />
          <ToolbarButton icon={<Italic size={16} aria-hidden="true" />} label={t('italic')} onClick={() => run((state) => toggleInlineMark(state, '*'))} />
          <ToolbarButton icon={<Strikethrough size={16} aria-hidden="true" />} label={t('strikethrough')} onClick={() => run((state) => toggleInlineMark(state, '~~'))} />
          <ToolbarButton icon={<Highlighter size={16} aria-hidden="true" />} label={t('highlight')} onClick={() => run((state) => toggleInlineMark(state, '=='))} />
          <ToolbarButton icon={<Code2 size={16} aria-hidden="true" />} label={t('inlineCode')} onClick={() => run(toggleInlineCode)} />
          <ToolbarButton icon={<MessageSquare size={16} aria-hidden="true" />} label={t('comment')} onClick={() => run(toggleComment)} />
        </ToolbarMenu>
          <ToolbarMenu name="lists" icon={<List size={16} aria-hidden="true" />} label={t('listFormatting')} openMenu={openMenu} setOpenMenu={setOpenMenu}>
          <ToolbarButton icon={<List size={16} aria-hidden="true" />} label={t('bulletList')} onClick={() => run(toggleBulletList)} />
          <ToolbarButton icon={<ListOrdered size={16} aria-hidden="true" />} label={t('orderedList')} onClick={() => run(toggleOrderedList)} />
          <ToolbarButton icon={<CheckSquare size={16} aria-hidden="true" />} label={t('taskList')} onClick={() => run(toggleTaskList)} />
          <ToolbarButton icon={<CheckSquare size={16} aria-hidden="true" />} label={t('taskDone')} onClick={() => run(toggleTaskDone)} />
          <ToolbarButton label={t('indent')} onClick={() => run(indentLines)} />
          <ToolbarButton label={t('outdent')} onClick={() => run(outdentLines)} />
        </ToolbarMenu>
          <ToolbarMenu name="insert" icon={<Rows2 size={16} aria-hidden="true" />} label={t('insert')} openMenu={openMenu} setOpenMenu={setOpenMenu}>
          <ToolbarButton icon={<Link size={16} aria-hidden="true" />} label={t('link')} onClick={() => run((state) => insertMarkdownLink(state, 'https://'))} />
          <ToolbarButton icon={<Image size={16} aria-hidden="true" />} label={t('image')} onClick={() => run((state) => insertImage(state, 'https://'))} />
          <ToolbarButton label={t('wikilink')} onClick={() => run((state) => insertWikilink(state))} />
          <ToolbarButton label={t('embed')} onClick={() => run((state) => insertEmbed(state))} />
          <ToolbarButton icon={<Rows2 size={16} aria-hidden="true" />} label={t('table')} onClick={() => run((state) => insertTable(state, 2, 2))} />
          <ToolbarButton icon={<Quote size={16} aria-hidden="true" />} label={t('callout')} onClick={() => run((state) => insertCallout(state, 'note'))} />
          <ToolbarButton icon={<Minus size={16} aria-hidden="true" />} label={t('horizontalRule')} onClick={() => run(insertHorizontalRule)} />
          <ToolbarButton icon={<Sigma size={16} aria-hidden="true" />} label={t('inlineMath')} onClick={() => run(insertInlineMath)} />
          <ToolbarButton icon={<Sigma size={16} aria-hidden="true" />} label={t('blockMath')} onClick={() => run(insertBlockMath)} />
          <ToolbarButton label={t('footnote')} onClick={() => run((state) => insertFootnote(state, '1', ''))} />
          <ToolbarButton label={t('metadata')} onClick={() => run((state) => ensureFrontmatter(state, { tags: [] }))} />
        </ToolbarMenu>
        </div>
      ) : null}
      <CodeMirror
        value={value}
        aria-label={t('markdownEditor')}
        minHeight="520px"
        theme={codeMirrorTheme}
        extensions={extensions}
        onCreateEditor={(view) => {
          viewRef.current = view;
        }}
        onChange={(nextValue) => onChange(nextValue)}
        basicSetup={{ foldGutter: true, highlightActiveLine: true, lineNumbers: true }}
      />
    </section>
  );
}

function ToolbarMenu({ name, icon, label, openMenu, setOpenMenu, children }) {
  const ref = useRef(null);
  const isOpen = openMenu === name;

  useEffect(() => {
    if (!isOpen) return undefined;
    function handlePointerDown(event) {
      if (!ref.current?.contains(event.target)) {
        setOpenMenu('');
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpenMenu('');
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setOpenMenu]);

  return (
    <div className="toolbar-menu" ref={ref}>
      <button type="button" className="secondary-button" aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setOpenMenu(isOpen ? '' : name)}>
        {icon}
        <span>{label}</span>
      </button>
      {isOpen ? <div className="toolbar-popover" role="menu">{children}</div> : null}
    </div>
  );
}

function ToolbarButton({ icon, label, onClick }) {
  return (
    <button type="button" className="toolbar-command" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function lockStatusKey(status) {
  if (status === 'locked') return 'editorLocked';
  if (status === 'locking') return 'editorLocking';
  if (status === 'lost') return 'editorLockLost';
  if (status === 'saving') return 'editorSaving';
  return 'editorReadonly';
}
