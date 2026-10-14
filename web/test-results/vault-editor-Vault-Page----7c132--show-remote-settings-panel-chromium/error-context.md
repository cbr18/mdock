# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vault-editor.spec.ts >> Vault Page - Settings Tab >> should show remote settings panel
- Location: e2e/vault-editor.spec.ts:173:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Remote' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Remote' }) with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Remote' })

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
  - heading "Test Vault 1792006436196" [level=2]
  - link "Назад":
    - /url: /
  - button "В архив"
  - navigation "Хлебные крошки":
    - link "Хранилища":
      - /url: /
    - text: / Test Vault 1792006436196
  - tablist "Хранилище":
    - tab "Редактор"
    - tab "activity"
    - tab "Настройки хранилища" [selected]
  - heading "Хранилище" [level=3]
  - text: Название
  - textbox "Название": Test Vault 1792006436196
  - button "Сохранить"
  - term: Slug
  - definition: test-vault-1792006436196
  - term: Путь
  - definition: vault-27
  - term: Роль
  - definition: owner
  - term: В архиве
  - definition: нет
  - text: WebDAV URL
  - textbox "WebDAV URL": http://127.0.0.1:18081/webdav/test-vault-1792006436196/
  - button "Скопировать WebDAV URL"
  - heading "Участники" [level=3]
  - article:
    - strong: admin
    - paragraph: owner
  - heading "Статус Git" [level=3]
  - text: Изменения
  - strong: нет
  - text: Очередь
  - strong: "0"
  - text: Последняя ошибка
  - strong: нет
  - heading "snapshots" [level=3]
  - button "createSnapshot"
  - paragraph: noSnapshots
  - heading "Удалённый бэкап" [level=3]
  - text: URL удалённого репозитория
  - textbox "URL удалённого репозитория":
    - /placeholder: git@host:owner/repo.git…
  - button "Сохранить"
  - button "Push"
  - term: Последний push
  - definition: никогда
  - term: Последняя ошибка
  - definition: нет
  - heading "Коммиты" [level=3]
  - paragraph: Коммитов пока нет
  - paragraph: Выберите коммит
