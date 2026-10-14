# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vault-editor.spec.ts >> Vault Page - Editor Tab >> should switch view modes: rendered, plain, split
- Location: e2e/vault-editor.spec.ts:41:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.markdown-editor-shell')
Expected: visible
Error: strict mode violation: locator('.markdown-editor-shell') resolved to 2 elements:
    1) <section class="markdown-editor-shell" aria-label="Markdown-редактор">…</section> aka getByRole('region', { name: 'Markdown-редактор' })
    2) <div class="markdown-editor-shell " aria-label="Markdown-редактор">…</div> aka getByRole('region', { name: 'Markdown-редактор' }).getByLabel('Markdown-редактор')

Call log:
  - Expect "toBeVisible" locator('.markdown-editor-shell') with timeout 30000ms
  - waiting for locator('.markdown-editor-shell')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "Перейти к содержимому" [ref=e4] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e5]:
    - generic [ref=e6]:
      - link "Dashboard" [ref=e7] [cursor=pointer]:
        - /url: /
        - generic [ref=e11]: mdock
      - navigation "Основная навигация" [ref=e12]:
        - link "Хранилища" [ref=e13] [cursor=pointer]:
          - /url: /
        - link "Пользователи" [ref=e14] [cursor=pointer]:
          - /url: /?page=admin-users
        - link "Аккаунт" [ref=e15] [cursor=pointer]:
          - /url: /?page=account
      - generic [ref=e16]:
        - group [ref=e17]:
          - generic "Настройки темы" [ref=e18]
        - button "English" [ref=e25] [cursor=pointer]
        - generic [ref=e30]: admin
        - button "Выйти" [ref=e31] [cursor=pointer]
    - generic [ref=e35]:
      - heading "Test Vault 1792006429591" [level=2] [ref=e36]
      - generic [ref=e37]:
        - link "Назад" [ref=e38] [cursor=pointer]:
          - /url: /
        - button "В архив" [ref=e41] [cursor=pointer]
    - navigation "Хлебные крошки" [ref=e45]:
      - link "Хранилища" [ref=e46] [cursor=pointer]:
        - /url: /
      - generic [ref=e47]: /
      - generic [ref=e48]: Test Vault 1792006429591
    - tablist "Хранилище" [ref=e49]:
      - tab "Редактор" [selected] [ref=e50] [cursor=pointer]
      - tab "activity" [ref=e51] [cursor=pointer]
      - tab "Настройки хранилища" [ref=e52] [cursor=pointer]
    - generic [ref=e53]:
      - generic [ref=e54]:
        - generic [ref=e55]: Файлы и просмотр
        - generic [ref=e59]:
          - button "Скрыть файлы" [ref=e60] [cursor=pointer]
          - generic [ref=e64]:
            - checkbox "Редактирование" [ref=e65]
            - generic [ref=e66]: Редактирование
          - button "Сохранить" [disabled] [ref=e67]
          - tablist "Просмотр" [ref=e72]:
            - tab "Просмотр" [ref=e73] [cursor=pointer]
            - tab "Исходник" [active] [selected] [ref=e77] [cursor=pointer]
            - tab "Две панели" [ref=e82] [cursor=pointer]
      - generic [ref=e85]:
        - region "Файлы" [ref=e86]:
          - generic [ref=e87]:
            - button "Выше" [ref=e88] [cursor=pointer]
            - generic [ref=e92]: Obsidian Vault
            - button "Рабочая папка" [ref=e93] [cursor=pointer]
            - button "Корень" [ref=e97] [cursor=pointer]
            - button "Создать файл" [ref=e101] [cursor=pointer]
            - button "Создать папку" [ref=e106] [cursor=pointer]
            - button "importNotes" [ref=e110] [cursor=pointer]
            - button "importNotes" [ref=e115]
          - generic [ref=e118]:
            - link "note-1792006430581.md" [ref=e120] [cursor=pointer]:
              - /url: /?page=vault&slug=test-vault-1792006429591&file=Obsidian+Vault%2Fnote-1792006430581.md&section=editor&view=plain
              - generic [ref=e124]:
                - strong [ref=e125]: note-1792006430581.md
                - generic [ref=e126]: 0 B · 15 окт. 2026 г., 05:33
            - generic [ref=e127]:
              - 'button "Переместить: note-1792006430581.md" [ref=e128] [cursor=pointer]'
              - 'button "Удалить файл: note-1792006430581.md" [ref=e134] [cursor=pointer]'
        - region "Просмотр" [ref=e139]:
          - generic [ref=e140]:
            - generic [ref=e141]:
              - term [ref=e142]: Путь
              - definition [ref=e143]: Obsidian Vault/note-1792006430581.md
            - generic [ref=e144]:
              - term [ref=e145]: Размер
              - definition [ref=e146]: 0 B
            - generic [ref=e147]:
              - term [ref=e148]: Изменён
              - definition [ref=e149]: 15 окт. 2026 г., 05:33
          - region "Markdown-редактор" [ref=e150]:
            - generic "Markdown-редактор" [ref=e151]:
              - generic [ref=e153]:
                - generic [ref=e155]: "1"
                - textbox [ref=e159]
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
  38  |     await expect(page.locator('.markdown-editor-shell')).toBeVisible();
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
> 51  |     await expect(page.locator('.markdown-editor-shell')).toBeVisible({ timeout: 30000 });
      |                                                          ^ Error: expect(locator).toBeVisible() failed
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
  139 | 
  140 |   test('should rename vault', async ({ page }) => {
  141 |     const newName = `Renamed Vault ${Date.now()}`;
  142 |     await renameVault(page, newName);
  143 |     await expect(page.getByRole('heading', { name: newName })).toBeVisible({ timeout: 5000 });
  144 |   });
  145 | 
  146 |   test('should show WebDAV URL and copy button', async ({ page }) => {
  147 |     await goToSection(page, 'settings');
  148 |     await expect(page.getByRole('textbox', { name: 'WebDAV URL' })).toBeVisible();
  149 |     await expect(page.getByRole('button', { name: 'Скопировать WebDAV URL' })).toBeVisible();
  150 |   });
  151 | 
```