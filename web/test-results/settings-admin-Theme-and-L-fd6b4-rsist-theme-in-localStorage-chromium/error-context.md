# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings-admin.spec.ts >> Theme and Language Settings >> should persist theme in localStorage
- Location: e2e/settings-admin.spec.ts:28:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('button[aria-label*="тема" i]').or(locator('button[title*="тема" i]')).or(getByRole('button', { name: 'Настройки темы' })).first()

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
      - heading "Хранилища" [level=2] [ref=e36]
      - generic [ref=e38]:
        - generic [ref=e39]:
          - text: Новое хранилище
          - textbox "Новое хранилище" [ref=e40]
        - button "Создать" [ref=e41] [cursor=pointer]
    - tablist "Хранилища" [ref=e43]:
      - tab "Активные" [selected] [ref=e44] [cursor=pointer]
      - tab "Архив" [ref=e45] [cursor=pointer]
    - region "Список хранилищ" [ref=e46]:
      - article [ref=e47]:
        - button [ref=e53] [cursor=pointer]:
          - heading "admin" [level=3] [ref=e54]
          - paragraph [ref=e55]: personal · owner
        - generic [ref=e56]:
          - text: WebDAV URL
          - generic [ref=e57]:
            - textbox "WebDAV URL" [ref=e58]: http://127.0.0.1:18081/webdav/admin/
            - button "Скопировать WebDAV URL" [ref=e59] [cursor=pointer]
      - article [ref=e63]:
        - button [ref=e69] [cursor=pointer]:
          - heading "Test Vault 1792006289112" [level=3] [ref=e70]
          - paragraph [ref=e71]: shared · owner
        - generic [ref=e72]:
          - text: WebDAV URL
          - generic [ref=e73]:
            - textbox "WebDAV URL" [ref=e74]: http://127.0.0.1:18081/webdav/test-vault-1792006289112/
            - button "Скопировать WebDAV URL" [ref=e75] [cursor=pointer]
      - article [ref=e79]:
        - button [ref=e85] [cursor=pointer]:
          - heading "Test Vault 1792006307389" [level=3] [ref=e86]
          - paragraph [ref=e87]: shared · owner
        - generic [ref=e88]:
          - text: WebDAV URL
          - generic [ref=e89]:
            - textbox "WebDAV URL" [ref=e90]: http://127.0.0.1:18081/webdav/test-vault-1792006307389/
            - button "Скопировать WebDAV URL" [ref=e91] [cursor=pointer]
      - article [ref=e95]:
        - button [ref=e101] [cursor=pointer]:
          - heading "Test Vault 1792006307722" [level=3] [ref=e102]
          - paragraph [ref=e103]: shared · owner
        - generic [ref=e104]:
          - text: WebDAV URL
          - generic [ref=e105]:
            - textbox "WebDAV URL" [ref=e106]: http://127.0.0.1:18081/webdav/test-vault-1792006307722/
            - button "Скопировать WebDAV URL" [ref=e107] [cursor=pointer]
      - article [ref=e111]:
        - button [ref=e117] [cursor=pointer]:
          - heading "Test Vault 1792006307785" [level=3] [ref=e118]
          - paragraph [ref=e119]: shared · owner
        - generic [ref=e120]:
          - text: WebDAV URL
          - generic [ref=e121]:
            - textbox "WebDAV URL" [ref=e122]: http://127.0.0.1:18081/webdav/test-vault-1792006307785/
            - button "Скопировать WebDAV URL" [ref=e123] [cursor=pointer]
      - article [ref=e127]:
        - button [ref=e133] [cursor=pointer]:
          - heading "Test Vault 1792006307939" [level=3] [ref=e134]
          - paragraph [ref=e135]: shared · owner
        - generic [ref=e136]:
          - text: WebDAV URL
          - generic [ref=e137]:
            - textbox "WebDAV URL" [ref=e138]: http://127.0.0.1:18081/webdav/test-vault-1792006307939/
            - button "Скопировать WebDAV URL" [ref=e139] [cursor=pointer]
```

# Test source

```ts
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
  135 |   await orText(page, fileName).waitFor({ state: 'hidden', timeout: 5000 });
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
> 210 |   ).click();
      |     ^ Error: locator.click: Test timeout of 60000ms exceeded.
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