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
import { livePreviewExtension } from './livePreviewExtension.js';

export function MarkdownEditor({ value, dirty, lockStatus, readOnly = false, saveDisabled, variant = 'source', onChange, onSave }) {
  const viewRef = useRef(null);
  const [openMenu, setOpenMenu] = useState('');
  const { t } = useLanguage();
  const { theme } = useTheme();
  const extensions = useMemo(() => {
    const items = [markdown({ base: markdownLanguage })];
    if (readOnly) {
      items.push(EditorState.readOnly.of(true), EditorView.editable.of(false));
    }
    if (variant === 'live') {
      items.push(livePreviewExtension(), EditorView.editorAttributes.of({ class: 'cm-live-preview' }));
    }
    return items;
  }, [readOnly, variant]);
  const codeMirrorTheme = theme === 'light' || theme === 'warm' ? 'light' : 'dark';

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
            <ToolbarButton icon={<Pilcrow size={16} aria-hidden="true" />} label={t('paragraph')} />
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <ToolbarButton key={level} icon={<Heading size={16} aria-hidden="true" />} label={t(`heading${level}`)} />
          ))}
          <ToolbarButton icon={<Quote size={16} aria-hidden="true" />} label={t('quote')} />
          <ToolbarButton icon={<Code2 size={16} aria-hidden="true" />} label={t('codeBlock')} />
        </ToolbarMenu>
          <ToolbarMenu name="inline" icon={<Bold size={16} aria-hidden="true" />} label={t('inlineFormatting')} openMenu={openMenu} setOpenMenu={setOpenMenu}>
          <ToolbarButton icon={<Bold size={16} aria-hidden="true" />} label={t('bold')} />
          <ToolbarButton icon={<Italic size={16} aria-hidden="true" />} label={t('italic')} />
          <ToolbarButton icon={<Strikethrough size={16} aria-hidden="true" />} label={t('strikethrough')} />
          <ToolbarButton icon={<Highlighter size={16} aria-hidden="true" />} label={t('highlight')} />
          <ToolbarButton icon={<Code2 size={16} aria-hidden="true" />} label={t('inlineCode')} />
          <ToolbarButton icon={<MessageSquare size={16} aria-hidden="true" />} label={t('comment')} />
        </ToolbarMenu>
          <ToolbarMenu name="lists" icon={<List size={16} aria-hidden="true" />} label={t('listFormatting')} openMenu={openMenu} setOpenMenu={setOpenMenu}>
          <ToolbarButton icon={<List size={16} aria-hidden="true" />} label={t('bulletList')} />
          <ToolbarButton icon={<ListOrdered size={16} aria-hidden="true" />} label={t('orderedList')} />
          <ToolbarButton icon={<CheckSquare size={16} aria-hidden="true" />} label={t('taskList')} />
          <ToolbarButton icon={<CheckSquare size={16} aria-hidden="true" />} label={t('taskDone')} />
          <ToolbarButton label={t('indent')} />
          <ToolbarButton label={t('outdent')} />
        </ToolbarMenu>
          <ToolbarMenu name="insert" icon={<Rows2 size={16} aria-hidden="true" />} label={t('insert')} openMenu={openMenu} setOpenMenu={setOpenMenu}>
          <ToolbarButton icon={<Link size={16} aria-hidden="true" />} label={t('link')} />
          <ToolbarButton icon={<Image size={16} aria-hidden="true" />} label={t('image')} />
          <ToolbarButton label={t('wikilink')} />
          <ToolbarButton label={t('embed')} />
          <ToolbarButton icon={<Rows2 size={16} aria-hidden="true" />} label={t('table')} />
          <ToolbarButton icon={<Quote size={16} aria-hidden="true" />} label={t('callout')} />
          <ToolbarButton icon={<Minus size={16} aria-hidden="true" />} label={t('horizontalRule')} />
          <ToolbarButton icon={<Sigma size={16} aria-hidden="true" />} label={t('inlineMath')} />
          <ToolbarButton icon={<Sigma size={16} aria-hidden="true" />} label={t('blockMath')} />
          <ToolbarButton label={t('footnote')} />
          <ToolbarButton label={t('metadata')} />
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

function ToolbarButton({ icon, label }) {
  const { t } = useLanguage();
  return (
    <button type="button" className="toolbar-command toolbar-command-disabled" disabled title={t('notImplementedYet')}>
      {icon}
      <span>{label}</span>
      <small>{t('notImplementedYet')}</small>
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
