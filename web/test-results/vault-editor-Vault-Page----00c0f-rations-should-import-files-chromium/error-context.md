# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vault-editor.spec.ts >> Vault Page - File Operations >> should import files
- Location: e2e/vault-editor.spec.ts:251:3

# Error details

```
Error: locator.setInputFiles: Error: [webkitdirectory] input requires passing a path to a directory
Call log:
  - waiting for locator('input[type="file"]').first()
    - locator resolved to <input multiple type="file" class="sr-only" webkitdirectory="" aria-label="importNotes" accept=".md,.markdown,.txt,text/plain"/>

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
      - heading "Test Vault 1792006442426" [level=2] [ref=e36]
      - generic [ref=e37]:
        - link "Назад" [ref=e38] [cursor=pointer]:
          - /url: /
        - button "В архив" [ref=e41] [cursor=pointer]
    - navigation "Хлебные крошки" [ref=e45]:
      - link "Хранилища" [ref=e46] [cursor=pointer]:
        - /url: /
      - generic [ref=e47]: /
      - generic [ref=e48]: Test Vault 1792006442426
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
            - checkbox "Редактирование" [disabled] [ref=e65]
            - generic [ref=e66]: Редактирование
          - button "Сохранить" [disabled] [ref=e67]
          - tablist "Просмотр" [ref=e72]:
            - tab "Просмотр" [selected] [ref=e73] [cursor=pointer]
            - tab "Исходник" [ref=e77] [cursor=pointer]
            - tab "Две панели" [ref=e82] [cursor=pointer]
      - status [ref=e85]: Папка создана
      - generic [ref=e86]:
        - region "Файлы" [ref=e87]:
          - generic [ref=e88]:
            - button "Выше" [ref=e89] [cursor=pointer]
            - generic [ref=e93]: Obsidian Vault
            - button "Рабочая папка" [ref=e94] [cursor=pointer]
            - button "Корень" [ref=e98] [cursor=pointer]
            - button "Создать файл" [ref=e102] [cursor=pointer]
            - button "Создать папку" [ref=e107] [cursor=pointer]
            - button "importNotes" [active] [ref=e111] [cursor=pointer]
            - button "importNotes" [ref=e116]
          - paragraph [ref=e118]: Файлов нет
        - region "Просмотр" [ref=e119]:
          - paragraph [ref=e120]: Выберите markdown-файл
```

# Test source

```ts
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
  175 |     await expect(page.getByRole('heading', { name: 'Remote' })).toBeVisible();
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
> 255 |     await fileInput.setInputFiles({
      |     ^ Error: locator.setInputFiles: Error: [webkitdirectory] input requires passing a path to a directory
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