/**
 * mdock Markdown Editor - Adapter for @mdock/editor library
 * Provides mdock-specific toolbar, lock status, i18n integration
 */

import { useRef, useMemo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MarkdownEditor as LibraryMarkdownEditor, useMarkdownEditor } from '@mdock/editor/react';
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
  Strikethrough,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';
import { mdockLivePreviewConfig, MDOCK_COMMANDS, MDOCK_TOOLBAR_GROUPS, MDOCK_PARAM_LABEL_KEYS } from './mdockEditorConfig.js';
import { COMMANDS as LIB_COMMANDS, applyCommandToView, initialFormValues } from '@mdock/editor';
import { getGroupIcon, getCommandIcon } from './editorIcons';
import { lockStatusKey } from './markdownUtils';

// Merge library commands with mdock-specific commands
const COMMANDS = { ...LIB_COMMANDS, ...MDOCK_COMMANDS };

const FORM_MENU = {
  codeBlock: 'paragraph',
  link: 'insert',
  image: 'insert',
  wikilink: 'insert',
  embed: 'insert',
  table: 'insert',
  callout: 'insert',
  footnote: 'insert',
  metadata: 'insert',
};

const MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const MOD = MAC ? 'Meta' : 'Ctrl';

export function MarkdownEditor({
  value,
  dirty,
  lockStatus,
  readOnly = false,
  saveDisabled,
  variant = 'source',
  onChange,
  onSave,
}) {
  const { t } = useLanguage();
  const { theme } = useTheme();

  // Build toolbar config with i18n labels
  const toolbarConfig = useMemo(() => ({
    groups: Object.values(MDOCK_TOOLBAR_GROUPS).map((group) => ({
      ...group,
      label: t(group.label),
      commands: group.commands.map((cmdId) => {
        const cmd = COMMANDS[cmdId];
        return cmd ? { ...cmd, label: t(cmd.label) } : null;
      }).filter(Boolean),
    })),
  }), [t]);

  // Live preview config with localized frontmatter label
  const livePreviewConfig = useMemo(() => ({
    ...mdockLivePreviewConfig,
    frontmatterLabel: t('frontmatter'),
  }), [t]);

  // Toolbar state
  const [openMenu, setOpenMenu] = useState('');
  const [pendingForm, setPendingForm] = useState(null);
  const editorRef = useRef(null);

  // Get editor instance for running commands
  const { editor } = useMarkdownEditor({
    value,
    readOnly,
    livePreview: variant === 'live' ? livePreviewConfig : false,
    onChange,
  });

  // Store editor ref for toolbar commands
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  function runCommand(key, values = {}) {
    if (editorRef.current?.view) {
      applyCommandToView(editorRef.current.view, key, values);
    }
    setPendingForm(null);
    setOpenMenu('');
  }

  const formNode = pendingForm ? (
    <ToolbarForm
      command={pendingForm}
      onSubmit={(values) => runCommand(pendingForm.id, values)}
      onClose={() => setPendingForm(null)}
      t={t}
    />
  ) : null;

  function menuForm(name) {
    return openMenu === name && FORM_MENU[pendingForm?.id] === name ? formNode : null;
  }

  // Save handler
  const handleSave = () => {
    if (onSave && !saveDisabled && dirty) {
      onSave();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSave, saveDisabled, dirty]);

  return (
    <section className="markdown-editor-shell" aria-label={t('markdownEditor')}>
      {!readOnly ? (
        <div className="editor-toolbar" aria-label={t('editorToolbar')}>
          <button
            type="button"
            className="icon-text-button"
            onClick={handleSave}
            disabled={saveDisabled || !dirty}
          >
            <Save size={16} aria-hidden="true" />
            {t('save')}
          </button>
          <span className={`editor-lock-status editor-lock-${lockStatus}`} role="status" aria-live="polite">
            {t(lockStatusKey(lockStatus))}
          </span>
          {toolbarConfig.groups.map((group) => (
            <ToolbarMenu
              key={group.name}
              name={group.name}
              icon={getGroupIcon(group.name)}
              label={group.label}
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
              form={menuForm(group.name)}
            >
              {group.commands.map((cmd) => (
                <CommandButton
                  key={cmd.id}
                  command={cmd}
                  icon={getCommandIcon(cmd.id)}
                  label={cmd.label}
                  onRun={runCommand}
                  onOpenForm={setPendingForm}
                />
              ))}
            </ToolbarMenu>
          ))}
        </div>
      ) : null}
      <LibraryMarkdownEditor
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        variant={variant}
        livePreviewConfig={livePreviewConfig}
        minHeight="520px"
      />
    </section>
  );
}

// Toolbar components (moved here from separate file for simplicity)
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
  const hasForm = command?.params?.some?.((param) => param.type !== 'static');
  return (
    <button type="button" className="toolbar-command" title={label} onClick={hasForm ? () => onOpenForm(command.id) : () => onRun(command.id)}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ToolbarForm({ command, onSubmit, onClose, t }) {
  const fields = (command?.params || []).filter((param) => param.type !== 'static');
  const [values, setValues] = useState(() => {
    const initial = {};
    for (const param of fields) {
      initial[param.name] = param.default ?? '';
    }
    return initial;
  });
  if (!command || fields.length === 0) {
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
          <span>{t(MDOCK_PARAM_LABEL_KEYS[field.name] || field.name)}</span>
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