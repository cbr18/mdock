# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings-admin.spec.ts >> Admin Users Page >> should show user list with admin
- Location: e2e/settings-admin.spec.ts:147:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=admin')
Expected: visible
Error: strict mode violation: locator('text=admin') resolved to 2 elements:
    1) <span>admin</span> aka locator('header').getByText('admin')
    2) <h3>admin</h3> aka getByLabel('Список хранилищ').getByText('admin')

Call log:
  - Expect "toBeVisible" locator('text=admin') with timeout 10000ms
  - waiting for locator('text=admin')

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
        - link "Пользователи" [active] [ref=e14] [cursor=pointer]:
          - /url: /?page=admin-users
        - link "Аккаунт" [ref=e15] [cursor=pointer]:
          - /url: /?page=account
      - generic [ref=e16]:
        - group [ref=e17]:
          - generic "Настройки темы" [ref=e18]
        - button "English" [ref=e25] [cursor=pointer]
        - generic [ref=e30]: admin
        - button "Выйти" [ref=e31] [cursor=pointer]
    - status [ref=e35]: Загрузка…
```

# Test source

```ts
  48  |     await page.reload();
  49  |     await expect(page.locator('text=Vaults')).toBeVisible({ timeout: 5000 });
  50  |   });
  51  | });
  52  | 
  53  | test.describe('Navigation and UI', () => {
  54  |   test.beforeEach(async ({ page }) => {
  55  |     await login(page);
  56  |   });
  57  | 
  58  |   test('should show topbar with user info', async ({ page }) => {
  59  |     await expect(page.locator('text=admin')).toBeVisible();
  60  |     await expect(page.locator('button:has-text("Выйти"), button:has-text("Logout")')).toBeVisible();
  61  |   });
  62  | 
  63  |   test('should navigate to account page', async ({ page }) => {
  64  |     await page.click('a:has-text("Аккаунт"), a:has-text("Account")');
  65  |     await expect(page.locator('text=Аккаунт, text=Account')).toBeVisible();
  66  |     await expect(page.locator('text=Сменить пароль, text=Change password')).toBeVisible();
  67  |   });
  68  | 
  69  |   test('should navigate to admin users page (if admin)', async ({ page }) => {
  70  |     await page.click('a:has-text("Пользователи"), a:has-text("Users")');
  71  |     await expect(page.locator('text=Пользователи, text=Users')).toBeVisible();
  72  |   });
  73  | 
  74  |   test('should reset scroll position on navigation', async ({ page }) => {
  75  |     const initialScroll = await page.evaluate(() => window.scrollY);
  76  |     await page.click('a:has-text("Аккаунт"), a:has-text("Account")');
  77  |     const afterScroll = await page.evaluate(() => window.scrollY);
  78  |     expect(afterScroll).toBe(0);
  79  |   });
  80  | });
  81  | 
  82  | test.describe('Account Page', () => {
  83  |   test.beforeEach(async ({ page }) => {
  84  |     await login(page);
  85  |     await page.click('a:has-text("Аккаунт"), a:has-text("Account")');
  86  |   });
  87  | 
  88  |   test('should show account page', async ({ page }) => {
  89  |     await expect(page.locator('text=Аккаунт, text=Account')).toBeVisible();
  90  |   });
  91  | 
  92  |   test('should show change password form', async ({ page }) => {
  93  |     await expect(page.locator('text=Сменить пароль, text=Change password')).toBeVisible();
  94  |     await expect(page.locator('input[name="current_password"], input[placeholder*="текущий" i]')).toBeVisible();
  95  |     await expect(page.locator('input[name="new_password"], input[placeholder*="новый" i]')).toBeVisible();
  96  |     await expect(page.locator('input[name="confirm_password"], input[placeholder*="подтверд" i]')).toBeVisible();
  97  |   });
  98  | 
  99  |   test('should change password', async ({ page }) => {
  100 |     await page.fill('input[name="current_password"], input[placeholder*="текущий" i]', 'test-password');
  101 |     await page.fill('input[name="new_password"], input[placeholder*="новый" i]', 'new-test-password');
  102 |     await page.fill('input[name="confirm_password"], input[placeholder*="подтверд" i]', 'new-test-password');
  103 |     await page.click('button:has-text("Сохранить"), button:has-text("Save")');
  104 |     await expect(page.locator('text=Пароль изменен, text=Password changed')).toBeVisible({ timeout: 5000 });
  105 | 
  106 |     // Login with new password
  107 |     await logout(page);
  108 |     await login(page, 'admin', 'new-test-password');
  109 |     await expect(page.locator('text=Хранилища, text=Vaults')).toBeVisible();
  110 | 
  111 |     // Change back
  112 |     await page.click('a:has-text("Аккаунт"), a:has-text("Account")');
  113 |     await page.fill('input[name="current_password"], input[placeholder*="текущий" i]', 'new-test-password');
  114 |     await page.fill('input[name="new_password"], input[placeholder*="новый" i]', 'test-password');
  115 |     await page.fill('input[name="confirm_password"], input[placeholder*="подтверд" i]', 'test-password');
  116 |     await page.click('button:has-text("Сохранить"), button:has-text("Save")');
  117 |     await expect(page.locator('text=Пароль изменен, text=Password changed')).toBeVisible({ timeout: 5000 });
  118 |   });
  119 | 
  120 |   test('should show error on wrong current password', async ({ page }) => {
  121 |     await page.fill('input[name="current_password"], input[placeholder*="текущий" i]', 'wrong');
  122 |     await page.fill('input[name="new_password"], input[placeholder*="новый" i]', 'new-pass');
  123 |     await page.fill('input[name="confirm_password"], input[placeholder*="подтверд" i]', 'new-pass');
  124 |     await page.click('button:has-text("Сохранить"), button:has-text("Save")');
  125 |     await expect(page.locator('text=Ошибка, text=Error, text=Неверный, text=Invalid')).toBeVisible({ timeout: 5000 });
  126 |   });
  127 | 
  128 |   test('should show error on password mismatch', async ({ page }) => {
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
> 148 |     await expect(page.locator('text=admin')).toBeVisible();
      |                                              ^ Error: expect(locator).toBeVisible() failed
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
  229 |     await page.click('button:has-text("Создать хранилище"), button:has-text("Create vault")');
  230 |     await page.fill('input[name="vault-name"], input[placeholder*="название" i]', vaultName);
  231 |     await page.click('button:has-text("Создать"), button:has-text("Create")');
  232 |     await page.click(`button:has-text("${vaultName}")`);
  233 |     await expect(page.locator('text=Файлов нет, text=No files, text=noFiles')).toBeVisible({ timeout: 10000 });
  234 |   });
  235 | });
```