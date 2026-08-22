import { ChevronLeft, Code2, FilePlus2, FileText, Folder, FolderOpen, FolderPlus, PanelLeftClose, PanelLeftOpen, Rows2, Save, Trash2 } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { createDirectory, createFile, deletePath, listFiles, readFileContent } from '../../api/files.js';
import { StatusMessage } from '../../components/ui/StatusMessage.jsx';
import { createFileEditorSession } from '../editor/fileEditorSession.js';
import { useLanguage } from '../i18n/LanguageProvider.jsx';
import { MarkdownPreview } from './MarkdownPreview.jsx';

const loadMarkdownEditor = () => import('../editor/MarkdownEditor.jsx').then((module) => ({ default: module.MarkdownEditor }));
const MarkdownEditor = lazy(loadMarkdownEditor);

export function VaultFilesPanel({ slug }) {
  const { language, t } = useLanguage();
  const [path, setPath] = useState('.');
  const [entries, setEntries] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [lockStatus, setLockStatus] = useState('idle');
  const [viewMode, setViewMode] = useState(() => viewModeFromLocation());
  const [filesCollapsed, setFilesCollapsed] = useState(false);
  const sessionRef = useRef(null);

  useEffect(() => () => {
    sessionRef.current?.close();
  }, []);

  useEffect(() => {
    if (selectedFile && isMarkdown(selectedFile.name)) {
      loadMarkdownEditor();
    }
  }, [selectedFile]);

  useEffect(() => {
    if (content === savedContent) return undefined;
    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = '';
      return '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [content, savedContent]);

  useEffect(() => {
    let active = true;
    setMessage('');
    listFiles(slug, path)
      .then((payload) => {
        if (!active) return;
        setEntries(sortEntries(payload.entries || [], language));
      })
      .catch(() => {
        if (!active) return;
        setMessage(t('fileLoadFailed'));
      });
    return () => {
      active = false;
    };
  }, [slug, path, t, language]);

  async function loadEntries() {
    const payload = await listFiles(slug, path);
    setEntries(sortEntries(payload.entries || [], language));
  }

  useEffect(() => {
    function handlePopState() {
      setViewMode(viewModeFromLocation());
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  async function closeEditorSession() {
    const session = sessionRef.current;
    sessionRef.current = null;
    await session?.close();
    setLockStatus('idle');
  }

  async function openFile(entry) {
    await closeEditorSession();
    setEditing(false);
    if (!isMarkdown(entry.name)) {
      setSelectedFile(entry);
      setContent('');
      setSavedContent('');
      return;
    }
    setSelectedFile(entry);
    setMessage('');
    setLockStatus('idle');
    try {
      const payload = await readFileContent(slug, entry.path);
      setContent(payload.content || '');
      setSavedContent(payload.content || '');
    } catch {
      setContent('');
      setSavedContent('');
      setMessage(t('fileLoadFailed'));
    }
  }

  async function enableEditing() {
    if (!selectedFile || !isMarkdown(selectedFile.name) || sessionRef.current) return;
    const session = createFileEditorSession({
      slug,
      path: selectedFile.path,
      onHeartbeatError: () => {
        setLockStatus('lost');
        setMessage(t('editorLockLost'));
      }
    });
    sessionRef.current = session;
    setLockStatus('locking');
    setMessage(t('editorLocking'));
    try {
      const payload = await session.open();
      setContent(payload.content || '');
      setSavedContent(payload.content || '');
      setEditing(true);
      setLockStatus('locked');
      setMessage('');
    } catch {
      sessionRef.current = null;
      setEditing(false);
      setLockStatus('idle');
      setMessage(t('lockedByOther'));
    }
  }

  async function disableEditing() {
    if (content !== savedContent && !window.confirm(t('confirmDiscardEdits'))) {
      return;
    }
    setContent(savedContent);
    setEditing(false);
    await closeEditorSession();
  }

  async function handleEditToggle(event) {
    if (event.target.checked) {
      await enableEditing();
    } else {
      await disableEditing();
    }
  }

  async function saveSelectedFile() {
    if (!selectedFile || !sessionRef.current) return;
    setLockStatus('saving');
    setMessage(t('editorSaving'));
    try {
      await sessionRef.current.save(content);
      setSavedContent(content);
      setLockStatus('locked');
      setMessage(t('editorSaved'));
    } catch (error) {
      if (error.status === 423) {
        setLockStatus('lost');
        setMessage(t('lockedByOther'));
        return;
      }
      if (error.status === 409) {
        setLockStatus('lost');
        setMessage(t('editorLockLost'));
        return;
      }
      setLockStatus('locked');
      setMessage(t('saveFailed'));
    }
  }

  const parentPath = useMemo(() => {
    if (path === '.' || path === '') return '.';
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return parts.length ? parts.join('/') : '.';
  }, [path]);

  function handleViewMode(nextMode) {
    setViewMode(nextMode);
    updateSearchParam('view', nextMode);
  }

  async function handleCreateFile(basePath = path) {
    const input = window.prompt(t('newFilePrompt'));
    if (!input) return;
    const name = ensureMarkdownExtension(input.trim());
    if (!name) return;
    try {
      const nextPath = joinPath(basePath, name);
      await createFile(slug, nextPath, '');
      if (basePath !== path) {
        setPath(basePath);
      } else {
        await loadEntries();
      }
      setMessage(t('fileCreated'));
    } catch {
      setMessage(t('fileCreateFailed'));
    }
  }

  async function handleCreateDirectory(basePath = path) {
    const name = window.prompt(t('newFolderPrompt'))?.trim();
    if (!name) return;
    try {
      await createDirectory(slug, joinPath(basePath, name));
      if (basePath !== path) {
        setPath(basePath);
      } else {
        await loadEntries();
      }
      setMessage(t('folderCreated'));
    } catch {
      setMessage(t('folderCreateFailed'));
    }
  }

  async function handleDeleteEntry(entry) {
    const message = entry.is_dir ? t('confirmDeleteFolder') : t('confirmDeleteFile');
    if (!window.confirm(message.replace('{name}', entry.name))) return;
    try {
      await deletePath(slug, entry.path);
      if (selectedFile && (selectedFile.path === entry.path || selectedFile.path.startsWith(`${entry.path}/`))) {
        await closeEditorSession();
        setSelectedFile(null);
        setContent('');
        setSavedContent('');
        setEditing(false);
      }
      await loadEntries();
      setMessage(entry.is_dir ? t('folderDeleted') : t('fileDeleted'));
    } catch {
      setMessage(t('deleteFailed'));
    }
  }

  return (
    <section className="vault-workspace">
      <div className="workspace-header">
        <div className="panel-title">
          <FolderOpen size={18} aria-hidden="true" />
          <span className="sr-only">{t('filesWorkspace')}</span>
        </div>
        <div className="workspace-actions">
          <button type="button" className="icon-text-button" onClick={() => setFilesCollapsed((value) => !value)}>
            {filesCollapsed ? <PanelLeftOpen size={16} aria-hidden="true" /> : <PanelLeftClose size={16} aria-hidden="true" />}
            {filesCollapsed ? t('showFiles') : t('hideFiles')}
          </button>
          <label className="edit-mode-toggle">
            <input type="checkbox" checked={editing} disabled={!selectedFile || !isMarkdown(selectedFile.name)} onChange={handleEditToggle} />
            <span>{t('editMode')}</span>
          </label>
          <button type="button" className="icon-text-button workspace-save-button" disabled={!editing || lockStatus !== 'locked' || content === savedContent} onClick={saveSelectedFile}>
            <Save size={16} aria-hidden="true" />
            {t('save')}
          </button>
          <div className="view-mode-switch" role="tablist" aria-label={t('preview')}>
            <button type="button" role="tab" aria-selected={viewMode === 'rendered'} className={viewMode === 'rendered' ? 'active' : ''} onClick={() => handleViewMode('rendered')}>
              <FileText size={16} aria-hidden="true" />
              {t('rendered')}
            </button>
            <button type="button" role="tab" aria-selected={viewMode === 'plain'} className={viewMode === 'plain' ? 'active' : ''} onClick={() => handleViewMode('plain')}>
              <Code2 size={16} aria-hidden="true" />
              {t('plain')}
            </button>
            <button type="button" role="tab" aria-selected={viewMode === 'split'} className={viewMode === 'split' ? 'active' : ''} onClick={() => handleViewMode('split')}>
              <Rows2 size={16} aria-hidden="true" />
              {t('split')}
            </button>
          </div>
        </div>
      </div>
      <StatusMessage className="page-status">{message}</StatusMessage>
      <div className={`files-layout ${filesCollapsed ? 'files-layout-collapsed' : ''}`}>
        <section className="file-list-pane" aria-label={t('files')}>
          <div className="file-pathbar">
            <button type="button" className="icon-button" onClick={() => setPath(parentPath)} disabled={path === '.'}>
              <ChevronLeft size={16} aria-hidden="true" />
              <span className="sr-only">{t('parentFolder')}</span>
            </button>
            <span>{path === '.' ? '/' : path}</span>
            <button type="button" className="icon-button" onClick={() => handleCreateFile(path)} title={t('createFile')}>
              <FilePlus2 size={16} aria-hidden="true" />
              <span className="sr-only">{t('createFile')}</span>
            </button>
            <button type="button" className="icon-button" onClick={() => handleCreateDirectory(path)} title={t('createFolder')}>
              <FolderPlus size={16} aria-hidden="true" />
              <span className="sr-only">{t('createFolder')}</span>
            </button>
          </div>
          <div className="file-list">
            {entries.length ? entries.map((entry) => (
              <div key={entry.path} className={`file-row ${selectedFile?.path === entry.path ? 'active' : ''}`}>
                <button type="button" className="file-row-open" aria-label={entry.name} onClick={() => entry.is_dir ? setPath(entry.path) : openFile(entry)}>
                  {entry.is_dir ? <Folder size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
                  <span className="file-row-main">
                    <strong>{entry.name}</strong>
                    <small>{entry.is_dir ? t('folder') : `${formatBytes(entry.size, language)} · ${formatDate(entry.mod_time, language)}`}</small>
                  </span>
                </button>
                <span className="file-row-actions">
                  {entry.is_dir ? (
                    <>
                      <button type="button" className="icon-button" onClick={() => handleCreateFile(entry.path)} title={t('createFileInFolder')}>
                        <FilePlus2 size={15} aria-hidden="true" />
                        <span className="sr-only">{t('createFileInFolder')}</span>
                      </button>
                      <button type="button" className="icon-button" onClick={() => handleCreateDirectory(entry.path)} title={t('createFolderInFolder')}>
                        <FolderPlus size={15} aria-hidden="true" />
                        <span className="sr-only">{t('createFolderInFolder')}</span>
                      </button>
                    </>
                  ) : null}
                  <button type="button" className="icon-button danger-icon-button" onClick={() => handleDeleteEntry(entry)} title={`${entry.is_dir ? t('deleteFolder') : t('deleteFile')}: ${entry.name}`}>
                    <Trash2 size={15} aria-hidden="true" />
                    <span className="sr-only">{entry.is_dir ? t('deleteFolder') : t('deleteFile')}: {entry.name}</span>
                  </button>
                </span>
              </div>
            )) : <p className="muted">{t('noFiles')}</p>}
          </div>
        </section>
        <section className="file-preview-pane" aria-label={t('preview')}>
          {selectedFile ? (
            <dl className="file-info">
              <div><dt>{t('path')}</dt><dd>{selectedFile.path}</dd></div>
              <div><dt>{t('size')}</dt><dd>{formatBytes(selectedFile.size, language)}</dd></div>
              <div><dt>{t('modified')}</dt><dd>{formatDate(selectedFile.mod_time, language)}</dd></div>
            </dl>
          ) : null}
          <DocumentView
            content={content}
            dirty={content !== savedContent}
            editing={editing}
            lockStatus={lockStatus}
            mode={viewMode}
            selectedFile={selectedFile}
            onChange={setContent}
            onSave={saveSelectedFile}
          />
        </section>
      </div>
    </section>
  );
}

function DocumentView({ content, dirty, editing, lockStatus, mode, selectedFile, onChange, onSave }) {
  const { t } = useLanguage();
  if (!selectedFile) {
    return <p className="muted empty-preview">{t('selectFile')}</p>;
  }
  if (!isMarkdown(selectedFile.name)) {
    return <p className="muted empty-preview">{t('selectMarkdownFile')}</p>;
  }
  const editor = (
    <Suspense fallback={<EditorLoadingFallback label={t('loading')} />}>
      <MarkdownEditor value={content} dirty={dirty} lockStatus={lockStatus} readOnly={!editing} saveDisabled={lockStatus !== 'locked'} onChange={onChange} onSave={onSave} />
    </Suspense>
  );
  const liveEditor = (
    <Suspense fallback={<EditorLoadingFallback label={t('loading')} />}>
      <MarkdownEditor value={content} dirty={dirty} lockStatus={lockStatus} variant="live" saveDisabled={lockStatus !== 'locked'} onChange={onChange} onSave={onSave} />
    </Suspense>
  );
  if (mode === 'plain') {
    return editor;
  }
  if (mode === 'split') {
    return (
      <div className="split-document-view">
        <div className="document-pane" aria-label={t('source')}>
          {editor}
        </div>
        <div className="document-pane" aria-label={t('rendered')}>
          <MarkdownPreview content={content} />
        </div>
      </div>
    );
  }
  if (editing) {
    return (
      <div className="live-document-view">
        {liveEditor}
      </div>
    );
  }
  return (
    <div className="rendered-preview-view" aria-label={t('rendered')}>
      <MarkdownPreview content={content} />
    </div>
  );
}

function EditorLoadingFallback({ label }) {
  return (
    <section className="markdown-editor-shell editor-loading-shell" aria-busy="true">
      <p className="muted empty-preview">{label}</p>
    </section>
  );
}

function sortEntries(entries, language) {
  const locale = localeForLanguage(language);
  return [...entries].sort((a, b) => {
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
    return a.name.localeCompare(b.name, locale, { numeric: true, sensitivity: 'base' });
  });
}

function isMarkdown(name) {
  return /\.md(?:own)?$/i.test(name);
}

function ensureMarkdownExtension(name) {
  if (!name) return '';
  return /\.[^/.]+$/.test(name) ? name : `${name}.md`;
}

function joinPath(basePath, name) {
  if (!basePath || basePath === '.') return name;
  return `${basePath.replace(/\/+$/, '')}/${name.replace(/^\/+/, '')}`;
}

function formatBytes(size, language) {
  const locale = localeForLanguage(language);
  if (!size) return '0 B';
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  if (size < 1024) return `${formatter.format(size)} B`;
  if (size < 1024 * 1024) return `${formatter.format(size / 1024)} KB`;
  return `${formatter.format(size / 1024 / 1024)} MB`;
}

function formatDate(value, language) {
  if (!value) return '';
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function viewModeFromLocation() {
  const view = new URLSearchParams(window.location.search).get('view');
  return view === 'plain' || view === 'split' ? view : 'rendered';
}

function updateSearchParam(key, value) {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.pushState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
}

function localeForLanguage(language) {
  return language === 'en' ? 'en-US' : 'ru-RU';
}