```

# Test source

```ts
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
  152 |   test('should copy WebDAV URL', async ({ page }) => {
  153 |     await goToSection(page, 'settings');
  154 |     await copyWebDAVURL(page);
  155 |     await expect(page.getByText('Скопировано')).toBeVisible({ timeout: 5000 });
  156 |   });
  157 | 
  158 |   test('should show members panel', async ({ page }) => {
  159 |     await goToSection(page, 'settings');
  160 |     await expect(page.getByRole('heading', { name: 'Участники' })).toBeVisible();
  161 |   });
  162 | 
  163 |   test('should show git status panel', async ({ page }) => {
  164 |     await goToSection(page, 'settings');
  165 |     await expect(page.getByRole('heading', { name: 'Статус Git' })).toBeVisible();
  166 |   });
  167 | 
  168 |   test('should show git commits panel', async ({ page }) => {
  169 |     await goToSection(page, 'settings');
  170 |     await expect(page.getByRole('heading', { name: 'Коммиты' })).toBeVisible();
  171 |   });
  172 | 
  173 |   test('should show remote settings panel', async ({ page }) => {
  174 |     await goToSection(page, 'settings');
> 175 |     await expect(page.getByRole('heading', { name: 'Remote' })).toBeVisible();
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  176 |   });
  177 | 
  178 |   test('should set git remote URL', async ({ page }) => {
  179 |     await setGitRemote(page, 'git@github.com:user/repo.git');
  180 |     await expect(page.locator('input[value*="github.com"]')).toBeVisible();
  181 |   });
  182 | 
  183 |   test('should push to git remote', async ({ page }) => {
  184 |     await setGitRemote(page, '/tmp/test-repo.git');
  185 |     await pushGitRemote(page);
  186 |   });
  187 | 
  188 |   test('should archive vault', async ({ page }) => {
  189 |     await archiveVault(page);
  190 |     await page.goto(BASE_URL);
  191 |     await page.getByRole('tab', { name: 'Архив' }).click();
  192 |     await expect(page.getByRole('tab', { name: 'Архив' })).toHaveAttribute('aria-selected', 'true');
  193 |   });
  194 | 
  195 |   test('should unarchive vault', async ({ page }) => {
  196 |     await archiveVault(page);
  197 |     await page.goto(BASE_URL);
  198 |     await page.getByRole('tab', { name: 'Архив' }).click();
  199 |     const vaultButton = page.getByRole('button', { name: /Test Vault/ });
  200 |     await vaultButton.click();
  201 |     await unarchiveVault(page);
  202 |     await page.goto(BASE_URL);
  203 |     await expect(page.getByRole('tab', { name: 'Активные' })).toHaveAttribute('aria-selected', 'true');
  204 |   });
  205 | });
  206 | 
  207 | test.describe('Vault Page - File Operations', () => {
  208 |   test.beforeEach(async ({ page }) => {
  209 |     await login(page);
  210 |     const vaultName = `Test Vault ${Date.now()}`;
  211 |     await createVault(page, vaultName);
  212 |     await openVault(page, vaultName);
  213 |     const createRootBtn = page.getByRole('button', { name: 'Создать рабочую папку' });
  214 |     if (await createRootBtn.isVisible({ timeout: 2000 })) {
  215 |       await createRootBtn.click();
  216 |       await expect(page.getByRole('button', { name: 'Создать файл' })).not.toBeDisabled({ timeout: 5000 });
  217 |     }
  218 |   });
  219 | 
  220 |   test('should create file in folder', async ({ page }) => {
  221 |     const folderName = `folder-${Date.now()}`;
  222 |     await createFolder(page, folderName);
  223 |     await page.getByRole('button', { name: folderName }).click();
  224 |     const fileName = `note-in-folder-${Date.now()}.md`;
  225 |     await createFile(page, fileName, folderName);
  226 |     await expect(page.getByRole('link', { name: fileName })).toBeVisible();
  227 |   });
  228 | 
  229 |   test('should delete file', async ({ page }) => {
  230 |     const fileName = `note-to-delete-${Date.now()}.md`;
  231 |     await createFile(page, fileName);
  232 |     await deleteFile(page, fileName);
  233 |     await expect(page.getByRole('link', { name: fileName })).toBeHidden();
  234 |   });
  235 | 
  236 |   test('should move file to folder', async ({ page }) => {
  237 |     const folderName = `target-folder-${Date.now()}`;
  238 |     await createFolder(page, folderName);
  239 |     const fileName = `note-to-move-${Date.now()}.md`;
  240 |     await createFile(page, fileName);
  241 | 
  242 |     // Find and click move button for the file
  243 |     const fileRow = page.locator(`[class*="file-row"]:has-text("${fileName}")`).first();
  244 |     const moveButton = fileRow.locator('button[title*="переместить" i], button[title*="move" i]').first();
  245 |     await moveButton.click();
  246 |     await page.getByRole('button', { name: folderName }).click();
  247 |     await page.getByRole('button', { name: 'Переместить сюда' }).click();
  248 |     await expect(page.getByRole('link', { name: fileName })).toBeVisible();
  249 |   });
  250 | 
  251 |   test('should import files', async ({ page }) => {
  252 |     const importButton = page.getByRole('button', { name: 'importNotes' }).first();
  253 |     await importButton.click();
  254 |     const fileInput = page.locator('input[type="file"]').first();
  255 |     await fileInput.setInputFiles({
  256 |       name: 'test.md',
  257 |       mimeType: 'text/markdown',
  258 |       buffer: Buffer.from('# Imported Note\n\nContent from import.'),
  259 |     });
  260 |     await expect(page.getByText('Импорт завершен').or(page.getByText('Import done')).or(page.getByText('test.md'))).toBeVisible({ timeout: 10000 });
  261 |   });
  262 | 
  263 |   test('should show file info panel when file selected', async ({ page }) => {
  264 |     const fileName = `note-info-${Date.now()}.md`;
  265 |     await createFile(page, fileName);
  266 |     await page.getByRole('link', { name: fileName }).click();
  267 |     await expect(page.getByText('Путь')).toBeVisible();
  268 |     await expect(page.getByText('Размер')).toBeVisible();
  269 |     await expect(page.getByText('Изменён')).toBeVisible();
  270 |   });
  271 | });
```