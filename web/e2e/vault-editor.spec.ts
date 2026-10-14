import { test, expect } from '@playwright/test';
import { login, createVault, openVault, goToSection, enableEditing, disableEditing, saveFile, switchViewMode, createFile, createFolder, openFile, deleteFile, toggleSidebar, renameVault, archiveVault, unarchiveVault, copyWebDAVURL, setGitRemote, pushGitRemote, BASE_URL, orRole, orText, orLocator } from './helpers';

test.describe('Vault Page - Editor Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const vaultName = `Test Vault ${Date.now()}`;
    await createVault(page, vaultName);
    await openVault(page, vaultName);
    // Create default file root if needed
    const createRootBtn = page.getByRole('button', { name: 'Создать рабочую папку' });
    if (await createRootBtn.isVisible({ timeout: 2000 })) {
      await createRootBtn.click();
      await expect(page.getByRole('button', { name: 'Создать файл' })).not.toBeDisabled({ timeout: 5000 });
    }
  });

  test('should show file tree panel', async ({ page }) => {
    await expect(page.getByRole('region', { name: 'Файлы' })).toBeVisible({ timeout: 10000 });
  });

  test('should create a new file', async ({ page }) => {
    const fileName = `note-${Date.now()}.md`;
    await createFile(page, fileName);
    await expect(page.getByRole('link', { name: fileName })).toBeVisible();
  });

  test('should create a new folder', async ({ page }) => {
    const folderName = `folder-${Date.now()}`;
    await createFolder(page, folderName);
    await expect(page.getByRole('button', { name: folderName, exact: true })).toBeVisible();
  });

  test('should open file and show preview', async ({ page }) => {
    const fileName = `note-${Date.now()}.md`;
    await createFile(page, fileName);
    await openFile(page, fileName);
    await expect(page.locator('.markdown-editor-shell')).toBeVisible();
  });

  test('should switch view modes: rendered, plain, split', async ({ page }) => {
    const fileName = `note-${Date.now()}.md`;
    await createFile(page, fileName);
    await openFile(page, fileName);

    await switchViewMode(page, 'rendered');
    await expect(page.locator('.rendered-preview-view')).toBeVisible({ timeout: 10000 });

    await switchViewMode(page, 'plain');
    // Wait for editor to load (Suspense fallback then actual editor)
    await expect(page.locator('.markdown-editor-shell')).toBeVisible({ timeout: 30000 });

    await switchViewMode(page, 'split');
    await expect(page.locator('.split-document-view')).toBeVisible({ timeout: 30000 });
  });

  test('should enable and disable editing mode', async ({ page }) => {
    const fileName = `note-${Date.now()}.md`;
    await createFile(page, fileName);
    await openFile(page, fileName);

    await enableEditing(page);
    const editCheckbox = page.getByRole('checkbox', { name: 'Редактирование' });
    await expect(editCheckbox).toBeChecked();

    await disableEditing(page);
    await expect(editCheckbox).not.toBeChecked();
  });

  test('should edit and save file content', async ({ page }) => {
    const fileName = `note-${Date.now()}.md`;
    await createFile(page, fileName);
    await openFile(page, fileName);

    await enableEditing(page);
    const editor = page.locator('.cm-editor, [class*="editor"] textarea, [contenteditable="true"]').first();
    await editor.fill('# Test Content\n\nHello World');
    await saveFile(page);
    await expect(page.getByText('Сохранено')).toBeVisible({ timeout: 10000 });
  });

  test('should toggle sidebar visibility', async ({ page }) => {
    await toggleSidebar(page);
    await expect(page.locator('.files-layout-collapsed')).toBeVisible();
    await toggleSidebar(page);
    await expect(page.locator('.files-layout:not(.files-layout-collapsed)')).toBeVisible();
  });

  test('should show breadcrumb navigation', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: 'Хлебные крошки' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Хлебные крошки' }).getByRole('link', { name: 'Хранилища' })).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.getByRole('link', { name: 'Назад' }).click();
    await expect(page.getByRole('heading', { name: 'Хранилища' })).toBeVisible();
  });
});

