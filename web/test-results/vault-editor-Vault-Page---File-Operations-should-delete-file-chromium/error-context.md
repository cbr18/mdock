# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vault-editor.spec.ts >> Vault Page - File Operations >> should delete file
- Location: e2e/vault-editor.spec.ts:229:3

# Error details

```
TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
Call log:
  - waiting for getByText('note-to-delete-1792006441106.md').first() to be hidden
    14 × locator resolved to visible <strong>note-to-delete-1792006441106.md</strong>

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
      - heading "Test Vault 1792006440109" [level=2] [ref=e36]
      - generic [ref=e37]:
        - link "Назад" [ref=e38] [cursor=pointer]:
          - /url: /
        - button "В архив" [ref=e41] [cursor=pointer]
    - navigation "Хлебные крошки" [ref=e45]:
      - link "Хранилища" [ref=e46] [cursor=pointer]:
        - /url: /
      - generic [ref=e47]: /
      - generic [ref=e48]: Test Vault 1792006440109
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
      - status [ref=e85]: Файл создан
      - generic [ref=e86]:
        - region "Файлы" [ref=e87]:
          - generic [ref=e88]:
            - button "Выше" [ref=e89] [cursor=pointer]
            - generic [ref=e93]: Obsidian Vault
            - button "Рабочая папка" [ref=e94] [cursor=pointer]
            - button "Корень" [ref=e98] [cursor=pointer]
            - button "Создать файл" [active] [ref=e102] [cursor=pointer]
            - button "Создать папку" [ref=e107] [cursor=pointer]
            - button "importNotes" [ref=e111] [cursor=pointer]
            - button "importNotes" [ref=e116]
          - generic [ref=e119]:
            - link "note-to-delete-1792006441106.md" [ref=e121] [cursor=pointer]:
              - /url: /?page=vault&slug=test-vault-1792006440109&section=editor&file=Obsidian+Vault%2Fnote-to-delete-1792006441106.md&view=rendered
              - generic [ref=e125]:
                - strong [ref=e126]: note-to-delete-1792006441106.md
                - generic [ref=e127]: 0 B · 15 окт. 2026 г., 05:34
            - generic [ref=e128]:
              - 'button "Переместить: note-to-delete-1792006441106.md" [ref=e129] [cursor=pointer]'
              - 'button "Удалить файл: note-to-delete-1792006441106.md" [ref=e135] [cursor=pointer]'
        - region "Просмотр" [ref=e140]:
          - paragraph [ref=e141]: Выберите markdown-файл
```

# Test source

