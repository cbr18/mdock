import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import {
  Bold,
  Braces,
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
import { createPortal } from 'react-dom';
import { useLanguage } from '../i18n/LanguageProvider.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';
import { livePreviewExtension } from './livePreviewExtension.js';
import { applyCommandToView, COMMANDS, initialFormValues } from './toolbarActions.js';

const MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const MOD = MAC ? 'Meta' : 'Ctrl';

const PARAM_LABEL_KEYS = {
  url: 'formUrl',
  label: 'formLabel',
  alt: 'formAlt',
  target: 'formTarget',
  alias: 'formAlias',
  title: 'formTitle',
  type: 'formType',
  rows: 'formRows',
  cols: 'formColumns',
  id: 'formId',
  text: 'formText',
  key: 'formKey',
  value: 'formValue',
  lang: 'formLanguage'
};

const FORM_MENU = {
  codeBlock: 'paragraph',
  link: 'insert',
  image: 'insert',
  wikilink: 'insert',
  embed: 'insert',
  table: 'insert',
  callout: 'insert',
  footnote: 'insert',
  metadata: 'insert'
};

export function MarkdownEditor({ value, dirty, lockStatus, readOnly = false, saveDisabled, variant = 'source', onChange, onSave }) {
  const viewRef = useRef(null);
  const [openMenu, setOpenMenu] = useState('');
  const [pendingForm, setPendingForm] = useState('');
  const { t } = useLanguage();
  const { theme } = useTheme();
  const extensions = useMemo(() => {
    const items = [markdown({ base: markdownLanguage })];
    if (readOnly) {
      items.push(EditorState.readOnly.of(true), EditorView.editable.of(false));
    }
    if (variant === 'live') {
      items.push(livePreviewExtension({ frontmatterLabel: t('frontmatter') }), EditorView.editorAttributes.of({ class: 'cm-live-preview' }));
    }
    // Keyboard shortcuts
    items.push(keymap.of([
      // Save
      { key: `${MOD}-s`, run: (view) => { if (onSave) { onSave(); return true; } return false; }, preventDefault: true },
      // Undo/Redo (handled by history extension)
      { key: `${MOD}-z`, run: (view) => { view.dispatch({ effects: EditorView.undo.of(true) }); return true; } },
      { key: `${MOD}-y`, run: (view) => { view.dispatch({ effects: EditorView.redo.of(true) }); return true; } },
      { key: `Shift-${MOD}-z`, run: (view) => { view.dispatch({ effects: EditorView.redo.of(true) }); return true; } },
      // Select All
      { key: `${MOD}-a`, run: (view) => { view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } }); return true; } },
    ]));
    return items;
  }, [readOnly, t, variant, onSave]);
  const codeMirrorTheme = theme === 'light' || theme === 'warm' ? 'light' : 'dark';

  function runCommand(key, values = {}) {
    if (viewRef.current) applyCommandToView(viewRef.current, key, values);
    setPendingForm('');
    setOpenMenu('');
  }

  const formNode = pendingForm ? (
    <ToolbarForm command={pendingForm} onSubmit={(values) => runCommand(pendingForm, values)} onClose={() => setPendingForm('')} />
  ) : null;
  function menuForm(name) {
    return openMenu === name && FORM_MENU[pendingForm] === name ? formNode : null;
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
          <ToolbarMenu name="paragraph" icon={<Pilcrow size={16} aria-hidden="true" />} label={t('paragraph')} openMenu={openMenu} setOpenMenu={setOpenMenu} form={menuForm('paragraph')}>
            <CommandButton command="paragraph" icon={<Pilcrow size={16} aria-hidden="true" />} label={t('paragraph')} onRun={runCommand} onOpenForm={setPendingForm} />
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <CommandButton key={level} command={`heading${level}`} icon={<Heading size={16} aria-hidden="true" />} label={t(`heading${level}`)} onRun={runCommand} onOpenForm={setPendingForm} />
            ))}
            <CommandButton command="quote" icon={<Quote size={16} aria-hidden="true" />} label={t('quote')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="codeBlock" icon={<Code2 size={16} aria-hidden="true" />} label={t('codeBlock')} onRun={runCommand} onOpenForm={setPendingForm} />
          </ToolbarMenu>
          <ToolbarMenu name="inline" icon={<Bold size={16} aria-hidden="true" />} label={t('inlineFormatting')} openMenu={openMenu} setOpenMenu={setOpenMenu} form={menuForm('inline')}>
            <CommandButton command="bold" icon={<Bold size={16} aria-hidden="true" />} label={t('bold')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="italic" icon={<Italic size={16} aria-hidden="true" />} label={t('italic')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="strikethrough" icon={<Strikethrough size={16} aria-hidden="true" />} label={t('strikethrough')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="highlight" icon={<Highlighter size={16} aria-hidden="true" />} label={t('highlight')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="inlineCode" icon={<Code2 size={16} aria-hidden="true" />} label={t('inlineCode')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="comment" icon={<MessageSquare size={16} aria-hidden="true" />} label={t('comment')} onRun={runCommand} onOpenForm={setPendingForm} />
          </ToolbarMenu>
          <ToolbarMenu name="lists" icon={<List size={16} aria-hidden="true" />} label={t('listFormatting')} openMenu={openMenu} setOpenMenu={setOpenMenu} form={menuForm('lists')}>
            <CommandButton command="bulletList" icon={<List size={16} aria-hidden="true" />} label={t('bulletList')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="orderedList" icon={<ListOrdered size={16} aria-hidden="true" />} label={t('orderedList')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="taskList" icon={<CheckSquare size={16} aria-hidden="true" />} label={t('taskList')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="taskDone" icon={<CheckSquare size={16} aria-hidden="true" />} label={t('taskDone')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="indent" label={t('indent')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="outdent" label={t('outdent')} onRun={runCommand} onOpenForm={setPendingForm} />
          </ToolbarMenu>
          <ToolbarMenu name="insert" icon={<Rows2 size={16} aria-hidden="true" />} label={t('insert')} openMenu={openMenu} setOpenMenu={setOpenMenu} form={menuForm('insert')}>
            <CommandButton command="link" icon={<Link size={16} aria-hidden="true" />} label={t('link')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="image" icon={<Image size={16} aria-hidden="true" />} label={t('image')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="wikilink" label={t('wikilink')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="embed" label={t('embed')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="table" icon={<Rows2 size={16} aria-hidden="true" />} label={t('table')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="callout" icon={<Quote size={16} aria-hidden="true" />} label={t('callout')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="horizontalRule" icon={<Minus size={16} aria-hidden="true" />} label={t('horizontalRule')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="inlineMath" icon={<Sigma size={16} aria-hidden="true" />} label={t('inlineMath')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="blockMath" icon={<Sigma size={16} aria-hidden="true" />} label={t('blockMath')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="footnote" label={t('footnote')} onRun={runCommand} onOpenForm={setPendingForm} />
            <CommandButton command="metadata" icon={<Braces size={16} aria-hidden="true" />} label={t('metadata')} onRun={runCommand} onOpenForm={setPendingForm} />
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

function ToolbarMenu({ name, icon, label, openMenu, setOpenMenu, form, children }) {
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const [position, setPosition] = useState(null);
  const isOpen = openMenu === name;

  function computePosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(300, Math.max(220, window.innerWidth - 32));
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const maxHeight = Math.max(120, window.innerHeight - rect.bottom - 16);
    setPosition({ left, top: rect.bottom + 6, width, maxHeight });
  }

  function handleToggle() {
    if (isOpen) {
      setOpenMenu('');
    } else {
      computePosition();
      setOpenMenu(name);
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return undefined;
    }
    computePosition();
    window.addEventListener('scroll', computePosition, true);
    window.addEventListener('resize', computePosition);
    return () => {
      window.removeEventListener('scroll', computePosition, true);
      window.removeEventListener('resize', computePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handlePointerDown(event) {
      if (popoverRef.current?.contains(event.target)) return;
      if (buttonRef.current?.contains(event.target)) return;
      setOpenMenu('');
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

  const popover = isOpen
    ? createPortal(
        <div
          className="toolbar-popover"
          role="menu"
          ref={popoverRef}
          style={position ? { position: 'fixed', left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight } : undefined}
        >
          {children}
          {form}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="toolbar-menu" ref={buttonRef}>
      <button type="button" className="secondary-button" aria-haspopup="menu" aria-expanded={isOpen} onClick={handleToggle}>
        {icon}
        <span>{label}</span>
      </button>
      {popover}
    </div>
  );
}

function CommandButton({ command, icon, label, onRun, onOpenForm }) {
  const definition = COMMANDS[command];
  const hasForm = (definition?.params || []).some((param) => param.type !== 'static');
  return (
    <button type="button" className="toolbar-command" title={label} onClick={hasForm ? () => onOpenForm(command) : () => onRun(command)}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ToolbarForm({ command, onSubmit, onClose }) {
  const { t } = useLanguage();
  const definition = COMMANDS[command];
  const fields = (definition?.params || []).filter((param) => param.type !== 'static');
  const [values, setValues] = useState(() => initialFormValues(definition));
  if (!definition || fields.length === 0) {
    return null;
  }
  function setValue(name, next) {
    setValues((prev) => ({ ...prev, [name]: next }));
  }
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(values);
  }
  return (
    <form className="toolbar-form" onSubmit={handleSubmit}>
      {fields.map((field) => (
        <label key={field.name} className="toolbar-form-field">
          <span>{t(PARAM_LABEL_KEYS[field.name] || field.name)}</span>
          {field.type === 'select' ? (
            <select value={values[field.name]} onChange={(event) => setValue(field.name, event.target.value)}>
              {field.options.map((option) => (
                <option key={option} value={option}>{option || t('formLanguageNone')}</option>
              ))}
            </select>
          ) : (
            <input
              autoFocus={fields[0].name === field.name}
              type={field.type === 'number' ? 'number' : 'text'}
              min={field.type === 'number' ? 1 : undefined}
              value={values[field.name]}
              onChange={(event) => setValue(field.name, event.target.value)}
            />
          )}
        </label>
      ))}
      <div className="toolbar-form-actions">
        <button type="submit" className="secondary-button">{t('toolbarApply')}</button>
        <button type="button" className="secondary-button" onClick={onClose}>{t('cancel')}</button>
      </div>
    </form>
  );
}

function lockStatusKey(status) {
  if (status === 'locked') return 'editorLocked';
  if (status === 'locking') return 'editorLocking';
  if (status === 'lost') return 'editorLockLost';
  if (status === 'saving') return 'editorSaving';
  return 'editorReadonly';
}