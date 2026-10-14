# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vault-editor.spec.ts >> Vault Page - Settings Tab >> should set git remote URL
- Location: e2e/vault-editor.spec.ts:178:3

# Error details

```
TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
Call log:
  - waiting for getByText('Сохранено').or(getByText('Saved')).first() to be visible

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
      - heading "Test Vault 1792006436617" [level=2] [ref=e36]
      - generic [ref=e37]:
        - link "Назад" [ref=e38] [cursor=pointer]:
          - /url: /
        - button "В архив" [ref=e41] [cursor=pointer]
    - navigation "Хлебные крошки" [ref=e45]:
      - link "Хранилища" [ref=e46] [cursor=pointer]:
        - /url: /
      - generic [ref=e47]: /
      - generic [ref=e48]: Test Vault 1792006436617
    - tablist "Хранилище" [ref=e49]:
      - tab "Редактор" [ref=e50] [cursor=pointer]
      - tab "activity" [ref=e51] [cursor=pointer]
      - tab "Настройки хранилища" [selected] [ref=e52] [cursor=pointer]
    - generic [ref=e53]:
      - generic [ref=e54]:
        - heading "Хранилище" [level=3] [ref=e61]
        - generic [ref=e62]:
          - generic [ref=e63]:
            - text: Название
            - textbox "Название" [ref=e64]: Test Vault 1792006436617
          - button "Сохранить" [active] [ref=e65] [cursor=pointer]
        - generic [ref=e69]:
          - generic [ref=e70]:
            - term [ref=e71]: Slug
            - definition [ref=e72]: test-vault-1792006436617
          - generic [ref=e73]:
            - term [ref=e74]: Путь
            - definition [ref=e75]: vault-28
          - generic [ref=e76]:
            - term [ref=e77]: Роль
            - definition [ref=e78]: owner
          - generic [ref=e79]:
            - term [ref=e80]: В архиве
            - definition [ref=e81]: нет
        - generic [ref=e82]:
          - text: WebDAV URL
          - generic [ref=e83]:
            - textbox "WebDAV URL" [ref=e84]: http://127.0.0.1:18081/webdav/test-vault-1792006436617/
            - button "Скопировать WebDAV URL" [ref=e85] [cursor=pointer]
      - generic [ref=e89]:
        - heading "Участники" [level=3] [ref=e92]
        - article [ref=e94]:
          - generic [ref=e95]:
            - strong [ref=e96]: admin
            - paragraph [ref=e97]: owner
      - generic [ref=e98]:
        - heading "Статус Git" [level=3] [ref=e103]
        - generic [ref=e104]:
          - generic [ref=e105]:
            - generic [ref=e106]: Изменения
            - strong [ref=e107]: нет
          - generic [ref=e108]:
            - generic [ref=e109]: Очередь
            - strong [ref=e110]: "0"
          - generic [ref=e111]:
            - generic [ref=e112]: Последняя ошибка
            - strong [ref=e113]: нет
      - generic [ref=e114]:
        - heading "snapshots" [level=3] [ref=e120]
        - button "createSnapshot" [ref=e121] [cursor=pointer]
        - paragraph [ref=e126]: noSnapshots
      - generic [ref=e127]:
        - heading "Удалённый бэкап" [level=3] [ref=e133]
        - generic [ref=e134]:
          - generic [ref=e135]:
            - text: URL удалённого репозитория
            - textbox "URL удалённого репозитория" [ref=e136]:
              - /placeholder: git@host:owner/repo.git…
              - text: git@github.com:user/repo.git
          - generic [ref=e137]:
            - button "Сохранить" [ref=e138] [cursor=pointer]
            - button "Push" [ref=e139] [cursor=pointer]
        - generic [ref=e140]:
          - generic [ref=e141]:
            - term [ref=e142]: Последний push
            - definition [ref=e143]: никогда
          - generic [ref=e144]:
            - term [ref=e145]: Последняя ошибка
            - definition [ref=e146]: нет
      - generic [ref=e147]:
        - heading "Коммиты" [level=3] [ref=e152]
        - generic [ref=e153]:
          - paragraph [ref=e155]: Коммитов пока нет
          - paragraph [ref=e157]: Выберите коммит
```

# Test source

```ts
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
> 196 |   await orText(page, 'Сохранено', 'Saved').waitFor({ state: 'visible', timeout: 15000 });
      |                                            ^ TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
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