```ts
  35  |   ).fill(username);
  36  |   await orLocator(
  37  |     page.locator('label:has-text("Пароль") input[type="password"]'),
  38  |     page.locator('label:has-text("Password") input[type="password"]')
  39  |   ).fill(password);
  40  |   await orRole(page, 'button', 'Войти', 'Login').click();
  41  |   await orRole(page, 'heading', 'Хранилища', 'Vaults').waitFor({ state: 'visible', timeout: 15000 });
  42  | }
  43  | 
  44  | export async function logout(page: Page) {
  45  |   await orRole(page, 'button', 'Выйти', 'Logout').click();
  46  |   await orRole(page, 'heading', 'mdock').waitFor({ state: 'visible', timeout: 10000 });
  47  | }
  48  | 
  49  | export async function createVault(page: Page, name: string) {
  50  |   await orRole(page, 'button', 'Создать', 'Create').click();
  51  |   await orLocator(
  52  |     page.locator('input[name="vault-name"]'),
  53  |     page.locator('input[placeholder*="название" i]'),
  54  |     page.locator('input[placeholder*="name" i]')
  55  |   ).fill(name);
  56  |   await orRole(page, 'button', 'Создать', 'Create').click();
  57  |   await orText(page, name).waitFor({ state: 'visible', timeout: 10000 });
  58  | }
  59  | 
  60  | export async function openVault(page: Page, vaultName: string) {
  61  |   await orLocator(
  62  |     page.getByRole('button', { name: vaultName }),
  63  |     page.getByRole('link', { name: vaultName })
  64  |   ).click();
  65  |   await orRole(page, 'tab', 'Редактор', 'Editor').waitFor({ state: 'visible', timeout: 15000 });
  66  | }
  67  | 
  68  | export async function waitForEditor(page: Page) {
  69  |   await page.locator('.markdown-editor-shell, [class*="editor"]').first().waitFor({ state: 'visible', timeout: 15000 });
  70  | }
  71  | 
  72  | export async function createFile(page: Page, fileName: string, basePath = '.') {
  73  |   page.once('dialog', dialog => dialog.accept(fileName));
  74  |   const createFileButton = page.getByRole('button', { name: 'Создать файл' });
  75  |   await createFileButton.click();
  76  |   await orText(page, fileName).waitFor({ state: 'visible', timeout: 5000 });
  77  | }
  78  | 
  79  | export async function createFolder(page: Page, folderName: string, basePath = '.') {
  80  |   page.once('dialog', dialog => dialog.accept(folderName));
  81  |   const createFolderButton = page.getByRole('button', { name: 'Создать папку' });
  82  |   await createFolderButton.click();
  83  |   await orText(page, folderName).waitFor({ state: 'visible', timeout: 5000 });
  84  | }
  85  | 
  86  | export async function openFile(page: Page, fileName: string) {
  87  |   await page.getByRole('link', { name: fileName }).click();
  88  |   // Wait for either editor or rendered preview to be visible
  89  |   await page.locator('.markdown-editor-shell, .rendered-preview-view, .split-document-view, .live-document-view, [class*="editor"]').first().waitFor({ state: 'visible', timeout: 15000 });
  90  | }
  91  | 
  92  | export async function enableEditing(page: Page) {
  93  |   const editCheckbox = page.getByRole('checkbox', { name: 'Редактирование' });
  94  |   if (await editCheckbox.isVisible()) {
  95  |     await editCheckbox.check();
  96  |     await orText(page, 'Lock активен', 'Lock active', 'Редактирование активно').waitFor({ state: 'visible', timeout: 15000 });
  97  |   }
  98  | }
  99  | 
  100 | export async function disableEditing(page: Page) {
  101 |   const editCheckbox = page.getByRole('checkbox', { name: 'Редактирование' });
  102 |   if (await editCheckbox.isVisible()) {
  103 |     await editCheckbox.uncheck();
  104 |   }
  105 | }
  106 | 
  107 | export async function saveFile(page: Page) {
  108 |   await orRole(page, 'button', 'Сохранить', 'Save').click();
  109 |   await orText(page, 'Сохранено', 'Saved').waitFor({ state: 'visible', timeout: 15000 });
  110 | }
  111 | 
  112 | export async function switchViewMode(page: Page, mode: 'rendered' | 'plain' | 'split') {
  113 |   const labels = {
  114 |     rendered: ['Просмотр', 'Rendered'],
  115 |     plain: ['Исходник', 'Source', 'Plain'],
  116 |     split: ['Две панели', 'Split'],
  117 |   };
  118 |   for (const label of labels[mode]) {
  119 |     const button = page.getByRole('tab', { name: label });
  120 |     if (await button.isVisible({ timeout: 1000 })) {
  121 |       await button.click();
  122 |       // Wait for the view mode to actually change
  123 |       await page.waitForTimeout(500);
  124 |       return;
  125 |     }
  126 |   }
  127 | }
  128 | 
  129 | export async function deleteFile(page: Page, fileName: string) {
  130 |   // Find the file row and click the delete button within it
  131 |   const fileRow = page.locator(`[class*="file-row"]:has-text("${fileName}")`).first();
  132 |   const deleteButton = fileRow.locator('button[title*="удалить" i], button[title*="delete" i], button[aria-label*="удалить" i], button[aria-label*="delete" i]').first();
  133 |   await deleteButton.click();
  134 |   await orRole(page, 'button', 'Удалить', 'Delete', 'Да', 'Yes').click();
> 135 |   await orText(page, fileName).waitFor({ state: 'hidden', timeout: 5000 });
      |                                ^ TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
  136 | }
  137 | 
  138 | export async function toggleSidebar(page: Page) {
  139 |   await orRole(page, 'button', 'Скрыть файлы', 'Hide files', 'Показать файлы', 'Show files').click();
  140 | }
  141 | 
  142 | export async function goToSection(page: Page, section: 'editor' | 'activity' | 'settings') {
  143 |   const labels = {
  144 |     editor: ['Редактор', 'Editor'],
  145 |     activity: ['activity', 'Activity', 'Активность'],
  146 |     settings: ['Настройки хранилища', 'Settings', 'Настройки'],
  147 |   };
  148 |   for (const label of labels[section]) {
  149 |     const tab = page.getByRole('tab', { name: label });
  150 |     if (await tab.isVisible({ timeout: 1000 })) {
  151 |       await tab.click();
  152 |       return;
  153 |     }
  154 |   }
  155 | }
  156 | 
  157 | export async function renameVault(page: Page, newName: string) {
  158 |   await goToSection(page, 'settings');
  159 |   await orLocator(
  160 |     page.locator('input[name="vault-name"]'),
  161 |     page.locator('input[placeholder*="название" i]')
  162 |   ).fill(newName);
  163 |   await orRole(page, 'button', 'Сохранить', 'Save').click();
  164 |   await orText(page, newName).waitFor({ state: 'visible', timeout: 5000 });
  165 | }
  166 | 
  167 | export async function archiveVault(page: Page) {
  168 |   const archiveButton = orRole(page, 'button', 'В архив', 'Archive');
  169 |   if (await archiveButton.isVisible()) {
  170 |     await archiveButton.click();
  171 |     await orRole(page, 'button', 'Да', 'Yes', 'Подтвердить', 'Confirm').click();
  172 |     await orText(page, 'Архив', 'Archive').waitFor({ state: 'visible', timeout: 5000 });
  173 |   }
  174 | }
  175 | 
  176 | export async function unarchiveVault(page: Page) {
  177 |   const unarchiveButton = orRole(page, 'button', 'Восстановить', 'Restore');
  178 |   if (await unarchiveButton.isVisible()) {
  179 |     await unarchiveButton.click();
  180 |     await orText(page, 'Активные', 'Active').waitFor({ state: 'visible', timeout: 5000 });
  181 |   }
  182 | }
  183 | 
  184 | export async function copyWebDAVURL(page: Page) {
  185 |   await page.getByRole('button', { name: 'Скопировать WebDAV URL' }).click();
  186 | }
  187 | 
  188 | export async function setGitRemote(page: Page, url: string) {
  189 |   await goToSection(page, 'settings');
  190 |   await orLocator(
  191 |     page.locator('input[placeholder*="git" i]'),
  192 |     page.locator('input[placeholder*="remote" i]'),
  193 |     page.locator('input[name="remote-url"]')
  194 |   ).fill(url);
  195 |   await orRole(page, 'button', 'Сохранить', 'Save').click();
  196 |   await orText(page, 'Сохранено', 'Saved').waitFor({ state: 'visible', timeout: 15000 });
  197 | }
  198 | 
  199 | export async function pushGitRemote(page: Page) {
  200 |   await goToSection(page, 'settings');
  201 |   await orRole(page, 'button', 'Push', 'Отправить').click();
  202 |   await orText(page, 'Отправлено', 'Pushed', 'Готово', 'Done').waitFor({ state: 'visible', timeout: 30000 });
  203 | }
  204 | 
  205 | export async function openThemeSettings(page: Page) {
  206 |   await orLocator(
  207 |     page.locator('button[aria-label*="тема" i]'),
  208 |     page.locator('button[title*="тема" i]'),
  209 |     page.getByRole('button', { name: 'Настройки темы' })
  210 |   ).click();
  211 | }
  212 | 
  213 | export async function setTheme(page: Page, theme: 'dark' | 'light' | 'warm' | 'black') {
  214 |   await openThemeSettings(page);
  215 |   await page.getByRole('button', { name: theme.charAt(0).toUpperCase() + theme.slice(1) }).click();
  216 | }
  217 | 
  218 | export async function setAccent(page: Page, accent: string) {
  219 |   await openThemeSettings(page);
  220 |   await page.getByRole('button', { name: accent.charAt(0).toUpperCase() + accent.slice(1) }).click();
  221 | }
  222 | 
  223 | export async function setLanguage(page: Page, lang: 'ru' | 'en') {
  224 |   await orLocator(
  225 |     page.locator('button[aria-label*="язык" i]'),
  226 |     page.locator('button[title*="язык" i]'),
  227 |     page.getByRole('button', { name: 'Русский' }),
  228 |     page.getByRole('button', { name: 'English' })
  229 |   ).click();
  230 |   await page.getByRole('button', { name: lang === 'ru' ? 'Русский' : 'English' }).click();
  231 | }
```