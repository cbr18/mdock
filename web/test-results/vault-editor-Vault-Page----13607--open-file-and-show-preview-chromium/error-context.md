# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vault-editor.spec.ts >> Vault Page - Editor Tab >> should open file and show preview
- Location: e2e/vault-editor.spec.ts:34:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.markdown-editor-shell')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.markdown-editor-shell') with timeout 10000ms
  - waiting for locator('.markdown-editor-shell')

```

```yaml
- link "Перейти к содержимому":
  - /url: "#main-content"
- main:
  - link "Dashboard":
    - /url: /
    - text: mdock
  - navigation "Основная навигация":
    - link "Хранилища":
      - /url: /
    - link "Пользователи":
      - /url: /?page=admin-users
    - link "Аккаунт":
      - /url: /?page=account
  - group
  - button "English"
  - text: admin
  - button "Выйти"
  - heading "Test Vault 1792006417669" [level=2]
  - link "Назад":
    - /url: /
  - button "В архив"
  - navigation "Хлебные крошки":
    - link "Хранилища":
      - /url: /
    - text: / Test Vault 1792006417669
  - tablist "Хранилище":
    - tab "Редактор" [selected]
    - tab "activity"
    - tab "Настройки хранилища"
  - text: Файлы и просмотр
  - button "Скрыть файлы"
  - checkbox "Редактирование"
  - text: Редактирование
  - button "Сохранить" [disabled]
  - tablist "Просмотр":
    - tab "Просмотр" [selected]
    - tab "Исходник"
    - tab "Две панели"
  - region "Файлы":
    - button "Выше"
    - text: Obsidian Vault
    - button "Рабочая папка"
    - button "Корень"
    - button "Создать файл"
    - button "Создать папку"
    - button "importNotes"
    - button "importNotes"
    - link "note-1792006418634.md":
      - /url: /?page=vault&slug=test-vault-1792006417669&file=Obsidian+Vault%2Fnote-1792006418634.md&section=editor&view=rendered
      - strong: note-1792006418634.md
      - text: 0 B · 15 окт. 2026 г., 05:33
    - 'button "Переместить: note-1792006418634.md"'
    - 'button "Удалить файл: note-1792006418634.md"'
  - region "Просмотр":
    - term: Путь
    - definition: Obsidian Vault/note-1792006418634.md
    - term: Размер
    - definition: 0 B
    - term: Изменён
    - definition: 15 окт. 2026 г., 05:33
    - paragraph: Выберите markdown-файл
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { login, createVault, openVault, goToSection, enableEditing, disableEditing, saveFile, switchViewMode, createFile, createFolder, openFile, deleteFile, toggleSidebar, renameVault, archiveVault, unarchiveVault, copyWebDAVURL, setGitRemote, pushGitRemote, BASE_URL, orRole, orText, orLocator } from './helpers';
  3   | 
  4   | test.describe('Vault Page - Editor Tab', () => {
  5   |   test.beforeEach(async ({ page }) => {
  6   |     await login(page);
  7   |     const vaultName = `Test Vault ${Date.now()}`;
  8   |     await createVault(page, vaultName);
  9   |     await openVault(page, vaultName);
  10  |     // Create default file root if needed
  11  |     const createRootBtn = page.getByRole('button', { name: 'Создать рабочую папку' });
  12  |     if (await createRootBtn.isVisible({ timeout: 2000 })) {
  13  |       await createRootBtn.click();
  14  |       await expect(page.getByRole('button', { name: 'Создать файл' })).not.toBeDisabled({ timeout: 5000 });
  15  |     }
  16  |   });
  17  | 
  18  |   test('should show file tree panel', async ({ page }) => {
  19  |     await expect(page.getByRole('region', { name: 'Файлы' })).toBeVisible({ timeout: 10000 });
  20  |   });
  21  | 
  22  |   test('should create a new file', async ({ page }) => {
  23  |     const fileName = `note-${Date.now()}.md`;
  24  |     await createFile(page, fileName);
  25  |     await expect(page.getByRole('link', { name: fileName })).toBeVisible();
  26  |   });
  27  | 
  28  |   test('should create a new folder', async ({ page }) => {
  29  |     const folderName = `folder-${Date.now()}`;
  30  |     await createFolder(page, folderName);
  31  |     await expect(page.getByRole('button', { name: folderName, exact: true })).toBeVisible();
  32  |   });
  33  | 
  34  |   test('should open file and show preview', async ({ page }) => {
  35  |     const fileName = `note-${Date.now()}.md`;
  36  |     await createFile(page, fileName);
  37  |     await openFile(page, fileName);
> 38  |     await expect(page.locator('.markdown-editor-shell')).toBeVisible();
      |                                                          ^ Error: expect(locator).toBeVisible() failed
  39  |   });
  40  | 
  41  |   test('should switch view modes: rendered, plain, split', async ({ page }) => {
  42  |     const fileName = `note-${Date.now()}.md`;
  43  |     await createFile(page, fileName);
  44  |     await openFile(page, fileName);
  45  | 
  46  |     await switchViewMode(page, 'rendered');
  47  |     await expect(page.locator('.rendered-preview-view')).toBeVisible({ timeout: 10000 });
  48  | 
  49  |     await switchViewMode(page, 'plain');
  50  |     // Wait for editor to load (Suspense fallback then actual editor)
  51  |     await expect(page.locator('.markdown-editor-shell')).toBeVisible({ timeout: 30000 });
  52  | 
  53  |     await switchViewMode(page, 'split');
  54  |     await expect(page.locator('.split-document-view')).toBeVisible({ timeout: 30000 });
  55  |   });
  56  | 
  57  |   test('should enable and disable editing mode', async ({ page }) => {
  58  |     const fileName = `note-${Date.now()}.md`;
  59  |     await createFile(page, fileName);
  60  |     await openFile(page, fileName);
  61  | 
  62  |     await enableEditing(page);
  63  |     const editCheckbox = page.getByRole('checkbox', { name: 'Редактирование' });
  64  |     await expect(editCheckbox).toBeChecked();
  65  | 
  66  |     await disableEditing(page);
  67  |     await expect(editCheckbox).not.toBeChecked();
  68  |   });
  69  | 
  70  |   test('should edit and save file content', async ({ page }) => {
  71  |     const fileName = `note-${Date.now()}.md`;
  72  |     await createFile(page, fileName);
  73  |     await openFile(page, fileName);
  74  | 
  75  |     await enableEditing(page);
  76  |     const editor = page.locator('.cm-editor, [class*="editor"] textarea, [contenteditable="true"]').first();
  77  |     await editor.fill('# Test Content\n\nHello World');
  78  |     await saveFile(page);
  79  |     await expect(page.getByText('Сохранено')).toBeVisible({ timeout: 10000 });
  80  |   });
  81  | 
  82  |   test('should toggle sidebar visibility', async ({ page }) => {
  83  |     await toggleSidebar(page);
  84  |     await expect(page.locator('.files-layout-collapsed')).toBeVisible();
  85  |     await toggleSidebar(page);
  86  |     await expect(page.locator('.files-layout:not(.files-layout-collapsed)')).toBeVisible();
  87  |   });
  88  | 
  89  |   test('should show breadcrumb navigation', async ({ page }) => {
  90  |     await expect(page.getByRole('navigation', { name: 'Хлебные крошки' })).toBeVisible();
  91  |     await expect(page.getByRole('navigation', { name: 'Хлебные крошки' }).getByRole('link', { name: 'Хранилища' })).toBeVisible();
  92  |   });
  93  | 
  94  |   test('should navigate back to dashboard', async ({ page }) => {
  95  |     await page.getByRole('link', { name: 'Назад' }).click();
  96  |     await expect(page.getByRole('heading', { name: 'Хранилища' })).toBeVisible();
  97  |   });
  98  | });
  99  | 
  100 | test.describe('Vault Page - Activity Tab', () => {
  101 |   test.beforeEach(async ({ page }) => {
  102 |     await login(page);
  103 |     const vaultName = `Test Vault ${Date.now()}`;
  104 |     await createVault(page, vaultName);
  105 |     await openVault(page, vaultName);
  106 |   });
  107 | 
  108 |   test('should show activity tab', async ({ page }) => {
  109 |     await goToSection(page, 'activity');
  110 |     await expect(page.getByRole('tab', { name: 'activity' })).toHaveAttribute('aria-selected', 'true');
  111 |   });
  112 | 
  113 |   test('should show commits list', async ({ page }) => {
  114 |     await goToSection(page, 'activity');
  115 |     await expect(page.locator('[class*="commit"], [class*="activity"]').first()).toBeVisible({ timeout: 10000 });
  116 |   });
  117 | });
  118 | 
  119 | test.describe('Vault Page - Settings Tab', () => {
  120 |   test.beforeEach(async ({ page }) => {
  121 |     await login(page);
  122 |     const vaultName = `Test Vault ${Date.now()}`;
  123 |     await createVault(page, vaultName);
  124 |     await openVault(page, vaultName);
  125 |   });
  126 | 
  127 |   test('should show settings tab', async ({ page }) => {
  128 |     await goToSection(page, 'settings');
  129 |     await expect(page.getByRole('tab', { name: 'Настройки хранилища' })).toHaveAttribute('aria-selected', 'true');
  130 |   });
  131 | 
  132 |   test('should show vault info panel', async ({ page }) => {
  133 |     await goToSection(page, 'settings');
  134 |     await expect(page.getByRole('heading', { name: 'Хранилище' })).toBeVisible();
  135 |     await expect(page.getByText('Slug')).toBeVisible();
  136 |     await expect(page.getByText('Путь')).toBeVisible();
  137 |     await expect(page.getByText('Роль')).toBeVisible();
  138 |   });
```