import { ChevronDown, ChevronLeft, ChevronRight, Code2, FileInput, FilePlus2, FileText, Folder, FolderInput, FolderOpen, FolderPlus, PanelLeftClose, PanelLeftOpen, Rows2, Save, Trash2 } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { createDirectory, createFile, deletePath, listFiles, movePath, readFileContent } from '../../api/files.js';
import { StatusMessage } from '../../components/ui/StatusMessage.jsx';
import { createFileEditorSession } from '../editor/fileEditorSession.js';
import { useLanguage } from '../i18n/LanguageProvider.jsx';
import { MarkdownPreview } from './MarkdownPreview.jsx';

const loadMarkdownEditor = () => import('../editor/MarkdownEditor.jsx').then((module) => ({ default: module.MarkdownEditor }));
const MarkdownEditor = lazy(loadMarkdownEditor);

export function VaultFilesPanel({ slug, defaultFileRoot = 'Obsidian Vault' }) {
  const { language, t } = useLanguage();
  const defaultRoot = useMemo(() => normalizeDirectoryPath(defaultFileRoot), [defaultFileRoot]);
  const [path, setPath] = useState('.');
  const [treeEntries, setTreeEntries] = useState({});
  const [expandedPaths, setExpandedPaths] = useState(() => new Set(['.']));
  const [loadingPaths, setLoadingPaths] = useState(() => new Set());
  const [defaultRootMissing, setDefaultRootMissing] = useState(false);
  const [draggedEntry, setDraggedEntry] = useState(null);
  const [dropTargetPath, setDropTargetPath] = useState('');
  const [pendingMoveEntry, setPendingMoveEntry] = useState(null);
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
    function handlePageHide(event) {
      if (event.persisted) return;
      sessionRef.current?.releaseForPageHide();
    }
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
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
    const restoredExpanded = readExpandedPaths(slug);
    const initialExpanded = new Set(restoredExpanded);
    if (defaultRoot !== '.') {
      initialExpanded.add(defaultRoot);
    }
    setPath(defaultRoot);
    setSelectedFile(null);
    setContent('');
    setSavedContent('');
    setEditing(false);
    setDefaultRootMissing(false);
    closeEditorSession();
    setExpandedPaths(initialExpanded);
    setTreeEntries({});
    async function loadInitialFiles() {
      try {
        try {
          const payload = await listFiles(slug, defaultRoot);
          if (!active) return;
          setTreeEntries({ [defaultRoot]: sortEntries(payload.entries || [], language) });
        } catch (error) {
          if (!active) return;
          if (defaultRoot === '.') {
            throw error;
          }
          setTreeEntries({ [defaultRoot]: [] });
          setDefaultRootMissing(true);
          setMessage(t('defaultFileRootMissing').replace('{path}', defaultRoot));
        }

        if (!active) return;
        const childPaths = [...initialExpanded].filter((entryPath) => entryPath !== '.' && entryPath !== defaultRoot);
        const loadedChildren = await Promise.all(childPaths.map(async (entryPath) => {
          try {
            const childPayload = await listFiles(slug, entryPath);
            return [entryPath, sortEntries(childPayload.entries || [], language)];
          } catch {
            return [entryPath, null];
          }
        }));
        if (active && loadedChildren.length) {
          setTreeEntries((current) => {
            const next = { ...current };
            for (const [entryPath, childEntries] of loadedChildren) {
              if (childEntries) next[entryPath] = childEntries;
            }
            return next;
          });
        }

        const filePath = filePathFromLocation();
        if (!active || !filePath) return;
        await openFilePath(filePath, { syncURL: false });
      } catch {
        if (!active) return;
        setMessage(t('fileLoadFailed'));
      }
    }
    loadInitialFiles();
    return () => {
      active = false;
    };
  }, [slug, t, language, defaultRoot]);

  useEffect(() => {
    writeExpandedPaths(slug, expandedPaths);
  }, [slug, expandedPaths]);

  async function loadDirectory(directoryPath, { force = false } = {}) {
    if (!force && treeEntries[directoryPath]) return;
    setLoadingPaths((current) => new Set(current).add(directoryPath));
    try {
      const payload = await listFiles(slug, directoryPath);
      setTreeEntries((current) => ({
        ...current,
        [directoryPath]: sortEntries(payload.entries || [], language)
      }));
      if (directoryPath === defaultRoot) {
        setDefaultRootMissing(false);
      }
    } finally {
      setLoadingPaths((current) => {
        const next = new Set(current);
        next.delete(directoryPath);
        return next;
      });
    }
  }

  useEffect(() => {
    function handlePopState() {
      setViewMode(viewModeFromLocation());
      const filePath = filePathFromLocation();
      if (!filePath) {
        closeEditorSession();
        setSelectedFile(null);
        setContent('');
        setSavedContent('');
        setEditing(false);
        return;
      }
      openFilePath(filePath, { syncURL: false });
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

  async function openFile(entry, { syncURL = true } = {}) {
    if (selectedFile?.path !== entry.path && content !== savedContent && !window.confirm(t('confirmDiscardEdits'))) {
      return;
    }
    await closeEditorSession();
    setEditing(false);
    if (syncURL) {
      updateSearchParams({ file: entry.path, section: 'editor' });
    }
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

  async function openFilePath(filePath, { syncURL = true } = {}) {
    const normalizedPath = normalizeFilePath(filePath);
    if (!normalizedPath) return;
    const parentDirectories = parentDirectoriesFor(normalizedPath);
    const expandedParents = parentDirectories.filter((entryPath) => entryPath !== '.');
    if (expandedParents.length) {
      setExpandedPaths((current) => new Set([...current, ...expandedParents]));
    }

    let finalEntries = [];
    for (const directoryPath of parentDirectories) {
      try {
        const payload = await listFiles(slug, directoryPath);
        const entries = sortEntries(payload.entries || [], language);
        setTreeEntries((current) => ({ ...current, [directoryPath]: entries }));
        finalEntries = entries;
      } catch {
        setMessage(t('fileLoadFailed'));
        return;
      }
    }

    const entryName = normalizedPath.split('/').pop();
    const entry = finalEntries.find((item) => !item.is_dir && item.name === entryName && item.path === normalizedPath);
    if (!entry) {
      setMessage(t('fileLoadFailed'));
      return;
    }
    await openFile(entry, { syncURL });
  }

  function handleFileLinkClick(event, entry) {
    if (shouldUseNativeNavigation(event)) return;
    event.preventDefault();
    openFile(entry);
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

  const treeRootPath = useMemo(() => {
    if (defaultRoot === '.') return '.';
    if (path === '.' || !isPathInside(path, defaultRoot)) return '.';
    return defaultRoot;
  }, [defaultRoot, path]);
  const currentDirectoryAvailable = !(defaultRootMissing && path === defaultRoot);

  function handleViewMode(nextMode) {
    setViewMode(nextMode);
    updateSearchParams({ view: nextMode });
  }

  async function handleCreateFile(basePath = path) {
    const input = window.prompt(t('newFilePrompt'));
    if (!input) return;
    const name = ensureMarkdownExtension(input.trim());
    if (!name) return;
    try {
      const nextPath = joinPath(basePath, name);
      await createFile(slug, nextPath, '');
      setPath(basePath || '.');
      if (basePath && basePath !== '.') {
        setExpandedPaths((current) => new Set(current).add(basePath));
      }
      await loadDirectory(basePath || '.', { force: true });
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
      setPath(basePath || '.');
      if (basePath && basePath !== '.') {
        setExpandedPaths((current) => new Set(current).add(basePath));
      }
      await loadDirectory(basePath || '.', { force: true });
      setMessage(t('folderCreated'));
    } catch {
      setMessage(t('folderCreateFailed'));
    }
  }

  async function handleOpenDirectory(directoryPath) {
    setPath(directoryPath || '.');
    if (directoryPath && directoryPath !== '.') {
      setExpandedPaths((current) => new Set(current).add(directoryPath));
    }
    try {
      await loadDirectory(directoryPath || '.', { force: true });
      setMessage('');
    } catch {
      setMessage(t('fileLoadFailed'));
    }
  }

  async function handleCreateDefaultRoot() {
    if (defaultRoot === '.') return;
    try {
      await createDirectory(slug, defaultRoot);
      setDefaultRootMissing(false);
      setPath(defaultRoot);
      setExpandedPaths((current) => new Set(current).add(defaultRoot));
      await loadDirectory(defaultRoot, { force: true });
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
        updateSearchParams({ file: null });
      }
      const parentDirectory = parentPathFor(entry.path);
      setTreeEntries((current) => {
        const next = { ...current };
        delete next[entry.path];
        for (const entryPath of Object.keys(next)) {
          if (entryPath.startsWith(`${entry.path}/`)) {
            delete next[entryPath];
          }
        }
        return next;
      });
      setExpandedPaths((current) => {
        const next = new Set();
        for (const entryPath of current) {
          if (entryPath !== entry.path && !entryPath.startsWith(`${entry.path}/`)) {
            next.add(entryPath);
          }
        }
        return next;
      });
      await loadDirectory(parentDirectory, { force: true });
      setMessage(entry.is_dir ? t('folderDeleted') : t('fileDeleted'));
    } catch {
      setMessage(t('deleteFailed'));
    }
  }

  async function handleMoveEntry(entry, targetDirectory) {
    const targetPath = joinPath(targetDirectory, entry.name);
    if (entry.path === targetPath) {
      setMessage(t('moveNoop'));
      return;
    }
    if (entry.is_dir && (targetDirectory === entry.path || targetDirectory.startsWith(`${entry.path}/`))) {
      setMessage(t('moveForbidden'));
      return;
    }
    const sourceDirectory = parentPathFor(entry.path);
    try {
      await movePath(slug, entry.path, targetPath);
      const directoriesToReload = new Set([sourceDirectory, targetDirectory || '.']);
      for (const directoryPath of directoriesToReload) {
        await loadDirectory(directoryPath || '.', { force: true });
      }
      if (entry.is_dir) {
        moveCachedDirectory(entry.path, targetPath);
        setExpandedPaths((current) => {
          const next = new Set();
          for (const expandedPath of current) {
            if (expandedPath === entry.path) {
              next.add(targetPath);
            } else if (expandedPath.startsWith(`${entry.path}/`)) {
              next.add(`${targetPath}${expandedPath.slice(entry.path.length)}`);
            } else {
              next.add(expandedPath);
            }
          }
          return next;
        });
      }
      if (selectedFile?.path === entry.path || selectedFile?.path.startsWith(`${entry.path}/`)) {
        const nextSelectedPath = selectedFile.path === entry.path
          ? targetPath
          : `${targetPath}${selectedFile.path.slice(entry.path.length)}`;
        setSelectedFile((current) => current ? { ...current, path: nextSelectedPath } : current);
        if (sessionRef.current) {
          await closeEditorSession();
          setEditing(false);
        }
        updateSearchParams({ file: nextSelectedPath });
      }
      setPath(targetDirectory || '.');
      if (targetDirectory && targetDirectory !== '.') {
        setExpandedPaths((current) => new Set(current).add(targetDirectory));
      }
      setPendingMoveEntry(null);
      setMessage(t('moveDone'));
    } catch {
      setMessage(t('moveFailed'));
    }
  }

  function moveCachedDirectory(fromPath, toPath) {
    setTreeEntries((current) => {
      const next = { ...current };
      for (const directoryPath of Object.keys(current)) {
        if (directoryPath === fromPath || directoryPath.startsWith(`${fromPath}/`)) {
          const movedPath = directoryPath === fromPath ? toPath : `${toPath}${directoryPath.slice(fromPath.length)}`;
          next[movedPath] = current[directoryPath].map((entry) => moveEntryPath(entry, fromPath, toPath));
          delete next[directoryPath];
        }
      }
      return next;
    });
  }

  function handleDragStart(event, entry) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', entry.path);
    setDraggedEntry(entry);
    setPendingMoveEntry(null);
  }

  function handleDragEnd() {
    setDraggedEntry(null);
    setDropTargetPath('');
  }

  function handleDragOver(event, targetDirectory) {
    if (!draggedEntry || !canMoveToDirectory(draggedEntry, targetDirectory)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetPath(targetDirectory || '.');
  }

  function handleDragLeave(event, targetDirectory) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setDropTargetPath((current) => current === (targetDirectory || '.') ? '' : current);
    }
  }

  async function handleDrop(event, targetDirectory) {
    if (!draggedEntry || !canMoveToDirectory(draggedEntry, targetDirectory)) return;
    event.preventDefault();
    setDropTargetPath('');
    const entry = draggedEntry;
    setDraggedEntry(null);
    await handleMoveEntry(entry, targetDirectory || '.');
  }

  function canMoveToDirectory(entry, targetDirectory) {
    const target = targetDirectory || '.';
    const targetPath = joinPath(target, entry.name);
    if (entry.path === targetPath) return false;
    if (entry.is_dir && (target === entry.path || target.startsWith(`${entry.path}/`))) return false;
    return true;
  }

  async function toggleDirectory(entry) {
    setPath(entry.path);
    if (expandedPaths.has(entry.path)) {
      setExpandedPaths((current) => {
        const next = new Set(current);
        next.delete(entry.path);
        return next;
      });
      return;
    }
    setExpandedPaths((current) => new Set(current).add(entry.path));
    try {
      await loadDirectory(entry.path);
    } catch {
      setMessage(t('fileLoadFailed'));
    }
  }

  function renderTreeEntries(directoryPath, level = 0) {
    const entries = treeEntries[directoryPath] || [];
    if (!entries.length && (directoryPath === '.' || directoryPath === defaultRoot)) {
      return <p className="muted">{t('noFiles')}</p>;
    }
    return entries.map((entry) => {
      const expanded = expandedPaths.has(entry.path);
      const loading = loadingPaths.has(entry.path);
      const childrenLoaded = Boolean(treeEntries[entry.path]);
      const children = treeEntries[entry.path] || [];
      const canDropHere = draggedEntry && entry.is_dir && canMoveToDirectory(draggedEntry, entry.path);
      const canMoveHere = pendingMoveEntry && entry.is_dir && canMoveToDirectory(pendingMoveEntry, entry.path);
      return (
        <div key={entry.path} className="file-tree-node">
          <div
            className={`file-row ${selectedFile?.path === entry.path ? 'active' : ''} ${dropTargetPath === entry.path ? 'drop-target' : ''} ${draggedEntry?.path === entry.path ? 'dragging' : ''}`}
            draggable
            onDragStart={(event) => handleDragStart(event, entry)}
            onDragEnd={handleDragEnd}
            onDragOver={entry.is_dir ? (event) => handleDragOver(event, entry.path) : undefined}
            onDragLeave={entry.is_dir ? (event) => handleDragLeave(event, entry.path) : undefined}
            onDrop={entry.is_dir ? (event) => handleDrop(event, entry.path) : undefined}
            style={{ '--tree-level': level }}
          >
            {entry.is_dir ? (
              <button
                type="button"
                className="file-disclosure-button"
                onClick={() => toggleDirectory(entry)}
                aria-label={expanded ? `${t('collapseFolder')}: ${entry.name}` : `${t('expandFolder')}: ${entry.name}`}
                title={entry.name}
              >
                {expanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
              </button>
            ) : <span className="file-disclosure-spacer" aria-hidden="true" />}
            {entry.is_dir ? (
              <button type="button" className="file-row-open" aria-label={entry.name} onClick={() => toggleDirectory(entry)}>
                {expanded ? <FolderOpen size={18} aria-hidden="true" /> : <Folder size={18} aria-hidden="true" />}
                <span className="file-row-main">
                  <strong>{entry.name}</strong>
                  <small>{loading ? t('loading') : t('folder')}</small>
                </span>
              </button>
            ) : (
              <a className="file-row-open" href={fileHref(slug, entry.path, viewMode)} aria-label={entry.name} onClick={(event) => handleFileLinkClick(event, entry)}>
                <FileText size={18} aria-hidden="true" />
                <span className="file-row-main">
                  <strong>{entry.name}</strong>
                  <small>{`${formatBytes(entry.size, language)} · ${formatDate(entry.mod_time, language)}`}</small>
                </span>
              </a>
            )}
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
                  {canMoveHere ? (
                    <button type="button" className="icon-button" onClick={() => handleMoveEntry(pendingMoveEntry, entry.path)} title={`${t('moveHere')}: ${entry.name}`}>
                      <FolderInput size={15} aria-hidden="true" />
                      <span className="sr-only">{t('moveHere')}: {entry.name}</span>
                    </button>
                  ) : null}
                </>
              ) : null}
              <button type="button" className="icon-button" onClick={() => setPendingMoveEntry(entry)} title={t('moveEntry')}>
                <FileInput size={15} aria-hidden="true" />
                <span className="sr-only">{t('moveEntry')}: {entry.name}</span>
              </button>
              <button type="button" className="icon-button danger-icon-button" onClick={() => handleDeleteEntry(entry)} title={`${entry.is_dir ? t('deleteFolder') : t('deleteFile')}: ${entry.name}`}>
                <Trash2 size={15} aria-hidden="true" />
                <span className="sr-only">{entry.is_dir ? t('deleteFolder') : t('deleteFile')}: {entry.name}</span>
              </button>
            </span>
          </div>
          {canDropHere ? <span className="sr-only">{t('dropAllowed')}</span> : null}
          {entry.is_dir && expanded ? (
            <div className="file-tree-children">
              {loading && !childrenLoaded ? <p className="muted file-tree-loading">{t('loading')}</p> : renderTreeEntries(entry.path, level + 1)}
              {!loading && childrenLoaded && !children.length ? <p className="muted file-tree-loading">{t('noFiles')}</p> : null}
            </div>
          ) : null}
        </div>
      );
    });
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
          <div
            className={`file-pathbar ${dropTargetPath === (path || '.') ? 'drop-target' : ''}`}
            onDragOver={(event) => handleDragOver(event, path || '.')}
            onDragLeave={(event) => handleDragLeave(event, path || '.')}
            onDrop={(event) => handleDrop(event, path || '.')}
          >
            <button type="button" className="icon-button" onClick={() => handleOpenDirectory(parentPath)} disabled={path === '.'}>
              <ChevronLeft size={16} aria-hidden="true" />
              <span className="sr-only">{t('parentFolder')}</span>
            </button>
            <span className="file-pathbar-current">{path === '.' ? '/' : path}</span>
            {defaultRoot !== '.' ? (
              <>
                <button type="button" className="icon-button pathbar-nav-button" onClick={() => handleOpenDirectory(defaultRoot)} title={t('defaultFileRootOpen')}>
                  <FolderOpen size={16} aria-hidden="true" />
                  <span className="sr-only">{t('defaultFileRootOpen')}</span>
                </button>
                <button type="button" className="icon-button pathbar-nav-button" onClick={() => handleOpenDirectory('.')} title={t('openRootFolder')}>
                  <Folder size={16} aria-hidden="true" />
                  <span className="sr-only">{t('openRootFolder')}</span>
                </button>
              </>
            ) : null}
            {defaultRootMissing ? (
              <button type="button" className="icon-button pathbar-nav-button" onClick={handleCreateDefaultRoot} title={t('createDefaultFileRoot')}>
                <FolderPlus size={16} aria-hidden="true" />
                <span className="sr-only">{t('createDefaultFileRoot')}</span>
              </button>
            ) : null}
            <button type="button" className="icon-button" onClick={() => handleCreateFile(path)} disabled={!currentDirectoryAvailable} title={t('createFile')}>
              <FilePlus2 size={16} aria-hidden="true" />
              <span className="sr-only">{t('createFile')}</span>
            </button>
            <button type="button" className="icon-button" onClick={() => handleCreateDirectory(path)} disabled={!currentDirectoryAvailable} title={t('createFolder')}>
              <FolderPlus size={16} aria-hidden="true" />
              <span className="sr-only">{t('createFolder')}</span>
            </button>
            {pendingMoveEntry && canMoveToDirectory(pendingMoveEntry, path || '.') ? (
              <button type="button" className="icon-button" onClick={() => handleMoveEntry(pendingMoveEntry, path || '.')} title={`${t('moveHere')}: ${path === '.' ? '/' : path}`}>
                <FolderInput size={16} aria-hidden="true" />
                <span className="sr-only">{t('moveHere')}: {path === '.' ? '/' : path}</span>
              </button>
            ) : null}
          </div>
          {pendingMoveEntry ? (
            <div className="pending-move-bar" role="status">
              <span>{t('movingEntry')}: {pendingMoveEntry.name}</span>
              <button type="button" className="secondary-button" onClick={() => setPendingMoveEntry(null)}>{t('cancel')}</button>
            </div>
          ) : null}
          <div className="file-list">
            {renderTreeEntries(treeRootPath)}
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

function normalizeDirectoryPath(value) {
  const normalized = String(value || 'Obsidian Vault').trim().split('/').filter(Boolean).join('/');
  if (!normalized || normalized === '.') return '.';
  return normalized;
}

function isPathInside(entryPath, directoryPath) {
  if (directoryPath === '.') return true;
  return entryPath === directoryPath || entryPath.startsWith(`${directoryPath}/`);
}

function parentPathFor(entryPath) {
  const parts = entryPath.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? parts.join('/') : '.';
}

function parentDirectoriesFor(entryPath) {
  const parts = entryPath.split('/').filter(Boolean);
  const directories = ['.'];
  for (let index = 1; index < parts.length; index += 1) {
    directories.push(parts.slice(0, index).join('/'));
  }
  return directories;
}

function moveEntryPath(entry, fromPath, toPath) {
  if (entry.path === fromPath) {
    return { ...entry, path: toPath, name: toPath.split('/').filter(Boolean).pop() || entry.name };
  }
  if (entry.path.startsWith(`${fromPath}/`)) {
    return { ...entry, path: `${toPath}${entry.path.slice(fromPath.length)}` };
  }
  return entry;
}

function readExpandedPaths(slug) {
  try {
    const raw = window.localStorage.getItem(expandedPathsStorageKey(slug));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(['.', ...parsed.filter((entryPath) => typeof entryPath === 'string' && entryPath)]);
  } catch {
    return new Set(['.']);
  }
}

function writeExpandedPaths(slug, expandedPaths) {
  try {
    const paths = [...expandedPaths].filter((entryPath) => entryPath !== '.');
    window.localStorage.setItem(expandedPathsStorageKey(slug), JSON.stringify(paths));
  } catch {
    // localStorage can be unavailable in private contexts; tree state is still usable in memory.
  }
}

function expandedPathsStorageKey(slug) {
  return `mdock:${slug}:expanded-file-tree`;
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

function filePathFromLocation() {
  return normalizeFilePath(new URLSearchParams(window.location.search).get('file') || '');
}

function normalizeFilePath(value) {
  return String(value || '').split('/').filter(Boolean).join('/');
}

function fileHref(slug, filePath, viewMode) {
  const params = new URLSearchParams(window.location.search);
  params.set('page', 'vault');
  params.set('slug', slug);
  params.set('section', 'editor');
  params.set('file', filePath);
  params.set('view', viewMode);
  return `/?${params.toString()}`;
}

function updateSearchParams(values) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  }
  window.history.pushState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
}

function shouldUseNativeNavigation(event) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

function localeForLanguage(language) {
  return language === 'en' ? 'en-US' : 'ru-RU';
}
