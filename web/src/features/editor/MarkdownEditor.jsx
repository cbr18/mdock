/**
 * mdock Markdown Editor - Adapter for @mdock/editor library
 * Provides mdock-specific toolbar, lock status, i18n integration
 */

import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MarkdownEditor as LibraryMarkdownEditor, useMarkdownEditor } from '@mdock/editor/react';
import { wikilinkAutocomplete } from '@mdock/editor';
import { useMermaid, useMermaidToolbar } from './useMermaid.js';
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
  GitBranch,
  Menu,
  X,
  MoreHorizontal,
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
  mermaid: 'insert',
};

const MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const MOD = MAC ? 'Meta' : 'Ctrl';

// Hook to detect mobile viewport
function useMobileViewport(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);
  
  return isMobile;
}

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
  const isMobile = useMobileViewport();

  // Initialize mermaid and set up toolbar handlers
  useMermaid();
  useMermaidToolbar();

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
    // Add wikilink autocomplete extension
    extensions: [wikilinkAutocomplete({
      searchPages: async (query, limit) => {
        const response = await fetch(`/api/vaults/work-notes/pages/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        const data = await response.json();
        return data.results || [];
      },
      debounceMs: 150,
      minChars: 1,
      maxResults: 10,
    })],
  }), [t]);

  // Toolbar state
  const [openMenu, setOpenMenu] = useState('');
  const [pendingForm, setPendingForm] = useState(null);
  const [wikilinkPicker, setWikilinkPicker] = useState({ open: false, query: '', selectedPath: null });
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
    if (key === 'wikilink') {
      // Open wikilink picker instead of showing form
      openWikilinkPicker();
      return;
    }
    if (editorRef.current?.view) {
      applyCommandToView(editorRef.current.view, key, values);
    }
    setPendingForm(null);
    setOpenMenu('');
  }

  // Wikilink picker handlers
  const openWikilinkPicker = useCallback(() => {
    setWikilinkPicker({ open: true, query: '', selectedPath: null });
  }, []);

  const closeWikilinkPicker = useCallback(() => {
    setWikilinkPicker({ open: false, query: '', selectedPath: null });
  }, []);

  const handleWikilinkSelect = useCallback((path, alias) => {
    if (editorRef.current?.view) {
      const aliasPart = alias ? `|${alias}` : '';
      applyCommandToView(editorRef.current.view, 'wikilink', { target: path, alias });
    }
    closeWikilinkPicker();
  }, []);

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
        <div className="editor-toolbar" aria-label={t('editorToolbar')} data-mobile={isMobile}>
          <button
            type="button"
            className="icon-text-button"
            onClick={handleSave}
            disabled={saveDisabled || !dirty}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <Save size={16} aria-hidden="true" />
            {!isMobile && <span>{t('save')}</span>}
          </button>
          <span className={`editor-lock-status editor-lock-${lockStatus}`} role="status" aria-live="polite" style={{ minHeight: '44px', padding: '10px 12px' }}>
            {t(lockStatusKey(lockStatus))}
          </span>
          <div className="toolbar-groups" style={{ display: 'flex', flex: 1, gap: isMobile ? '4px' : '6px', minWidth: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {toolbarConfig.groups.map((group) => (
              <ToolbarMenu
                key={group.name}
                name={group.name}
                icon={getGroupIcon(group.name)}
                label={isMobile ? '' : group.label}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                form={menuForm(group.name)}
                isMobile={isMobile}
              >
                {group.commands.map((cmd) => (
                  <CommandButton
                    key={cmd.id}
                    command={cmd}
                    icon={getCommandIcon(cmd.id)}
                    label={isMobile ? '' : cmd.label}
                    onRun={runCommand}
                    onOpenForm={setPendingForm}
                    isMobile={isMobile}
                  />
                ))}
              </ToolbarMenu>
            ))}
          </div>
        </div>
      ) : null}
      <LibraryMarkdownEditor
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        variant={variant}
        livePreviewConfig={livePreviewConfig}
        minHeight="520px"
        ariaLabel={t('markdownEditor')}
        toolbarConfig={toolbarConfig}
      />
      {wikilinkPicker.open && (
        <WikilinkPicker
          query={wikilinkPicker.query}
          onQueryChange={setWikilinkPicker}
          onSelect={handleWikilinkSelect}
          onClose={closeWikilinkPicker}
        />
      )}
    </section>
  );
}

// Wikilink Picker Component
function WikilinkPicker({ query, onQueryChange, onSelect, onClose }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/vaults/work-notes/pages/search?q=${encodeURIComponent(query)}&limit=10`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results || []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Wikilink search failed:', err);
          setResults([]);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [query]);

  if (!query || query.length < 2) {
    return (
      <div className="wikilink-picker">
        <div className="wikilink-picker-empty">Введите минимум 2 символа для поиска</div>
      </div>
    );
  }

  return (
    <div className="wikilink-picker">
      <div className="wikilink-picker-header">
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange({ ...query, query: e.target.value })}
          placeholder="Поиск страницы..."
          autoFocus
        />
        <button type="button" onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
      </div>
      {loading && <div className="wikilink-picker-loading">Поиск...</div>}
      {!loading && results.length === 0 && (
        <div className="wikilink-picker-empty">Ничего не найдено</div>
      )}
      <div className="wikilink-picker-results">
        {results.map((result) => (
          <button
            key={result.path}
            type="button"
            className="wikilink-picker-result"
            onClick={() => onSelect(result.path, result.alias || null)}
          >
            <span className="wikilink-picker-title">{result.title}</span>
            {result.alias && <span className="wikilink-picker-alias">({result.alias})</span>}
            {result.preview && <span className="wikilink-picker-preview">{result.preview}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// Toolbar components (moved here from separate file for simplicity)
function ToolbarMenu({ name, icon, label, openMenu, setOpenMenu, form, children, isMobile }) {
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const [position, setPosition] = useState(null);
  const isOpen = openMenu === name;

  function computePosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = isMobile ? Math.min(window.innerWidth - 32, 300) : Math.min(300, Math.max(220, window.innerWidth - 32));
    const left = isMobile ? 16 : Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
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
      <button 
        type="button" 
        className="secondary-button" 
        aria-haspopup="menu" 
        aria-expanded={isOpen} 
        onClick={handleToggle}
        style={{ 
          minHeight: '44px', 
          minWidth: '44px',
          padding: isMobile ? '8px' : '6px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label={label}
      >
        {icon}
        {!isMobile && <span>{label}</span>}
      </button>
      {popover}
    </div>
  );
}

function CommandButton({ command, icon, label, onRun, onOpenForm, isMobile }) {
  const hasForm = command?.params?.some?.((param) => param.type !== 'static');
  return (
    <button 
      type="button" 
      className="toolbar-command" 
      title={label} 
      onClick={hasForm ? () => onOpenForm(command.id) : () => onRun(command.id)}
      style={{ 
        minHeight: '44px', 
        minWidth: '44px',
        padding: isMobile ? '10px' : '6px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label={label}
    >
      {icon}
      {!isMobile && <span>{label}</span>}
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
  const isMobile = window.innerWidth < 768;
  return (
    <form className="toolbar-form" onSubmit={handleSubmit} style={{ minWidth: isMobile ? 'calc(100vw - 32px)' : '220px' }}>
      {fields.map((field) => (
        <label key={field.name} className="toolbar-form-field" style={{ gap: isMobile ? '8px' : '4px' }}>
          <span style={{ fontSize: isMobile ? '14px' : '12px' }}>{t(MDOCK_PARAM_LABEL_KEYS[field.name] || field.name)}</span>
          {field.type === 'select' ? (
            <select 
              value={values[field.name]} 
              onChange={(event) => setValue(field.name, event.target.value)}
              style={{ 
                padding: isMobile ? '12px 16px' : '6px 8px',
                fontSize: isMobile ? '16px' : '13px', // 16px prevents zoom on iOS
                minHeight: isMobile ? '44px' : 'auto',
              }}
            >
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
              style={{ 
                padding: isMobile ? '12px 16px' : '6px 8px',
                fontSize: isMobile ? '16px' : '13px', // 16px prevents zoom on iOS
                minHeight: isMobile ? '44px' : 'auto',
              }}
            />
          )}
        </label>
      ))}
      <div className="toolbar-form-actions" style={{ gap: isMobile ? '8px' : '6px', paddingTop: isMobile ? '8px' : 0 }}>
        <button type="submit" className="secondary-button" style={{ minHeight: isMobile ? '44px' : 'auto', padding: isMobile ? '10px 16px' : undefined }}>{t('toolbarApply')}</button>
        <button type="button" className="secondary-button" onClick={onClose} style={{ minHeight: isMobile ? '44px' : 'auto', padding: isMobile ? '10px 16px' : undefined }}>{t('cancel')}</button>
      </div>
    </form>
  );
}