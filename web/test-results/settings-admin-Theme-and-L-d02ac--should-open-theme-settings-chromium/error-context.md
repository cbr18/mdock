# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings-admin.spec.ts >> Theme and Language Settings >> should open theme settings
- Location: e2e/settings-admin.spec.ts:9:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('button[aria-label*="тема" i], button[title*="тема" i], button:has-text("Настройки темы")')

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
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { login, logout, BASE_URL, setTheme, setAccent, setLanguage } from './helpers';
  3   | 
  4   | test.describe('Theme and Language Settings', () => {
  5   |   test.beforeEach(async ({ page }) => {
  6   |     await login(page);
  7   |   });
  8   | 
  9   |   test('should open theme settings', async ({ page }) => {
> 10  |     await page.click('button[aria-label*="тема" i], button[title*="тема" i], button:has-text("Настройки темы")');
      |                ^ Error: page.click: Test timeout of 60000ms exceeded.
  11  |     await expect(page.locator('text=Тема, text=Theme')).toBeVisible();
  12  |   });
  13  | 
  14  |   test('should change theme', async ({ page }) => {
  15  |     await setTheme(page, 'light');
  16  |     await expect(page.locator('[data-theme="light"], .theme-light')).toBeVisible();
  17  |     await setTheme(page, 'dark');
  18  |     await expect(page.locator('[data-theme="dark"], .theme-dark')).toBeVisible();
  19  |   });
  20  | 
  21  |   test('should change accent color', async ({ page }) => {
  22  |     await setAccent(page, 'blue');
  23  |     await expect(page.locator('[data-accent="blue"], .accent-blue')).toBeVisible();
  24  |     await setAccent(page, 'violet');
  25  |     await expect(page.locator('[data-accent="violet"], .accent-violet')).toBeVisible();
  26  |   });
  27  | 
  28  |   test('should persist theme in localStorage', async ({ page }) => {
  29  |     await setTheme(page, 'light');
  30  |     await setAccent(page, 'green');
  31  |     await page.reload();
  32  |     await expect(page.locator('[data-theme="light"], .theme-light')).toBeVisible();
  33  |     await expect(page.locator('[data-accent="green"], .accent-green')).toBeVisible();
  34  |   });
  35  | 
  36  |   test('should change language to English', async ({ page }) => {
  37  |     await setLanguage(page, 'en');
  38  |     await expect(page.locator('text=Vaults, text=Settings, text=Login')).toBeVisible({ timeout: 5000 });
  39  |   });
  40  | 
  41  |   test('should change language to Russian', async ({ page }) => {
  42  |     await setLanguage(page, 'ru');
  43  |     await expect(page.locator('text=Хранилища, text=Настройки, text=Войти')).toBeVisible({ timeout: 5000 });
  44  |   });
  45  | 
  46  |   test('should persist language in localStorage', async ({ page }) => {
  47  |     await setLanguage(page, 'en');
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
```