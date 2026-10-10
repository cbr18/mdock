/**
 * Toolbar components for mdock Markdown Editor
 * Extracted from MarkdownEditor.jsx for reuse
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

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

export function ToolbarMenu({ name, icon, label, openMenu, setOpenMenu, form, children }) {
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

export function CommandButton({ command, icon, label, onRun, onOpenForm }) {
  // The definition is now passed via toolbarConfig
  const hasForm = command?.params?.some?.((param) => param.type !== 'static');
  return (
    <button type="button" className="toolbar-command" title={label} onClick={hasForm ? () => onOpenForm(command.id) : () => onRun(command.id)}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function ToolbarForm({ command, onSubmit, onClose, t }) {
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

export const PARAM_LABEL_KEYS = {
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
  lang: 'formLanguage',
};

export function lockStatusKey(status) {
  if (status === 'locked') return 'editorLocked';
  if (status === 'locking') return 'editorLocking';
  if (status === 'lost') return 'editorLockLost';
  if (status === 'saving') return 'editorSaving';
  return 'editorReadonly';
}