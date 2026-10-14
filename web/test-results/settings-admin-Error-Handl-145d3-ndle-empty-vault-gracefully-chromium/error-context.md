# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings-admin.spec.ts >> Error Handling and Edge Cases >> should handle empty vault gracefully
- Location: e2e/settings-admin.spec.ts:226:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Создать хранилище"), button:has-text("Create vault")')

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
  129 |     await page.fill('input[name="current_password"], input[placeholder*="текущий" i]', 'test-password');
  130 |     await page.fill('input[name="new_password"], input[placeholder*="новый" i]', 'new-pass-1');
  131 |     await page.fill('input[name="confirm_password"], input[placeholder*="подтверд" i]', 'new-pass-2');
  132 |     await page.click('button:has-text("Сохранить"), button:has-text("Save")');
  133 |     await expect(page.locator('text=не совпадают, text=mismatch, text=Match')).toBeVisible({ timeout: 5000 });
  134 |   });
  135 | });
  136 | 
  137 | test.describe('Admin Users Page', () => {
  138 |   test.beforeEach(async ({ page }) => {
  139 |     await login(page);
  140 |     await page.click('a:has-text("Пользователи"), a:has-text("Users")');
  141 |   });
  142 | 
  143 |   test('should show admin users page', async ({ page }) => {
  144 |     await expect(page.locator('text=Пользователи, text=Users')).toBeVisible();
  145 |   });
  146 | 
  147 |   test('should show user list with admin', async ({ page }) => {
  148 |     await expect(page.locator('text=admin')).toBeVisible();
  149 |     await expect(page.locator('text=Администратор, text=Admin')).toBeVisible();
  150 |   });
  151 | 
  152 |   test('should create new user', async ({ page }) => {
  153 |     const userName = `testuser-${Date.now()}`;
  154 |     await page.click('button:has-text("Создать пользователя"), button:has-text("Create user")');
  155 |     await page.fill('input[name="username"], input[placeholder*="логин" i]', userName);
  156 |     await page.fill('input[name="password"], input[placeholder*="парол" i]', 'user-password');
  157 |     await page.click('button:has-text("Создать"), button:has-text("Create")');
  158 |     await expect(page.locator(`text=${userName}`)).toBeVisible({ timeout: 5000 });
  159 |   });
  160 | 
  161 |   test('should disable and enable user', async ({ page }) => {
  162 |     const userName = `testuser-${Date.now()}`;
  163 |     await page.click('button:has-text("Создать пользователя"), button:has-text("Create user")');
  164 |     await page.fill('input[name="username"], input[placeholder*="логин" i]', userName);
  165 |     await page.fill('input[name="password"], input[placeholder*="парол" i]', 'user-password');
  166 |     await page.click('button:has-text("Создать"), button:has-text("Create")');
  167 |     await expect(page.locator(`text=${userName}`)).toBeVisible({ timeout: 5000 });
  168 | 
  169 |     await page.click(`button[title*="отключить" i][title*="${userName}"], button[title*="disable" i][title*="${userName}"]`);
  170 |     await expect(page.locator(`text=${userName}`).locator('..').locator('text=Отключен, text=Disabled')).toBeVisible({ timeout: 5000 });
  171 | 
  172 |     await page.click(`button[title*="включить" i][title*="${userName}"], button[title*="enable" i][title*="${userName}"]`);
  173 |     await expect(page.locator(`text=${userName}`).locator('..').locator('text=Активен, text=Active')).toBeVisible({ timeout: 5000 });
  174 |   });
  175 | 
  176 |   test('should reset user password', async ({ page }) => {
  177 |     const userName = `testuser-${Date.now()}`;
  178 |     await page.click('button:has-text("Создать пользователя"), button:has-text("Create user")');
  179 |     await page.fill('input[name="username"], input[placeholder*="логин" i]', userName);
  180 |     await page.fill('input[name="password"], input[placeholder*="парол" i]', 'user-password');
  181 |     await page.click('button:has-text("Создать"), button:has-text("Create")');
  182 |     await expect(page.locator(`text=${userName}`)).toBeVisible({ timeout: 5000 });
  183 | 
  184 |     await page.click(`button[title*="парол" i][title*="${userName}"], button[title*="password" i][title*="${userName}"]`);
  185 |     await page.fill('input[name="password"], input[placeholder*="парол" i]', 'new-user-password');
  186 |     await page.click('button:has-text("Сохранить"), button:has-text("Save")');
  187 |     await expect(page.locator('text=Пароль изменен, text=Password changed')).toBeVisible({ timeout: 5000 });
  188 |   });
  189 | 
  190 |   test('should revoke user sessions', async ({ page }) => {
  191 |     const userName = `testuser-${Date.now()}`;
  192 |     await page.click('button:has-text("Создать пользователя"), button:has-text("Create user")');
  193 |     await page.fill('input[name="username"], input[placeholder*="логин" i]', userName);
  194 |     await page.fill('input[name="password"], input[placeholder*="парол" i]', 'user-password');
  195 |     await page.click('button:has-text("Создать"), button:has-text("Create")');
  196 |     await expect(page.locator(`text=${userName}`)).toBeVisible({ timeout: 5000 });
  197 | 
  198 |     await page.click(`button[title*="сесси" i][title*="${userName}"], button[title*="session" i][title*="${userName}"]`);
  199 |     await expect(page.locator('text=Сессии отозваны, text=Sessions revoked')).toBeVisible({ timeout: 5000 });
  200 |   });
  201 | 
  202 |   test('should not allow admin to disable themselves', async ({ page }) => {
  203 |     await page.click(`button[title*="отключить" i][title*="admin"], button[title*="disable" i][title*="admin"]`);
  204 |     await expect(page.locator('text=Ошибка, text=Error, text=Нельзя, text=Cannot')).toBeVisible({ timeout: 5000 });
  205 |   });
  206 | });
  207 | 
  208 | test.describe('Error Handling and Edge Cases', () => {
  209 |   test('should handle 404 pages gracefully', async ({ page }) => {
  210 |     await page.goto(`${BASE_URL}/?page=nonexistent`);
  211 |     await expect(page.locator('text=mdock')).toBeVisible({ timeout: 5000 });
  212 |   });
  213 | 
  214 |   test('should handle network errors', async ({ page }) => {
  215 |     await login(page);
  216 |     await page.route('**/api/**', route => route.abort());
  217 |     await page.reload();
  218 |     await expect(page.locator('text=Ошибка, text=Error, text=Сеть, text=Network')).toBeVisible({ timeout: 10000 });
  219 |   });
  220 | 
  221 |   test('should show loading states', async ({ page }) => {
  222 |     await page.goto(BASE_URL);
  223 |     await expect(page.locator('[aria-busy="true"], text=Загрузка, text=Loading')).toBeVisible({ timeout: 5000 });
  224 |   });
  225 | 
  226 |   test('should handle empty vault gracefully', async ({ page }) => {
  227 |     await login(page);
  228 |     const vaultName = `Empty Vault ${Date.now()}`;
> 229 |     await page.click('button:has-text("Создать хранилище"), button:has-text("Create vault")');
      |                ^ Error: page.click: Test timeout of 60000ms exceeded.
  230 |     await page.fill('input[name="vault-name"], input[placeholder*="название" i]', vaultName);
  231 |     await page.click('button:has-text("Создать"), button:has-text("Create")');
  232 |     await page.click(`button:has-text("${vaultName}")`);
  233 |     await expect(page.locator('text=Файлов нет, text=No files, text=noFiles')).toBeVisible({ timeout: 10000 });
  234 |   });
  235 | });
```