test.describe('Vault Page - Activity Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const vaultName = `Test Vault ${Date.now()}`;
    await createVault(page, vaultName);
    await openVault(page, vaultName);
  });

  test('should show activity tab', async ({ page }) => {
    await goToSection(page, 'activity');
    await expect(page.getByRole('tab', { name: 'activity' })).toHaveAttribute('aria-selected', 'true');
  });

  test('should show commits list', async ({ page }) => {
    await goToSection(page, 'activity');
    await expect(page.locator('[class*="commit"], [class*="activity"]').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Vault Page - Settings Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const vaultName = `Test Vault ${Date.now()}`;
    await createVault(page, vaultName);
    await openVault(page, vaultName);
  });

  test('should show settings tab', async ({ page }) => {
    await goToSection(page, 'settings');
    await expect(page.getByRole('tab', { name: 'Настройки хранилища' })).toHaveAttribute('aria-selected', 'true');
  });

  test('should show vault info panel', async ({ page }) => {
    await goToSection(page, 'settings');
    await expect(page.getByRole('heading', { name: 'Хранилище' })).toBeVisible();
    await expect(page.getByText('Slug')).toBeVisible();
    await expect(page.getByText('Путь')).toBeVisible();
    await expect(page.getByText('Роль')).toBeVisible();
  });

  test('should rename vault', async ({ page }) => {
    const newName = `Renamed Vault ${Date.now()}`;
    await renameVault(page, newName);
    await expect(page.getByRole('heading', { name: newName })).toBeVisible({ timeout: 5000 });
  });

  test('should show WebDAV URL and copy button', async ({ page }) => {
    await goToSection(page, 'settings');
    await expect(page.getByRole('textbox', { name: 'WebDAV URL' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Скопировать WebDAV URL' })).toBeVisible();
  });

  test('should copy WebDAV URL', async ({ page }) => {
    await goToSection(page, 'settings');
    await copyWebDAVURL(page);
    await expect(page.getByText('Скопировано')).toBeVisible({ timeout: 5000 });
  });

  test('should show members panel', async ({ page }) => {
    await goToSection(page, 'settings');
    await expect(page.getByRole('heading', { name: 'Участники' })).toBeVisible();
  });

  test('should show git status panel', async ({ page }) => {
    await goToSection(page, 'settings');
    await expect(page.getByRole('heading', { name: 'Статус Git' })).toBeVisible();
  });

  test('should show git commits panel', async ({ page }) => {
    await goToSection(page, 'settings');
    await expect(page.getByRole('heading', { name: 'Коммиты' })).toBeVisible();
  });

  test('should show remote settings panel', async ({ page }) => {
    await goToSection(page, 'settings');
    await expect(page.getByRole('heading', { name: 'Remote' })).toBeVisible();
  });

  test('should set git remote URL', async ({ page }) => {
    await setGitRemote(page, 'git@github.com:user/repo.git');
    await expect(page.locator('input[value*="github.com"]')).toBeVisible();
  });

  test('should push to git remote', async ({ page }) => {
    await setGitRemote(page, '/tmp/test-repo.git');
    await pushGitRemote(page);
  });

  test('should archive vault', async ({ page }) => {
    await archiveVault(page);
    await page.goto(BASE_URL);
    await page.getByRole('tab', { name: 'Архив' }).click();
    await expect(page.getByRole('tab', { name: 'Архив' })).toHaveAttribute('aria-selected', 'true');
  });

  test('should unarchive vault', async ({ page }) => {
    await archiveVault(page);
    await page.goto(BASE_URL);
    await page.getByRole('tab', { name: 'Архив' }).click();
    const vaultButton = page.getByRole('button', { name: /Test Vault/ });
    await vaultButton.click();
    await unarchiveVault(page);
    await page.goto(BASE_URL);
    await expect(page.getByRole('tab', { name: 'Активные' })).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Vault Page - File Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const vaultName = `Test Vault ${Date.now()}`;
    await createVault(page, vaultName);
    await openVault(page, vaultName);
    const createRootBtn = page.getByRole('button', { name: 'Создать рабочую папку' });
    if (await createRootBtn.isVisible({ timeout: 2000 })) {
      await createRootBtn.click();
      await expect(page.getByRole('button', { name: 'Создать файл' })).not.toBeDisabled({ timeout: 5000 });
    }
  });

  test('should create file in folder', async ({ page }) => {
    const folderName = `folder-${Date.now()}`;
    await createFolder(page, folderName);
    await page.getByRole('button', { name: folderName }).click();
    const fileName = `note-in-folder-${Date.now()}.md`;
    await createFile(page, fileName, folderName);
    await expect(page.getByRole('link', { name: fileName })).toBeVisible();
  });

  test('should delete file', async ({ page }) => {
    const fileName = `note-to-delete-${Date.now()}.md`;
    await createFile(page, fileName);
    await deleteFile(page, fileName);
    await expect(page.getByRole('link', { name: fileName })).toBeHidden();
  });

  test('should move file to folder', async ({ page }) => {
    const folderName = `target-folder-${Date.now()}`;
    await createFolder(page, folderName);
    const fileName = `note-to-move-${Date.now()}.md`;
    await createFile(page, fileName);

    // Find and click move button for the file
    const fileRow = page.locator(`[class*="file-row"]:has-text("${fileName}")`).first();
    const moveButton = fileRow.locator('button[title*="переместить" i], button[title*="move" i]').first();
    await moveButton.click();
    await page.getByRole('button', { name: folderName }).click();
    await page.getByRole('button', { name: 'Переместить сюда' }).click();
    await expect(page.getByRole('link', { name: fileName })).toBeVisible();
  });

  test('should import files', async ({ page }) => {
    const importButton = page.getByRole('button', { name: 'importNotes' }).first();
    await importButton.click();
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'test.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Imported Note\n\nContent from import.'),
    });
    await expect(page.getByText('Импорт завершен').or(page.getByText('Import done')).or(page.getByText('test.md'))).toBeVisible({ timeout: 10000 });
  });

  test('should show file info panel when file selected', async ({ page }) => {
    const fileName = `note-info-${Date.now()}.md`;
    await createFile(page, fileName);
    await page.getByRole('link', { name: fileName }).click();
    await expect(page.getByText('Путь')).toBeVisible();
    await expect(page.getByText('Размер')).toBeVisible();
    await expect(page.getByText('Изменён')).toBeVisible();
  });
});