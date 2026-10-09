/**
 * Utility functions for markdown editor
 */

export function lockStatusKey(status) {
  if (status === 'locked') return 'editorLocked';
  if (status === 'locking') return 'editorLocking';
  if (status === 'lost') return 'editorLockLost';
  if (status === 'saving') return 'editorSaving';
  return 'editorReadonly';
}