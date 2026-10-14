# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vault-editor.spec.ts >> Vault Page - File Operations >> should move file to folder
- Location: e2e/vault-editor.spec.ts:236:3

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Создать файл' }) resolved to 2 elements:
    1) <button type="button" class="icon-button" title="Создать файл">…</button> aka getByRole('button', { name: 'Создать файл', exact: true })
    2) <button type="button" class="icon-button" title="Создать файл в папке">…</button> aka getByRole('button', { name: 'Создать файл в папке' })

Call log:
  - waiting for getByRole('button', { name: 'Создать файл' })

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
      - heading "Test Vault 1792006442125" [level=2] [ref=e36]
      - generic [ref=e37]:
        - link "Назад" [ref=e38] [cursor=pointer]:
          - /url: /
        - button "В архив" [ref=e41] [cursor=pointer]
    - navigation "Хлебные крошки" [ref=e45]:
      - link "Хранилища" [ref=e46] [cursor=pointer]:
        - /url: /
      - generic [ref=e47]: /
      - generic [ref=e48]: Test Vault 1792006442125
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
            - button "Создать папку" [active] [ref=e107] [cursor=pointer]
            - button "importNotes" [ref=e111] [cursor=pointer]
            - button "importNotes" [ref=e116]
          - generic [ref=e119]:
            - 'button "Раскрыть папку: target-folder-1792006443119" [ref=e120] [cursor=pointer]'
            - button "target-folder-1792006443119" [ref=e123] [cursor=pointer]:
              - generic [ref=e126]:
                - strong [ref=e127]: target-folder-1792006443119
                - generic [ref=e128]: Папка
            - generic [ref=e129]:
              - button "Создать файл в папке" [ref=e130] [cursor=pointer]
              - button "Создать подпапку" [ref=e135] [cursor=pointer]
              - 'button "Переместить: target-folder-1792006443119" [ref=e139] [cursor=pointer]'
              - 'button "Удалить папку: target-folder-1792006443119" [ref=e145] [cursor=pointer]'
        - region "Просмотр" [ref=e150]:
          - paragraph [ref=e151]: Выберите markdown-файл
```

# Test source

```ts
  1   | import { test, expect, Page, BrowserContext, Locator } from '@playwright/test';
  2   | 
  3   | export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:18081';
  4   | 
  5   | export function orText(page: Page, ...texts: string[]): Locator {
  6   |   let locator = page.getByText(texts[0], { exact: false });
  7   |   for (let i = 1; i < texts.length; i++) {
  8   |     locator = locator.or(page.getByText(texts[i], { exact: false }));
  9   |   }
  10  |   return locator.first();
  11  | }
  12  | 
  13  | export function orLocator(...locators: Locator[]): Locator {
  14  |   let result = locators[0];
  15  |   for (let i = 1; i < locators.length; i++) {
  16  |     result = result.or(locators[i]);
  17  |   }
  18  |   return result.first();
  19  | }
  20  | 
  21  | export function orRole(page: Page, role: string, ...names: string[]): Locator {
  22  |   let locator = page.getByRole(role as any, { name: names[0] });
  23  |   for (let i = 1; i < names.length; i++) {
  24  |     locator = locator.or(page.getByRole(role as any, { name: names[i] }));
  25  |   }
  26  |   return locator.first();
  27  | }
  28  | 
  29  | export async function login(page: Page, username = 'admin', password = 'test-password') {
  30  |   await page.goto(BASE_URL);
  31  |   await orRole(page, 'heading', 'mdock').waitFor({ state: 'visible', timeout: 10000 });
  32  |   await orLocator(
  33  |     page.locator('label:has-text("Логин") input'),
  34  |     page.locator('label:has-text("Login") input')
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
> 75  |   await createFileButton.click();
      |                          ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Создать файл' }) resolved to 2 elements:
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
```